# Jurnal Magang

Sistem Informasi Jurnal Magang berbasis web menggunakan arsitektur Monorepo:
- **Frontend**: Next.js (TypeScript) + Tailwind CSS v4
- **Backend**: Express.js (TypeScript) + Prisma ORM + SQLite

## Struktur Proyek

```
jurnal-magang/
├── backend/      # Express.js REST API
└── frontend/     # Next.js App Client
```

## Memulai Pengembangan

### 1. Jalankan Backend
1. Masuk ke direktori `backend/`
2. Pasang dependencies: `npm install`
3. Buat file `.env` (berdasarkan `.env` yang terkonfigurasi)
4. Jalankan migrasi database: `npm run db:migrate`
5. Jalankan server: `npm run dev` (berjalan di http://localhost:5005)

### 2. Jalankan Frontend
1. Masuk ke direktori `frontend/`
2. Pasang dependencies: `npm install`
3. Jalankan client: `npm run dev` (berjalan di http://localhost:3000)
