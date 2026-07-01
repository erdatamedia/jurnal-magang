'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getThemeClasses } from '@/lib/theme';
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
    nidn?: string;
    department?: string;
    class?: string;
    phone?: string;
    companyName?: string;
    position?: string;
    companyLogo?: string | null;
    themeColor?: string;
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
    themeColor: string;
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

interface StudentJournalRecord extends JournalRecord {
  studentName: string;
  nim: string;
  department: string;
  class: string;
}

interface StudentAttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  notes: string | null;
  studentName: string;
  nim: string;
  department: string;
  class: string;
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

  // Mentor & Advisor student state variables
  const [studentJournals, setStudentJournals] = useState<StudentJournalRecord[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceRecord[]>([]);
  const [mentorTab, setMentorTab] = useState<'jurnal' | 'absensi' | 'settings'>('jurnal');
  const [advisorTab, setAdvisorTab] = useState<'jurnal' | 'absensi'>('jurnal');
  const [selectedJournal, setSelectedJournal] = useState<StudentJournalRecord | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  // Fetch mentor data (assigned students journal & attendance)
  const fetchMentorData = useCallback(async () => {
    try {
      const journalRes = await api.get('/journals/mentor');
      setStudentJournals(journalRes.journals || []);

      const attendanceRes = await api.get('/attendance/mentor');
      setStudentAttendance(attendanceRes.attendance || []);
    } catch (err: any) {
      console.error('Failed to load mentor data:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch advisor data (assigned students journal & attendance)
  const fetchAdvisorData = useCallback(async () => {
    try {
      const journalRes = await api.get('/journals/advisor');
      setStudentJournals(journalRes.journals || []);

      const attendanceRes = await api.get('/attendance/advisor');
      setStudentAttendance(attendanceRes.attendance || []);
    } catch (err: any) {
      console.error('Failed to load advisor data:', err.message);
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
      } else if (data.user.role === 'mentor') {
        fetchMentorData();
      } else if (data.user.role === 'advisor') {
        fetchAdvisorData();
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to refresh profile:', err.message);
      setLoading(false);
    }
  }, [fetchStudentData, fetchMentorData, fetchAdvisorData]);

  // Mentor/Advisor Review Journal Entry Action
  const handleReviewJournal = async (status: 'approved' | 'rejected') => {
    if (!selectedJournal) return;
    setActionLoading(true);
    try {
      await api.put(`/journals/${selectedJournal.id}/status`, {
        status,
        mentorFeedback: feedbackText
      });
      setSelectedJournal(null);
      setFeedbackText('');
      if (user?.role === 'advisor') {
        fetchAdvisorData();
      } else {
        fetchMentorData();
      }
    } catch (err: any) {
      alert(`Gagal memproses jurnal: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

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
    } else if (parsedUser.role === 'mentor') {
      fetchMentorData();
    } else if (parsedUser.role === 'advisor') {
      fetchAdvisorData();
    } else {
      setLoading(false);
    }
  }, [router, fetchStudentData, fetchMentorData, fetchAdvisorData]);

  const isStudent = user?.role === 'student';
  const isMentor = user?.role === 'mentor';
  const isAdvisor = user?.role === 'advisor';

  // Dynamic branding color theme (for advisors we fallback to yellow premium)
  const themeColor = isStudent
    ? (placement?.companyMentor?.themeColor || 'yellow')
    : (user?.profile?.themeColor || 'yellow');
  const theme = getThemeClasses(themeColor);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <svg className={`animate-spin h-8 w-8 ${theme.accentText} mb-4`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-semibold tracking-wider">Memuat Dashboard Jurnal Magang...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className={`absolute top-0 left-0 w-[500px] h-[500px] ${theme.accentGlow} rounded-full blur-3xl pointer-events-none`} />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-slate-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Header / Topbar */}
      <header className="relative z-10 bg-slate-900/30 backdrop-blur-md border-b border-white/5 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${theme.glowPulse}`} />
              <span className={`text-xs font-semibold uppercase tracking-widest ${theme.accentText}`}>
                {isStudent ? 'Portal Siswa' : isMentor ? 'Portal Pembimbing Lapangan' : 'Portal Dosen Pembimbing'}
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

            {isAdvisor && (
              <p className="text-xs text-slate-400 mt-0.5">
                NIDN: <span className="text-slate-300 font-medium">{user?.profile.nidn || '-'}</span> • Jabatan:{' '}
                <span className="text-slate-300 font-medium">Dosen Pembimbing Akademik</span>
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
                      <span className={`text-sm font-bold ${theme.accentText}`}>
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
                  themeColor={themeColor}
                />

                {/* History Card */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                  <div className="flex border-b border-white/5 mb-6">
                    <button
                      onClick={() => setActiveTab('jurnal')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                        activeTab === 'jurnal'
                          ? `${theme.activeTabBorder} font-bold`
                          : 'border-transparent text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      📜 Riwayat Jurnal
                    </button>
                    <button
                      onClick={() => setActiveTab('absensi')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                        activeTab === 'absensi'
                          ? `${theme.activeTabBorder} font-bold`
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
                                {j.status === 'approved' ? 'Disetujui' : j.status === 'rejected' ? 'Ditolak' : 'Proses Audit'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-2">{j.taskDescription}</p>
                            <p className="text-[10px] text-slate-500 mt-1 italic">Kompetensi: {j.learningOutcomes}</p>
                            
                            {j.mentorFeedback && (
                              <div className="mt-3 p-2.5 bg-slate-950/70 border border-white/5 rounded-xl text-[10px] text-slate-400">
                                <span className={`font-semibold block mb-0.5 ${theme.accentText}`}>Catatan Pembimbing:</span>
                                {j.mentorFeedback}
                              </div>
                            )}

                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-500">
                              <span>⏱️ {j.hoursWorked} Jam Kerja</span>
                              {j.attachmentPath && (
                                <a 
                                  href={getAssetUrl(j.attachmentPath)} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={`hover:underline font-semibold ${theme.accentText}`}
                                >
                                  📸 Bukti Gambar
                                </a>
                              )}
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
                <JournalForm onJournalCreated={fetchStudentData} themeColor={themeColor} />
              </div>
            </div>
          </>
        )}

        {/* MENTOR LAYOUT */}
        {isMentor && (
          <div className="space-y-8">
            {/* Tabs for Mentor */}
            <div className="flex border-b border-white/5 mb-6 max-w-lg">
              <button
                onClick={() => setMentorTab('jurnal')}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                  mentorTab === 'jurnal'
                    ? `${theme.activeTabBorder} font-bold`
                    : 'border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                📜 Riwayat Jurnal Siswa
              </button>
              <button
                onClick={() => setMentorTab('absensi')}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                  mentorTab === 'absensi'
                    ? `${theme.activeTabBorder} font-bold`
                    : 'border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                📅 Riwayat Presensi Siswa
              </button>
              <button
                onClick={() => setMentorTab('settings')}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                  mentorTab === 'settings'
                    ? `${theme.activeTabBorder} font-bold`
                    : 'border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                ⚙️ Pengaturan Instansi
              </button>
            </div>

            {mentorTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: settings card */}
                <div className="lg:col-span-6">
                  <MentorSettingsCard
                    initialProfile={{
                      name: user.name,
                      companyName: user.profile.companyName || '',
                      position: user.profile.position || '',
                      phone: user.profile.phone || '',
                      companyLogo: user.profile.companyLogo,
                      themeColor: user.profile.themeColor,
                    }}
                    onProfileUpdated={refreshProfile}
                  />
                </div>

                {/* Right Column: details card */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    {/* Background radial accent */}
                    <div className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 ${theme.accentGlow} rounded-full blur-2xl pointer-events-none`} />

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
                            <span className={`text-2xl font-bold ${theme.accentText}`}>
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
                          <span className="font-semibold text-emerald-400">
                            {Array.from(new Set(studentJournals.map(j => j.nim))).length} Orang
                          </span>
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

                      <div className={`border rounded-2xl p-4 text-xs text-slate-400 space-y-1 ${theme.accentBorder} ${theme.accentGlow}`}>
                        <span className={`font-semibold block mb-1 ${theme.accentText}`}>💡 Petunjuk Simulasi:</span>
                        Anda dapat mengubah nama instansi, nama Anda, mengunggah logo baru, dan memilih tema warna visual untuk siswa bimbingan Anda. Setelah disimpan, Anda dapat *Logout* dan masuk menggunakan akun siswa untuk melihat seluruh tema dan logo diperbarui secara dinamis!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mentorTab === 'jurnal' && (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-white/5 pb-3">
                  📜 Daftar Jurnal Kegiatan Siswa Bimbingan
                </h3>

                {studentJournals.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-12">Belum ada jurnal siswa yang dikirimkan.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentJournals.map((j) => (
                      <div key={j.id} className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-[320px] relative overflow-hidden">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Siswa</span>
                              <span className="text-xs font-bold text-slate-200">{j.studentName}</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">NIM: {j.nim} • {j.class}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                              j.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              j.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {j.status === 'approved' ? 'Disetujui' : j.status === 'rejected' ? 'Ditolak' : 'Tinjauan'}
                            </span>
                          </div>

                          <div className="border-t border-white/5 pt-3">
                            <span className="text-[9px] text-slate-500 font-bold">TANGGAL: {new Date(j.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <p className="text-xs text-slate-300 line-clamp-3 mt-1.5 leading-relaxed">{j.taskDescription}</p>
                            <p className="text-[10px] text-slate-500 mt-2 italic truncate">Kompetensi: {j.learningOutcomes}</p>
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-auto">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-3">
                            <span>⏱️ {j.hoursWorked} Jam Kerja</span>
                            {j.attachmentPath && (
                              <a 
                                href={getAssetUrl(j.attachmentPath)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className={`font-semibold hover:underline ${theme.accentText}`}
                              >
                                📸 Lihat Bukti Foto
                              </a>
                            )}
                          </div>

                          {j.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setSelectedJournal(j);
                                setFeedbackText('');
                              }}
                              className={`w-full py-2 ${theme.accentBg} hover:opacity-90 rounded-xl text-xs font-semibold transition-all`}
                            >
                              Tinjau & Verifikasi Jurnal
                            </button>
                          ) : (
                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-[10px] text-slate-400">
                              <span className="font-bold text-slate-300 block mb-0.5">Catatan Umpan Balik:</span>
                              {j.mentorFeedback || 'Tidak ada catatan.'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mentorTab === 'absensi' && (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-white/5 pb-3">
                  📅 Log Presensi / Kehadiran Siswa Bimbingan
                </h3>

                {studentAttendance.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-12">Belum ada absensi yang dicatatkan.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-3 px-4">Nama Siswa</th>
                          <th className="py-3 px-4">Tanggal</th>
                          <th className="py-3 px-4">Jam Masuk</th>
                          <th className="py-3 px-4">Jam Keluar</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {studentAttendance.map((a) => (
                          <tr key={a.id} className="hover:bg-white/5 transition duration-150">
                            <td className="py-3.5 px-4">
                              <span className="font-bold block text-slate-200">{a.studentName}</span>
                              <span className="text-[10px] text-slate-500">NIM: {a.nim} • {a.class}</span>
                            </td>
                            <td className="py-3.5 px-4 font-medium">
                              {new Date(a.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {a.checkIn ? new Date(a.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {a.checkOut ? new Date(a.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                a.status === 'HADIR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-slate-400 italic">
                              {a.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ADVISOR LAYOUT */}
        {isAdvisor && (
          <div className="space-y-8">
            {/* Tabs for Advisor */}
            <div className="flex border-b border-white/5 mb-6 max-w-sm">
              <button
                onClick={() => setAdvisorTab('jurnal')}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                  advisorTab === 'jurnal'
                    ? `${theme.activeTabBorder} font-bold`
                    : 'border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                📜 Riwayat Jurnal Siswa
              </button>
              <button
                onClick={() => setAdvisorTab('absensi')}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 tracking-wide transition duration-300 cursor-pointer ${
                  advisorTab === 'absensi'
                    ? `${theme.activeTabBorder} font-bold`
                    : 'border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                📅 Riwayat Presensi Siswa
              </button>
            </div>

            {advisorTab === 'jurnal' && (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-white/5 pb-3">
                  📜 Daftar Jurnal Kegiatan Mahasiswa Bimbingan Akademik
                </h3>

                {studentJournals.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-12">Belum ada jurnal siswa yang dikirimkan.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentJournals.map((j) => (
                      <div key={j.id} className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-[320px] relative overflow-hidden">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Mahasiswa</span>
                              <span className="text-xs font-bold text-slate-200">{j.studentName}</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">NIM: {j.nim} • {j.class}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                              j.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              j.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {j.status === 'approved' ? 'Disetujui' : j.status === 'rejected' ? 'Ditolak' : 'Tinjauan'}
                            </span>
                          </div>

                          <div className="border-t border-white/5 pt-3">
                            <span className="text-[9px] text-slate-500 font-bold">TANGGAL: {new Date(j.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <p className="text-xs text-slate-300 line-clamp-3 mt-1.5 leading-relaxed">{j.taskDescription}</p>
                            <p className="text-[10px] text-slate-500 mt-2 italic truncate">Kompetensi: {j.learningOutcomes}</p>
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-auto">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-3">
                            <span>⏱️ {j.hoursWorked} Jam Kerja</span>
                            {j.attachmentPath && (
                              <a 
                                href={getAssetUrl(j.attachmentPath)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className={`font-semibold hover:underline ${theme.accentText}`}
                              >
                                📸 Lihat Bukti Foto
                              </a>
                            )}
                          </div>

                          {j.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setSelectedJournal(j);
                                setFeedbackText('');
                              }}
                              className={`w-full py-2 ${theme.accentBg} hover:opacity-90 rounded-xl text-xs font-semibold transition-all`}
                            >
                              Tinjau & Beri Masukan Dosen
                            </button>
                          ) : (
                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-[10px] text-slate-400">
                              <span className="font-bold text-slate-300 block mb-0.5">Catatan Umpan Balik:</span>
                              {j.mentorFeedback || 'Tidak ada catatan.'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {advisorTab === 'absensi' && (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-white/5 pb-3">
                  📅 Log Presensi / Kehadiran Mahasiswa Bimbingan
                </h3>

                {studentAttendance.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-12">Belum ada absensi yang dicatatkan.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-3 px-4">Nama Mahasiswa</th>
                          <th className="py-3 px-4">Tanggal</th>
                          <th className="py-3 px-4">Jam Masuk</th>
                          <th className="py-3 px-4">Jam Keluar</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {studentAttendance.map((a) => (
                          <tr key={a.id} className="hover:bg-white/5 transition duration-150">
                            <td className="py-3.5 px-4">
                              <span className="font-bold block text-slate-200">{a.studentName}</span>
                              <span className="text-[10px] text-slate-500">NIM: {a.nim} • {a.class}</span>
                            </td>
                            <td className="py-3.5 px-4 font-medium">
                              {new Date(a.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {a.checkIn ? new Date(a.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {a.checkOut ? new Date(a.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                a.status === 'HADIR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-slate-400 italic">
                              {a.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal for Journal Approval (shared for both Mentor & Advisor review) */}
        {selectedJournal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <h4 className="text-base font-bold text-slate-200 mb-2">Verifikasi Jurnal Kegiatan</h4>
              <p className="text-xs text-slate-400 mb-4">
                Siswa: <span className="font-semibold text-slate-200">{selectedJournal.studentName}</span> • Tanggal: <span className="font-semibold text-slate-200">{new Date(selectedJournal.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </p>

              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 mb-5 max-h-[150px] overflow-y-auto">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold mb-1">Aktivitas Pekerjaan:</span>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedJournal.taskDescription}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Catatan Umpan Balik (Feedback)
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Berikan saran, koreksi, atau umpan balik lainnya..."
                    rows={3}
                    className={`w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none ${theme.focusBorder} transition duration-300 text-xs`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleReviewJournal('rejected')}
                    disabled={actionLoading}
                    className="py-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold tracking-wider transition duration-300 cursor-pointer"
                  >
                    ❌ Tolak Jurnal
                  </button>
                  <button
                    onClick={() => handleReviewJournal('approved')}
                    disabled={actionLoading}
                    className={`py-3 ${theme.accentBg} hover:opacity-90 active:scale-[0.98] rounded-xl text-xs font-semibold tracking-wider transition duration-300 cursor-pointer`}
                  >
                    ✅ Setujui Jurnal
                  </button>
                </div>

                <button
                  onClick={() => setSelectedJournal(null)}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-950/80 text-slate-500 rounded-xl text-xs font-semibold transition duration-300 mt-2"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
