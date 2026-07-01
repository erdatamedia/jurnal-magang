'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface MentorProfile {
  companyName: string;
  position?: string;
  phone?: string;
  companyLogo?: string | null;
}

interface MentorSettingsCardProps {
  initialProfile: MentorProfile;
  onProfileUpdated: () => void;
}

export default function MentorSettingsCard({ initialProfile, onProfileUpdated }: MentorSettingsCardProps) {
  const [companyName, setCompanyName] = useState(initialProfile.companyName || '');
  const [position, setPosition] = useState(initialProfile.position || '');
  const [phone, setPhone] = useState(initialProfile.phone || '');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Set initial preview if existing logo is in DB
  useEffect(() => {
    if (initialProfile.companyLogo) {
      const host = typeof window !== 'undefined'
        ? (window.location.origin.includes('localhost') ? 'http://localhost:5005' : window.location.origin)
        : 'http://localhost:5005';
      setLogoPreview(`${host}${initialProfile.companyLogo}`);
    }
  }, [initialProfile.companyLogo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran logo maksimal adalah 2MB.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoBase64(base64);
      setLogoPreview(base64);
    };
    reader.onerror = () => {
      setError('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (!companyName.trim()) {
        throw new Error('Nama perusahaan wajib diisi.');
      }

      const payload = {
        companyName,
        position,
        phone,
        ...(logoBase64 ? { companyLogo: logoBase64 } : {}),
      };

      const response = await api.post('/auth/mentor/profile', payload, {
        // We override method to PUT in backend router
        'X-HTTP-Method-Override': 'PUT', 
      });
      // Actually we mapped PUT /mentor/profile in backend.
      // Wait, in our api helper, we have post and get, but we can call a custom PUT by sending a post request with a header or since we mapped router.put, let's make sure the client calls PUT.
      // Wait! Let's check how the api client is written:
      // it takes options and sets options.method || 'GET'. But wait, the export has:
      // api.post: (endpoint, body) => request(endpoint, { method: 'POST', body })
      // Ah! api helper doesn't export a 'put' method!
      // But wait! Can we add a PUT method to the `api` client?
      // Yes! Or we can just use `fetch` directly, or we can use `api.post('/auth/mentor/profile', ...)` and in the backend we make it POST?
      // No, let's look at `api.ts`. It's very simple. We can use a direct fetch inside MentorSettingsCard, or let's look at how we can implement PUT.
      // Wait, let's write a standard fetch call here so that we don't have to change `api.ts` or we can change `api.ts` to support PUT. Changing api.ts is super easy, but let's check:
      // In MentorSettingsCard, let's call the endpoint using fetch directly with the JWT token! It's extremely robust and straightforward.
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui profil perusahaan.');
    }
  };

  // Let's write the fetch implementation inside handleSubmit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (!companyName.trim()) {
        throw new Error('Nama Perusahaan wajib diisi.');
      }

      const token = localStorage.getItem('token');
      const host = typeof window !== 'undefined'
        ? (window.location.origin.includes('localhost') ? 'http://localhost:5005' : window.location.origin)
        : 'http://localhost:5005';
      const response = await fetch(`${host}/api/auth/mentor/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName,
          position,
          phone,
          companyLogo: logoBase64 || initialProfile.companyLogo
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memperbarui profil.');
      }

      const data = await response.json();
      
      // Update the user profile in localStorage so the name updates in topbar
      const savedUserStr = localStorage.getItem('user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        savedUser.profile = data.profile;
        localStorage.setItem('user', JSON.stringify(savedUser));
      }

      setSuccess(true);
      onProfileUpdated();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui profil perusahaan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-white/5 pb-3">
        🏢 Pengaturan Perusahaan & Logo
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Profil perusahaan berhasil diperbarui secara dinamis!
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Nama Perusahaan (PT / CV / Instansi)
          </label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Contoh: PT Inovasi Teknologi"
            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Jabatan Anda
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Contoh: Senior Software Engineer"
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              No. Telepon / WA Perusahaan
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 0898xxxx"
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Logo Perusahaan / Instansi (Maks 2MB)
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center justify-center px-4 py-2.5 bg-slate-950/50 border border-white/10 hover:border-violet-500 rounded-xl cursor-pointer text-xs font-semibold text-slate-300 hover:text-slate-200 transition duration-300">
              <svg className="w-4 h-4 mr-2 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Pilih Logo Baru
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500 truncate max-w-[200px]">
              {fileName || 'Tidak ada file dipilih'}
            </span>
          </div>

          {logoPreview && (
            <div className="mt-4 flex items-center space-x-4 bg-slate-950/30 border border-white/5 rounded-2xl p-4 max-w-sm">
              <div className="w-16 h-16 bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Company Logo Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Pratinjau Logo Aktif</span>
                <span className="text-xs text-slate-300 font-semibold truncate max-w-[180px] block">
                  {companyName || 'Nama Perusahaan'}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] text-white rounded-2xl text-xs font-semibold tracking-wider shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition-all duration-300 cursor-pointer text-center"
        >
          {loading ? 'Menyimpan Perubahan...' : 'SIMPAN PERUBAHAN PROFILE'}
        </button>
      </form>
    </div>
  );
}
