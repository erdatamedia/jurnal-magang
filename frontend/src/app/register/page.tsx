'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nim, setNim] = useState('');
  const [department, setDepartment] = useState('');
  const [classVal, setClassVal] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        role: 'student',
        details: {
          nim,
          department,
          class: classVal,
          phone,
        },
      };

      const data = await api.post('/auth/register', payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Pendaftaran gagal. Silakan periksa kembali data Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden text-slate-100 font-sans py-12">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg p-6 mx-4">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Daftar Akun Siswa
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Daftarkan diri Anda untuk mulai mengisi absen dan jurnal magang
          </p>
        </div>

        {/* Glassmorphic card */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-400 border-b border-white/5 pb-2">
              Informasi Akun
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@example.com"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-sm"
              />
            </div>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-400 border-b border-white/5 pb-2 pt-2">
              Detail Siswa & Akademik
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  NIM / NISN
                </label>
                <input
                  type="text"
                  required
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="12345678"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  No. Telepon (WA)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxx"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Jurusan
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Teknik Informatika"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Kelas
                </label>
                <input
                  type="text"
                  required
                  value={classVal}
                  onChange={(e) => setClassVal(e.target.value)}
                  placeholder="TI-4A"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-sm"
                />
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-xs text-slate-400 space-y-1">
              <span className="text-violet-400 font-semibold block mb-1">💡 Catatan Penempatan:</span>
              Setelah mendaftar, akun Anda akan otomatis terhubung dengan pembimbing dan instansi industri demo (PT Inovasi Teknologi) agar Anda bisa langsung mencoba simulasi absensi dan pengisian jurnal.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all duration-300 disabled:opacity-50 disabled:scale-100 cursor-pointer"
            >
              {loading ? 'Mendaftarkan Akun...' : 'Daftar Sebagai Siswa'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Sudah memiliki akun?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition">
            Login di Sini
          </Link>
        </p>
      </div>
    </div>
  );
}
