# Talenta App — Panduan Setup

Project ini sudah lengkap: database, pipeline pengambil CV dari Gmail,
dan halaman web pencarian kandidat pakai bahasa natural.

## Struktur
```
app/
  page.tsx              -> Halaman utama (search box + hasil)
  layout.tsx            -> Layout dasar
  globals.css           -> Styling
  api/search/route.ts   -> API pencarian (Claude + Supabase)
lib/
  supabase.ts           -> Koneksi ke database
scripts/
  gmail-cv-pipeline.js  -> Ambil & parsing CV dari Gmail
schema.sql               -> Struktur database
```

## Langkah setup (ikuti berurutan)

### 1. Install dependency
```bash
npm install
```

### 2. Setup Supabase
1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka SQL Editor, jalankan seluruh isi `schema.sql`
3. Insert 1 baris ke tabel `organizations`, catat `id`-nya
4. Di Settings > API, catat `Project URL` dan `service_role key`

### 3. Setup Gmail (untuk pipeline pengambil CV)
1. Buat project di [Google Cloud Console](https://console.cloud.google.com), aktifkan Gmail API
2. Buat OAuth 2.0 credentials, jalankan consent flow sekali untuk dapat refresh token
   (scope: `https://www.googleapis.com/auth/gmail.readonly`)
3. Buat label `Lamaran` di Gmail Anda, arahkan email lamaran ke situ

### 4. Setup Claude API
Ambil API key dari [console.anthropic.com](https://console.anthropic.com)

### 5. Isi environment variables
```bash
cp .env.local.example .env.local
```
Isi semua value di `.env.local` (Supabase, Anthropic, Organization ID).

Untuk pipeline Gmail, buat juga file `.env` terpisah di root (dipakai oleh
`scripts/gmail-cv-pipeline.js`) dengan tambahan:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GMAIL_LABEL=Lamaran
```

### 6. Isi database dengan data kandidat
```bash
npm install googleapis pdf-parse mammoth dotenv
node scripts/gmail-cv-pipeline.js
```
Ini akan mengambil email di label `Lamaran`, ekstrak CV, dan simpan ke Supabase.

### 7. Jalankan aplikasi web
```bash
npm run dev
```
Buka `http://localhost:3000`, coba ketik pencarian di search box.

### 8. Deploy (opsional)
1. Push project ke GitHub
2. Hubungkan repo ke [vercel.com](https://vercel.com)
3. Di pengaturan project Vercel, masukkan environment variables yang sama
   seperti di `.env.local`
4. Deploy — aplikasi jadi bisa diakses lewat URL publik

## Troubleshooting umum
- **Hasil pencarian selalu kosong** → cek apakah `ORGANIZATION_ID` di `.env.local`
  sama persis dengan `id` organisasi di tabel `organizations`
- **Pipeline Gmail error 403** → refresh token kadaluarsa atau scope salah,
  ulangi consent flow
- **API pencarian error 500** → cek log terminal, biasanya `ANTHROPIC_API_KEY`
  belum terisi atau salah
