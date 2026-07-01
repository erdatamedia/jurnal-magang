'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getThemeClasses } from '@/lib/theme';

interface Attendance {
  id: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
}

interface AttendanceCardProps {
  initialAttendance: Attendance | null;
  onAttendanceChange: () => void;
  themeColor?: string;
}

export default function AttendanceCard({ initialAttendance, onAttendanceChange, themeColor = 'yellow' }: AttendanceCardProps) {
  const theme = getThemeClasses(themeColor);
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [status, setStatus] = useState<'HADIR' | 'SAKIT' | 'IZIN'>('HADIR');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Running digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      setDateStr(now.toLocaleDateString('id-ID', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async () => {
    setError('');
    setLoading(true);
    try {
      if ((status === 'SAKIT' || status === 'IZIN') && !notes.trim()) {
        throw new Error('Catatan wajib diisi jika sakit atau izin.');
      }
      await api.post('/attendance/check-in', { status, notes });
      onAttendanceChange();
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Check-in gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/attendance/check-out');
      onAttendanceChange();
    } catch (err: any) {
      setError(err.message || 'Check-out gagal');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Determine current attendance state
  const isCheckedIn = !!initialAttendance;
  const isCheckedOut = !!initialAttendance?.checkOut;
  const isSakitOrIzin = initialAttendance?.status === 'SAKIT' || initialAttendance?.status === 'IZIN';
  const isCompleted = isCheckedOut || isSakitOrIzin;

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Background radial accent */}
      <div className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 ${theme.accentGlow} rounded-full blur-2xl pointer-events-none`} />

      {/* Clock and date */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-white/5 pb-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Waktu Presensi</p>
          <h3 className="text-lg font-bold text-slate-200 mt-1">{dateStr || 'Loading...'}</h3>
        </div>
        <div className={`mt-2 md:mt-0 font-mono text-3xl font-bold bg-gradient-to-r ${theme.accentText === 'text-yellow-400' ? 'from-yellow-400 to-amber-300' : 'from-violet-400 to-emerald-400'} bg-clip-text text-transparent tracking-widest`}>
          {time || '00:00:00'}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Logic for Completed State */}
      {isCompleted ? (
        <div className="text-center py-6">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-slate-200">Presensi Hari Ini Lengkap!</h4>
          <p className="text-xs text-slate-400 mt-1">
            Status: <span className="text-emerald-400 font-semibold">{initialAttendance?.status}</span>
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-6 bg-slate-950/40 border border-white/5 rounded-2xl p-4 max-w-sm mx-auto text-sm text-left">
            <div>
              <span className="text-xs text-slate-500 block uppercase font-medium">Check-In</span>
              <span className="font-semibold text-slate-300">{formatTime(initialAttendance?.checkIn)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase font-medium">Check-Out</span>
              <span className="font-semibold text-slate-300">{formatTime(initialAttendance?.checkOut)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-6">Sampai jumpa esok hari. Selamat beristirahat!</p>
        </div>
      ) : isCheckedIn ? (
        /* Logic for Checked-In State (Waiting to Check-Out) */
        <div className="space-y-6">
          <div className={`flex items-center space-x-4 ${theme.accentGlow} border ${theme.accentBorder} rounded-2xl p-4 text-sm text-slate-300`}>
            <div className={`p-2 ${theme.accentGlow} rounded-xl ${theme.accentText}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">STATUS SEKARANG</p>
              <p className="font-semibold text-slate-200 mt-0.5">
                Sudah Check-In pukul <span className={theme.accentText}>{formatTime(initialAttendance.checkIn)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckOut}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white rounded-2xl text-sm font-semibold tracking-wider shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20 transition-all duration-300 cursor-pointer text-center"
          >
            {loading ? 'Memproses Check-Out...' : 'CHECK-OUT PRESENSI'}
          </button>
        </div>
      ) : (
        /* Logic for Check-In Form State (Not Presenced Yet) */
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Status Presensi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['HADIR', 'SAKIT', 'IZIN'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer text-center ${
                    status === s
                      ? `${theme.accentBg} border-transparent shadow-md`
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-950/70 hover:text-slate-300'
                  }`}
                >
                  {s === 'HADIR' ? '👋 Hadir' : s === 'SAKIT' ? '🤒 Sakit' : '✉️ Izin'}
                </button>
              ))}
            </div>
          </div>

          {status !== 'HADIR' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Alasan / Catatan {status === 'SAKIT' ? 'Sakit' : 'Izin'}
              </label>
              <textarea
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan keterangan sakit atau keperluan izin secara jelas..."
                rows={3}
                className={`w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none ${theme.focusBorder} transition duration-300 text-xs`}
              />
            </div>
          )}

          <button
            onClick={handleCheckIn}
            disabled={loading}
            className={`w-full py-4 ${theme.buttonGradient} active:scale-[0.98] rounded-2xl text-sm font-semibold tracking-wider transition-all duration-300 cursor-pointer text-center`}
          >
            {loading ? 'Memproses Check-In...' : 'CHECK-IN PRESENSI'}
          </button>
        </div>
      )}
    </div>
  );
}
