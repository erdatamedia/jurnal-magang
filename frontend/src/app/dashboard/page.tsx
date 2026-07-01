'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AttendanceCard from '@/components/AttendanceCard';
import JournalForm from '@/components/JournalForm';
import MentorSettingsCard from '@/components/MentorSettingsCard';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  profile: {
    id: string;
    nim?: string;
    department?: string;
    class?: string;
    phone?: string;
    companyName?: string;
    position?: string;
    companyLogo?: string | null;
  };
}

interface PlacementInfo {
  id: string;
  startDate: string;
  endDate: string;
  companyMentor: {
    companyName: string;
    companyLogo: string | null;
    position: string;
    user: { name: string };
  };
  academicAdvisor: {
    user: { name: string };
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  notes: string | null;
}

interface JournalRecord {
  id: string;
  date: string;
  taskDescription: string;
  learningOutcomes: string;
  hoursWorked: number;
  attachmentPath: string | null;
  status: string;
  mentorFeedback: string | null;
}

const getAssetUrl = (path: string | null | undefined) => {
  if (!path) return '';
  const host = typeof window !== 'undefined'
    ? (window.location.origin.includes('localhost') ? 'http://localhost:5005' : window.location.origin)
    : 'http://localhost:5005';
  return `${host}${path}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [placement, setPlacement] = useState<PlacementInfo | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [journalHistory, setJournalHistory] = useState<JournalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'jurnal' | 'absensi'>('jurnal');
  const [loading, setLoading] = useState(true);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Fetch student data
  const fetchStudentData = useCallback(async () => {
    try {
      // 1. Get status & placement
      const statusData = await api.get('/attendance/status');
      setTodayAttendance(statusData.attendance);
      setPlacement(statusData.placement);

      // 2. Get history
      const attHistory = await api.get('/attendance/history');
      setAttendanceHistory(attHistory);

      const journHistory = await api.get('/journals');
      setJournalHistory(journHistory);
    } catch (err: any) {
      console.error('Failed to load student data:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch profile to refresh data
  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      if (data.user.role === 'student') {
        fetchStudentData();
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to refresh profile:', err.message);
      setLoading(false);
    }
  }, [fetchStudentData]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);

    if (parsedUser.role === 'student') {
      fetchStudentData();
    } else {
      setLoading(false);
    }
  }, [router, fetchStudentData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <svg className="animate-spin h-8 w-8 text-violet-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-semibold tracking-wider">Memuat Dashboard Jurnal Magang...</p>
      </div>
    );
  }

  const isStudent = user?.role === 'student';
  const isMentor = user?.role === 'mentor';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Header / Topbar */}
      <header className="relative z-10 bg-slate-900/30 backdrop-blur-md border-b border-white/5 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${isStudent ? 'bg-emerald-500' : 'bg-violet-500'}`} />
              <span className={`text-xs font-semibold uppercase tracking-widest ${isStudent ? 'text-emerald-400' : 'text-violet-400'}`}>
                {isStudent ? 'Portal Siswa' : 'Portal Pembimbing Lapangan'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">{user?.name}</h1>
            
            {isStudent && (
              <p className="text-xs text-slate-400 mt-0.5">
                NIM: <span className="text-slate-300 font-medium">{user?.profile.nim}</span> • Kelas:{' '}
                <span className="text-slate-300 font-medium">{user?.profile.class}</span> • Jurusan:{' '}
                <span className="text-slate-300 font-medium">{user?.profile.department}</span>
              </p>
            )}

            {isMentor && (
              <p className="text-xs text-slate-400 mt-0.5">
                Instansi:{' '}
                <span className="text-slate-300 font-medium">{user?.profile.companyName}</span> • Jabatan:{' '}
                <span className="text-slate-300 font-medium">{user?.profile.position || '-'}</span>
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-950/60 hover:bg-slate-900 border border-white/10 hover:border-white/20 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition duration-300 cursor-pointer"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        
        {/* STUDENT LAYOUT */}
        {isStudent && (
          <>
            {/* Placement Info Card with dynamic logo */}
            {placement && (
              <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-5 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Dynamic Company Logo */}
                  <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden p-2 shrink-0">
                    {placement.companyMentor.companyLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAssetUrl(placement.companyMentor.companyLogo)}
                        alt="Company Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-bold text-violet-400">
                        {placement.companyMentor.companyName.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">Tempat Magang Aktif</span>
                    <h4 className="text-base font-bold text-slate-200 mt-0.5">
                      {placement.companyMentor.companyName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Pembimbing Lapangan:{' '}
                      <span className="text-slate-300 font-medium">
                        {placement.companyMentor.user.name} ({placement.companyMentor.position})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">Dosen Pembimbing</span>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">
                    {placement.academicAdvisor.user.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Periode:{' '}
                    <span className="text-slate-300 font-medium">
                      {new Date(placement.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </span>{' '}
                    s/d{' '}
                    <span className="text-slate-300 font-medium">
                      {new Date(placement.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-8">
                <AttendanceCard
                  initialAttendance={todayAttendance}
                  onAttendanceChange={fetchStudentData}
                />

                {/* History Card */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                  <div className="flex border-b border-white/5 mb-6">
                    <button
                      onClick={() => setActiveTab('jurnal')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                        activeTab === 'jurnal'
                          ? 'border-violet-600 text-slate-100 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      📜 Riwayat Jurnal
                    </button>
                    <button
                      onClick={() => setActiveTab('absensi')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                        activeTab === 'absensi'
                          ? 'border-violet-600 text-slate-100 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      📅 Riwayat Absen
                    </button>
                  </div>

                  {activeTab === 'jurnal' ? (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                      {journalHistory.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-8">Belum ada catatan jurnal.</p>
                      ) : (
                        journalHistory.map((j) => (
                          <div key={j.id} className="bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs text-slate-400 font-bold">
                                {new Date(j.date).toLocaleDateString('id-ID', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                j.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                j.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {j.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-2 mt-2">{j.taskDescription}</p>
                            <p className="text-[10px] text-slate-500 mt-1 italic">Kompetensi: {j.learningOutcomes}</p>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-500">
                              <span>⏱️ {j.hoursWorked} Jam Kerja</span>
                              {j.attachmentPath && <span className="text-violet-400 font-semibold">📸 Lampiran Gambar</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                      {attendanceHistory.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-8">Belum ada riwayat absensi.</p>
                      ) : (
                        attendanceHistory.map((a) => (
                          <div key={a.id} className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                            <div>
                              <p className="text-xs text-slate-300 font-bold">
                                {new Date(a.date).toLocaleDateString('id-ID', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                🕒 {a.checkIn ? new Date(a.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} s/d{' '}
                                {a.checkOut ? new Date(a.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                              a.status === 'HADIR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {a.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7">
                <JournalForm onJournalCreated={fetchStudentData} />
              </div>
            </div>
          </>
        )}

        {/* MENTOR LAYOUT */}
        {isMentor && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: settings card */}
            <div className="lg:col-span-6">
              <MentorSettingsCard
                initialProfile={{
                  companyName: user.profile.companyName || '',
                  position: user.profile.position || '',
                  phone: user.profile.phone || '',
                  companyLogo: user.profile.companyLogo,
                }}
                onProfileUpdated={refreshProfile}
              />
            </div>

            {/* Right Column: details card */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-white/5 pb-3">
                  📈 Status Kemitraan Magang
                </h3>

                <div className="space-y-6">
                  {/* Dynamic Logo Preview Card */}
                  <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-slate-950 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden p-3 mb-4">
                      {user.profile.companyLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getAssetUrl(user.profile.companyLogo)}
                          alt="Company Logo Active"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-violet-400">
                          {user.profile.companyName?.substring(0, 2).toUpperCase() || 'PT'}
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-slate-200">{user.profile.companyName}</h4>
                    <p className="text-xs text-slate-500 mt-1">Logo Instansi yang Tampil Dinamis pada Dashboard Siswa</p>
                  </div>

                  {/* Summary lists */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-white/5 text-sm">
                      <span className="text-slate-500 font-medium">Siswa Aktif Terbimbing</span>
                      <span className="font-semibold text-emerald-400">1 Orang</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/5 text-sm">
                      <span className="text-slate-500 font-medium">Pembimbing Lapangan</span>
                      <span className="font-semibold text-slate-300">{user.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/5 text-sm">
                      <span className="text-slate-500 font-medium">Kontak (WA)</span>
                      <span className="font-semibold text-slate-300">{user.profile.phone || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-violet-600/10 border border-violet-500/20 rounded-2xl p-4 text-xs text-slate-400 space-y-1">
                    <span className="text-violet-400 font-semibold block mb-1">💡 Petunjuk Simulasi:</span>
                    Anda dapat mengubah nama instansi dan mengunggah logo baru di formulir sebelah kiri. Setelah disimpan, Anda dapat *Logout* dan masuk menggunakan akun siswa (`student@example.com`) untuk melihat perubahannya langsung ter-update di dashboard siswa.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
