import { Request, Response } from 'express'
import axios from 'axios'
import FormData from 'form-data'
import * as tar from 'tar'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import archiver from 'archiver'

async function ambil_info_package(nama_package: string) {
  const { data: info } = await axios.get(
    `https://registry.npmjs.org/${encodeURIComponent(nama_package)}`,
    {
      headers: {
        'Accept': 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
        'User-Agent': 'npm/10.2.4 node/v20.11.0 linux x64',
      }
    }
  )

  const versi_terbaru = info['dist-tags']?.latest
  const detail_versi = info.versions?.[versi_terbaru]
  if (!detail_versi) throw new Error('package ga ketemu')

  const semua_versi = Object.keys(info.versions || {}).reverse()
  const nama_file = nama_package.includes('/') ? nama_package.split('/')[1] : nama_package

  return {
    nama: info.name,
    deskripsi: info.description || '-',
    versi_terbaru,
    total_versi: semua_versi.length,
    semua_versi,
    pembuat: info.author?.name || detail_versi.author?.name || '-',
    lisensi: detail_versi.license || '-',
    website: detail_versi.homepage || null,
    repo: detail_versi.repository?.url?.replace('git+', '').replace('.git', '') || null,
    kata_kunci: info.keywords || [],
    tanggal_rilis: info.time?.created || null,
    terakhir_update: info.time?.modified || null,
    nama_file,
    url_tgz: `https://registry.npmjs.org/${nama_package}/-/${nama_file}-${versi_terbaru}.tgz`,
    link: `https://www.npmjs.com/package/${nama_package}`
  }
}

async function tgz_ke_zip(url_tgz: string, nama_file: string, versi: string): Promise<Buffer> {
  // bikin folder temp
  const folder_temp = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-'))
  const path_tgz = path.join(folder_temp, `${nama_file}.tgz`)
  const folder_extract = path.join(folder_temp, 'extracted')
  const path_zip = path.join(folder_temp, `${nama_file}-${versi}.zip`)

  fs.mkdirSync(folder_extract)

  try {
    // download tgz
    const { data: buffer_tgz } = await axios.get(url_tgz, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'npm/10.2.4 node/v20.11.0 linux x64' }
    })
    fs.writeFileSync(path_tgz, Buffer.from(buffer_tgz))

    // extract tgz
    await tar.extract({ file: path_tgz, cwd: folder_extract })

    // zip hasil extract
    const buffer_zip = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      const zipper = archiver('zip', { zlib: { level: 9 } })

      zipper.on('data', chunk => chunks.push(chunk))
      zipper.on('end', () => resolve(Buffer.concat(chunks)))
      zipper.on('error', reject)

      zipper.directory(folder_extract, false)
      zipper.finalize()
    })

    return buffer_zip

  } finally {
    // bersihkan temp
    fs.rmSync(folder_temp, { recursive: true, force: true })
  }
}

async function upload_ke_cdn(buffer_zip: Buffer, nama_file: string, versi: string): Promise<string> {
  const form = new FormData()
  form.append('file', buffer_zip, {
    filename: `${nama_file}-${versi}.zip`,
    contentType: 'application/zip'
  })

  const { data: hasil_upload } = await axios.post(
    'https://api.kawaiiyumee.web.id/api/tools/tourl',
    form,
    { headers: { ...form.getHeaders() } }
  )

  if (!hasil_upload?.result?.url) throw new Error('upload gagal')
  return hasil_upload.result.url
}

export default async function npmHandler(req: Request, res: Response) {
  const nama_package = req.query.q as string || req.query.package as string

  if (!nama_package) {
    return res.status(400).json({
      status: false,
      message: 'kasih nama package nya bestie 😭'
    })
  }

  try {
    const info = await ambil_info_package(nama_package)
    const buffer_zip = await tgz_ke_zip(info.url_tgz, info.nama_file, info.versi_terbaru)
    const link_download = await upload_ke_cdn(buffer_zip, info.nama_file, info.versi_terbaru)

    return res.json({
      status: true,
      result: {
        nama: info.nama,
        deskripsi: info.deskripsi,
        versi_terbaru: info.versi_terbaru,
        total_versi: info.total_versi,
        semua_versi: info.semua_versi,
        pembuat: info.pembuat,
        lisensi: info.lisensi,
        website: info.website,
        repo: info.repo,
        kata_kunci: info.kata_kunci,
        tanggal_rilis: info.tanggal_rilis,
        terakhir_update: info.terakhir_update,
        link_download,
        link_npm: info.link
      }
    })

  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
                }
        
