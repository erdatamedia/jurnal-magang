'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface JournalFormProps {
  onJournalCreated: () => void;
}

export default function JournalForm({ onJournalCreated }: JournalFormProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [taskDescription, setTaskDescription] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [hoursWorked, setHoursWorked] = useState('8');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Convert image to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran gambar maksimal adalah 2MB.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment(reader.result as string);
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
      if (!taskDescription.trim() || !learningOutcomes.trim()) {
        throw new Error('Deskripsi tugas dan hasil pembelajaran wajib diisi.');
      }

      const payload = {
        date,
        taskDescription,
        learningOutcomes,
        hoursWorked: parseFloat(hoursWorked),
        attachment,
      };

      await api.post('/journals', payload);
      
      // Reset form
      setTaskDescription('');
      setLearningOutcomes('');
      setHoursWorked('8');
      setAttachment(null);
      setFileName('');
      setSuccess(true);
      
      onJournalCreated();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan jurnal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-white/5 pb-3">
        ✍️ Isi Jurnal Harian Magang
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
          Jurnal berhasil dikirim untuk diaudit oleh pembimbing!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Tanggal Kegiatan
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Durasi Kerja (Jam)
            </label>
            <input
              type="number"
              required
              min={1}
              max={24}
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Deskripsi Pekerjaan / Aktivitas
          </label>
          <textarea
            required
            rows={4}
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Tuliskan rincian apa saja yang Anda kerjakan hari ini..."
            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Hasil Pembelajaran / Kompetensi diperoleh
          </label>
          <textarea
            required
            rows={3}
            value={learningOutcomes}
            onChange={(e) => setLearningOutcomes(e.target.value)}
            placeholder="Apa pelajaran, wawasan, atau kompetensi baru yang Anda dapatkan?"
            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition duration-300 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Dokumentasi / Foto Kegiatan (Maks 2MB)
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center justify-center px-4 py-2.5 bg-slate-950/50 border border-white/10 hover:border-violet-500 rounded-xl cursor-pointer text-xs font-semibold text-slate-300 hover:text-slate-200 transition duration-300">
              <svg className="w-4 h-4 mr-2 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Pilih Gambar
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

          {attachment && (
            <div className="mt-4 p-2 bg-slate-950/30 border border-white/5 rounded-2xl max-w-[150px] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment}
                alt="Upload Preview"
                className="rounded-xl w-full h-auto object-cover max-h-[120px]"
              />
              <button
                type="button"
                onClick={() => {
                  setAttachment(null);
                  setFileName('');
                }}
                className="absolute top-1 right-1 p-1 bg-red-600 rounded-full hover:bg-red-500 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] text-white rounded-2xl text-xs font-semibold tracking-wider shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition-all duration-300 cursor-pointer text-center"
        >
          {loading ? 'Mengirim Jurnal...' : 'KIRIM JURNAL HARIAN'}
        </button>
      </form>
    </div>
  );
}
