<div align="center">

<img src="https://c.termai.cc/i191/f9nlM5.jpg" alt="KawaiiYumee API Banner" width="100%" style="border-radius: 10px;" />

# KawaiiYumee API
**Simple, Fast, and Dynamic REST API Base built with Express & TypeScript.**

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white" alt="PM2" />
  <img src="https://img.shields.io/badge/VPS_Ready-107C10?style=for-the-badge&logo=windows-terminal&logoColor=white" alt="VPS" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

[Demo Website](https://your-demo-link.com) • [Rest Api](https://your-api-link.com) • [Bug Report](https://github.com/DanzzAraAra/KawaiiYumee-base-api/issues)

</div>

---

## 📖 Introduction

**KawaiiYumee API** adalah template dasar (boilerplate) untuk membuat REST API yang modern, rapi, dan mudah dikembangkan.

Project ini dirancang untuk mengatasi kerumitan setup awal dengan menyediakan fitur **Auto-Load Router** berbasis konfigurasi JSON, penghitung pengunjung (visitor counter), dan antarmuka dokumentasi (Docs UI) yang estetik secara otomatis.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
| :--- | :--- |
| 🚀 **TypeScript** | Coding lebih aman, rapi, dan minim bug dengan static typing. |
| ⚙️ **Dynamic Routing** | Tambah endpoint via `src/config.json` tanpa perlu mengubah `index.ts`. |
| 📖 **Auto Docs** | Halaman `/docs` otomatis tergenerate berdasarkan config yang dibuat. |
| 🎨 **Modern UI** | Tampilan Landing page & Docs yang bersih, modern, dan responsif. |
| 📊 **Visitor Counter** | Database JSON sederhana untuk melacak traffic API. |
| 📂 **Modular Structure** | Susunan folder dikelompokkan rapi berdasarkan kategori. |
| 🔧 **Build System** | Script otomatis untuk kompilasi TypeScript ke JavaScript (Production Ready). |

---

## 📂 Project Structure

Struktur folder disusun agar mudah dipahami dan dimodifikasi:

```txt
.
├── index.ts                   # Entry point utama server
├── dist/                      # Compiled JavaScript files (Production)
│   ├── index.js               # Compiled main server file
│   ├── src/                   # Compiled source files & configs
│   └── router/                # Compiled route handlers
├── public/                    # Frontend files
│   ├── 404.html
│   ├── docs.html              # Halaman docs API
│   ├── landing.html           # Halaman utama
│   └── ...
├── router/                    # Folder Endpoint (Kategori - TypeScript)
│   ├── ai/
│   ├── download/
│   ├── maker/
│   ├── random/
│   ├── search/
│   └── tools/
├── src/                       # Source files & Logic
│   ├── autoload.ts            # Logic auto load router
│   ├── config.json            # Configuration router
│   ├── logger.ts
│   └── ...
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
└── vercel.json                # Vercel deployment config
```

📦 Build System & Folder dist/
Apa itu Folder dist/?
dist/ (singkatan dari distribution) adalah folder yang berisi hasil kompilasi kode dari TypeScript menjadi JavaScript. Folder ini penting karena:
 * Runtime: Node.js hanya bisa menjalankan JavaScript, bukan TypeScript secara langsung.
 * Performance: Kode yang dikompilasi lebih optimal untuk production.
 * Deploy: Folder ini yang akan dijalankan di server.
Perbandingan Mode
| Mode | Command | Folder | Keterangan |
|---|---|---|---|
| Development | npm run dev | Memory | Langsung jalankan TS dengan ts-node (Hot Reload). |
| Production | npm run build + npm start | dist/ | Kompilasi TS ke JS dulu, lalu jalankan file JS. |
🛠️ Installation & Running
Pastikan kamu sudah menginstall Node.js (versi 18 atau lebih baru).
1. Clone & Install
```bash
git clone [https://github.com/DanzzAraAra/KawaiiYumee-base-api.git](https://github.com/DanzzAraAra/KawaiiYumee-base-api.git)
cd KawaiiYumee-base-api
npm install
```

3. Mode Development
Gunakan ini saat sedang mengedit kode. Server akan restart otomatis jika ada perubahan file.
```bash
npm run dev
```

> Server berjalan di: http://localhost:3000
> 
3. Build untuk Production
Gunakan ini sebelum upload ke server hosting/VPS.
```bash
npm run build
```

Script ini akan membersihkan folder dist/, mengkompilasi TS ke JS, dan menyalin file asset (html, json, gambar).
4. Jalankan Production
```bash
npm start
```

📝 Scripts Reference
Berikut adalah penjelasan script yang ada di package.json:
```json
{
  "scripts": {
    "clean": "rm -rf dist",                // Hapus folder build lama
    "build": "tsc && npm run copy-assets", // Compile TS & copy file pendukung
    "copy-assets": "...",                  // Copy .json, .jpg, dan public folder ke dist
    "start": "node dist/index.js",         // Jalankan mode Production (JS)
    "dev": "ts-node index.ts",             // Jalankan mode Development (TS)
    "pm2": "pm2 start index.ts ...",       // Jalankan di background (Support TypeScript langsung)
  }
}
```

⚡ Adding a New Endpoint
Kamu tidak perlu mengedit index.ts! Cukup ikuti 3 langkah ini:
Step 1: Daftarkan di src/config.json
Buka file src/config.json dan tambahkan metadata endpoint kamu di dalam object "tags".
```json
{
  "tags": {
    "games": [
      {
        "name": "Tebak Gambar",          // Judul di Docs
        "endpoint": "/api/games/tebak",  // URL Path
        "filename": "tebak",             // Nama file logic (tanpa .ts)
        "method": "GET",                 // Method HTTP
        "params": [                      // Parameter (muncul di Docs)
          {
            "name": "level",
            "required": true,
            "description": "1-100"
          }
        ]
      }
    ]
  }
}
```

Step 2: Buat Logic File
Buat file TypeScript sesuai struktur folder kategori di router/.
 * Kategori: games
 * Filename: tebak.ts
 * Path: router/games/tebak.ts
<!-- end list -->
```typescript
import { Request, Response } from 'express';

export default async function (req: Request, res: Response) {
    // 1. Ambil parameter
    const { level } = req.query;

    // 2. Validasi
    if (!level) return res.json({ status: false, message: "Level required!" });

    // 3. Logic & Response
    res.json({
        status: true,
        result: {
            message: `Kamu memilih level ${level}`,
            image: "[https://example.com/img.jpg](https://example.com/img.jpg)"
        }
    });
};
```

Step 3: Test
Jika mode dev, cukup refresh browser. Jika mode prod, lakukan npm run build lagi. 
Endpoint baru akan otomatis muncul di halaman /docs.
Deployment
Option A: Vercel (Recommended)

 * Push kode ke GitHub.
 * Import repository ke Vercel.
 * Vercel akan otomatis mendeteksi vercel.json dan melakukan build.

Option B: VPS / Panel

 * Build project di komputer lokal atau di server:
```bash
   npm run build
```

 * Pastikan folder dist/ sudah terbentuk.
 * Jalankan command start:
   npm start

Option C: PM2 (Process Manager)
Agar server tetap berjalan di background (VPS) walaupun terminal ditutup.
Cara Cepat (via Script):

# Jalankan PM2
```bash
npm run pm2
```

Cara Manual:
```bash
npm install -g pm2
pm2 start dist/index.js --name "KawaiiYumee-api"
pm2 save
pm2 startup
```

🖼️ Dokumentasi UI
Project ini dilengkapi GUI bawaan:
 * / : Landing Page
 * /docs : Swagger-like documentation (Auto generated)
 * /config : Cek konfigurasi JSON
 * /donasi : Support creator page

🐛 Troubleshooting Common Issues

<details>
<summary><b>Error: "Cannot find module './src/qris'"</b></summary>

 * Penyebab: Kamu mencoba menjalankan file JS tapi belum melakukan build, atau file asset tidak tersalin.
 * Solusi: Jalankan npm run build terlebih dahulu. Cek apakah file dist/src/qris.js sudah terbentuk.

</details>
<details>
<summary><b>Error TypeScript Compilation</b></summary>

 * Solusi: Cek error log. Jika terlalu ketat, kamu bisa mematikan strict mode di tsconfig.json dengan mengubah "strict": true menjadi false.

</details>
<details>
<summary><b>QRIS Image tidak muncul</b></summary>
  
 * Solusi: Buka src/qris.ts dan pastikan variabel STATIC_QRIS sudah diisi dengan string URL/Base64 QRIS yang valid.

</details>

<div align="center">
Created with ❤️ by Danzz
</div>
