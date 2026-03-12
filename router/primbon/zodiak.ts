import { Request, Response } from 'express'

const data_zodiak = [
  {
    nama: 'Capricorn', simbol: '♑', tanggal: '22 Desember – 19 Januari',
    deskripsi: 'Jiwa yang ambisius dan penuh disiplin. Capricorn melangkah dengan tekad baja menuju puncak, memanggul kesabaran sebagai mahkotanya.',
    sifat: ['Ambisius', 'Disiplin', 'Bertanggung Jawab', 'Sabar', 'Pragmatis'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/JAMES%20R%20EADS%20(2).jpeg'
  },
  {
    nama: 'Aquarius', simbol: '♒', tanggal: '20 Januari – 18 Februari',
    deskripsi: 'Pemikir bebas yang melampaui zamannya. Aquarius hadir membawa angin perubahan, dengan mimpi-mimpi yang terlalu besar untuk dikekang.',
    sifat: ['Inovatif', 'Independen', 'Humanis', 'Idealis', 'Unik'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/63e03476-621c-499e-a869-631320586d52.jpeg'
  },
  {
    nama: 'Pisces', simbol: '♓', tanggal: '19 Februari – 20 Maret',
    deskripsi: 'Jiwa yang menyelami lautan perasaan terdalam. Pisces hidup di antara dunia nyata dan angan, dengan empati yang tak bertepi.',
    sifat: ['Empatik', 'Kreatif', 'Intuitif', 'Lembut', 'Imajinatif'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/0439e722-0c93-4e8e-9d08-623016f379f9.jpeg'
  },
  {
    nama: 'Aries', simbol: '♈', tanggal: '21 Maret – 19 April',
    deskripsi: 'Api yang menyala tanpa permisi. Aries adalah pelopor sejati — berani, bergerak cepat, dan tak mengenal kata mundur.',
    sifat: ['Berani', 'Energik', 'Pemimpin', 'Spontan', 'Percaya Diri'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/2ec7389b-fd9f-4f4d-8c12-ba818b25c15d.jpeg'
  },
  {
    nama: 'Taurus', simbol: '♉', tanggal: '20 April – 20 Mei',
    deskripsi: 'Kokoh seperti bumi tempat ia berpijak. Taurus menghargai keindahan, kenyamanan, dan kesetiaan di atas segalanya.',
    sifat: ['Setia', 'Tekun', 'Penuh Selera', 'Stabil', 'Terpercaya'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/d0ad4c7c-eee1-4cc6-af10-01202900724f.jpeg'
  },
  {
    nama: 'Gemini', simbol: '♊', tanggal: '21 Mei – 20 Juni',
    deskripsi: 'Dua jiwa dalam satu raga. Gemini memikat dunia dengan kecerdasan, kelincahan kata, dan rasa ingin tahu yang tak pernah padam.',
    sifat: ['Cerdas', 'Komunikatif', 'Fleksibel', 'Penasaran', 'Witty'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/JAMES%20R%20EADS%20(1).jpeg'
  },
  {
    nama: 'Cancer', simbol: '♋', tanggal: '21 Juni – 22 Juli',
    deskripsi: 'Penjaga hati yang tak tertandingi. Cancer mencintai dengan sepenuh jiwa, membawa kehangatan rumah ke mana pun ia melangkah.',
    sifat: ['Peka', 'Protektif', 'Penuh Kasih', 'Intuitif', 'Setia'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/8b22906e-a119-478d-bcfd-b64d7d2b3dc5.jpeg'
  },
  {
    nama: 'Leo', simbol: '♌', tanggal: '23 Juli – 22 Agustus',
    deskripsi: 'Sang raja yang lahir untuk bersinar. Leo membawa karisma tak tertahankan, menerangi setiap ruangan yang ia masuki.',
    sifat: ['Karismatik', 'Murah Hati', 'Percaya Diri', 'Dramatik', 'Loyal'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/f568827a-b061-4a97-9c71-30996e1ed816.jpeg'
  },
  {
    nama: 'Virgo', simbol: '♍', tanggal: '23 Agustus – 22 September',
    deskripsi: 'Mata yang melihat apa yang luput dari yang lain. Virgo adalah penyempurna — analitis, cermat, dan selalu memberikan yang terbaik.',
    sifat: ['Analitis', 'Perfeksionis', 'Cerdas', 'Rendah Hati', 'Pekerja Keras'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/JAMES%20R%20EADS.jpeg'
  },
  {
    nama: 'Libra', simbol: '♎', tanggal: '23 September – 22 Oktober',
    deskripsi: 'Penjaga keseimbangan semesta. Libra menari di antara keindahan dan keadilan, menjadi jembatan damai di tengah keributan dunia.',
    sifat: ['Diplomatis', 'Adil', 'Estetis', 'Sosial', 'Elegan'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/96491bdf-2e43-46ea-add1-c714423e0f51.jpeg'
  },
  {
    nama: 'Scorpio', simbol: '♏', tanggal: '23 Oktober – 21 November',
    deskripsi: 'Misteri berjalan di antara bayangan. Scorpio menyimpan kedalaman yang tak terduga, dengan intensitas yang mampu mengubah segalanya.',
    sifat: ['Intens', 'Misterius', 'Setia', 'Berpendirian', 'Transformatif'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/a197c096-83a3-4b72-ba25-8746589d00c6.jpeg'
  },
  {
    nama: 'Sagitarius', simbol: '♐', tanggal: '22 November – 21 Desember',
    deskripsi: 'Pemanah bebas yang tak mengenal batas. Sagitarius adalah petualang jiwa raga, selalu mengincar cakrawala yang lebih jauh.',
    sifat: ['Optimis', 'Petualang', 'Jujur', 'Filosofis', 'Bebas'],
    gambar: 'https://raw.githubusercontent.com/Smp-negeri-3-cicurug/Image/main/zodiak/04f94a00-4f88-48f9-bd68-6db5f05e894b.jpeg'
  }
]

function cek_zodiak(tanggal: number, bulan: number) {
  if ((bulan === 12 && tanggal >= 22) || (bulan === 1 && tanggal <= 19)) return data_zodiak[0]
  if ((bulan === 1 && tanggal >= 20) || (bulan === 2 && tanggal <= 18)) return data_zodiak[1]
  if ((bulan === 2 && tanggal >= 19) || (bulan === 3 && tanggal <= 20)) return data_zodiak[2]
  if ((bulan === 3 && tanggal >= 21) || (bulan === 4 && tanggal <= 19)) return data_zodiak[3]
  if ((bulan === 4 && tanggal >= 20) || (bulan === 5 && tanggal <= 20)) return data_zodiak[4]
  if ((bulan === 5 && tanggal >= 21) || (bulan === 6 && tanggal <= 20)) return data_zodiak[5]
  if ((bulan === 6 && tanggal >= 21) || (bulan === 7 && tanggal <= 22)) return data_zodiak[6]
  if ((bulan === 7 && tanggal >= 23) || (bulan === 8 && tanggal <= 22)) return data_zodiak[7]
  if ((bulan === 8 && tanggal >= 23) || (bulan === 9 && tanggal <= 22)) return data_zodiak[8]
  if ((bulan === 9 && tanggal >= 23) || (bulan === 10 && tanggal <= 22)) return data_zodiak[9]
  if ((bulan === 10 && tanggal >= 23) || (bulan === 11 && tanggal <= 21)) return data_zodiak[10]
  if ((bulan === 11 && tanggal >= 22) || (bulan === 12 && tanggal <= 21)) return data_zodiak[11]
  return null
}

export default async function zodiakHandler(req: Request, res: Response) {
  const tanggal = parseInt(req.query.tanggal as string)
  const bulan = parseInt(req.query.bulan as string)

  if (!tanggal || !bulan) {
    return res.status(400).json({
      status: false,
      message: 'kasih tanggal dan bulan lahir kamu bestie 😭'
    })
  }

  if (tanggal < 1 || tanggal > 31 || bulan < 1 || bulan > 12) {
    return res.status(400).json({
      status: false,
      message: 'tanggal atau bulan ga valid bestie 💀'
    })
  }

  const hasil = cek_zodiak(tanggal, bulan)

  if (!hasil) {
    return res.status(404).json({
      status: false,
      message: 'zodiak ga ketemu, cek lagi tanggal & bulannya'
    })
  }

  return res.json({ status: true, result: hasil })
  }
