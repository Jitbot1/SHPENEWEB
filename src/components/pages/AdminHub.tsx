import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  QrCode, 
  BarChart3, 
  Image as ImageIcon, 
  Users, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  ExternalLink, 
  Camera, 
  Sparkles, 
  Award, 
  Shield, 
  CheckCircle2, 
  Search, 
  Filter, 
  Download, 
  Tv,
  RefreshCw,
  Radio
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth, UserProfile } from '../../context/useAuth';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminImageManagement } from './AdminImageManagement';
import { AdminScanner } from '../AdminScanner';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { subscribeAttendanceLogs, AttendanceLogRecord } from '../../services/attendanceService';
import { 
  saveOrUpdateActiveEvent, 
  subscribeAttendanceHistory, 
  seedDefaultActiveEventsIfEmpty,
  AttendanceHistoryRecord 
} from '../../services/eventAttendanceService';

export const AdminHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'attendance';

  const { isAdmin, loading: authLoading } = useAuth();

  // Unified Section Tabs: 'attendance' | 'analytics' | 'media' | 'roster'
  const [activeSection, setActiveSection] = useState<'attendance' | 'analytics' | 'media' | 'roster'>(
    ['attendance', 'analytics', 'media', 'roster'].includes(initialTab) 
      ? (initialTab as 'attendance' | 'analytics' | 'media' | 'roster')
      : 'attendance'
  );

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['attendance', 'analytics', 'media', 'roster'].includes(tab)) {
      setActiveSection(tab as 'attendance' | 'analytics' | 'media' | 'roster');
    }
  }, [searchParams]);

  const handleTabChange = (section: 'attendance' | 'analytics' | 'media' | 'roster') => {
    setActiveSection(section);
    setSearchParams({ tab: section });
  };

  // =========================================================================
  // SECTION 1: LIVE EVENT ATTENDANCE & PROJECTOR QR CODE STATE
  // =========================================================================
  const [eventName, setEventName] = useState('GBM #2: National Convention Delegation & Career Prep');
  const [customEvent, setCustomEvent] = useState('');
  const [attendanceCode, setAttendanceCode] = useState('BOBCAT-2026');
  const [nominalPoints, setNominalPoints] = useState(10);
  const [isProjectorFullScreen, setIsProjectorFullScreen] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState<'projector' | 'camera'>('projector');
  const [todayAttendanceLogs, setTodayAttendanceLogs] = useState<AttendanceLogRecord[]>([]);
  const [todayHistoryRecords, setTodayHistoryRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [eventSyncStatus, setEventSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');

  const activeEventTitle = customEvent.trim() || eventName;

  // Bootstrap initial events collection if empty
  useEffect(() => {
    seedDefaultActiveEventsIfEmpty().catch((err) => {
      console.warn('Initial events seed check notice:', err);
    });
  }, []);

  // Save/Update active event in Firestore `events` collection whenever code/title/points change
  useEffect(() => {
    let active = true;
    const cleanCode = attendanceCode.trim().toUpperCase();
    if (!cleanCode || !activeEventTitle.trim()) return;

    setEventSyncStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await saveOrUpdateActiveEvent({
          title: activeEventTitle,
          attendanceCode: cleanCode,
          points: nominalPoints,
          active: true,
        });
        if (active) {
          setEventSyncStatus('synced');
          setTimeout(() => {
            if (active) setEventSyncStatus('idle');
          }, 3000);
        }
      } catch (err) {
        console.warn('Auto-sync event to Firestore notice:', err);
        if (active) setEventSyncStatus('error');
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [attendanceCode, activeEventTitle, nominalPoints]);

  const handleManualSyncEvent = async () => {
    try {
      setEventSyncStatus('saving');
      await saveOrUpdateActiveEvent({
        title: activeEventTitle,
        attendanceCode: attendanceCode.trim().toUpperCase(),
        points: nominalPoints,
        active: true,
      });
      setEventSyncStatus('synced');
      setTimeout(() => setEventSyncStatus('idle'), 2500);
    } catch (err) {
      console.error('Manual event sync error:', err);
      setEventSyncStatus('error');
    }
  };

  // Generate check-in URL
  const checkInUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://shpe-txst.web.app';
    const params = new URLSearchParams({
      code: attendanceCode,
      event: activeEventTitle,
      points: String(nominalPoints)
    });
    return `${origin}/check-in?${params.toString()}`;
  }, [attendanceCode, activeEventTitle, nominalPoints]);

  // Subscribe to live attendance collections (both attendanceHistory and attendanceLogs)
  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    const cleanEventTitle = activeEventTitle.toLowerCase();
    const cleanCode = attendanceCode.trim().toLowerCase();

    // 1. Subscribe to live attendanceHistory collection
    const unsubHistory = subscribeAttendanceHistory((records) => {
      const matching = records.filter(
        (r) =>
          r.date === todayDate ||
          (r.eventName && r.eventName.toLowerCase() === cleanEventTitle) ||
          (r.eventId && cleanCode && r.eventId.toLowerCase().includes(cleanCode))
      );
      setTodayHistoryRecords(matching);
    });

    // 2. Subscribe to live attendanceLogs collection
    const unsubLogs = subscribeAttendanceLogs((logs) => {
      const matching = logs.filter(
        (l) => l.date === todayDate || (l.eventName && l.eventName.toLowerCase() === cleanEventTitle)
      );
      setTodayAttendanceLogs(matching);
    });

    return () => {
      unsubHistory();
      unsubLogs();
    };
  }, [activeEventTitle, attendanceCode]);

  // Combined unique attendee count today
  const liveTodayAttendeeCount = useMemo(() => {
    const uniqueIdentifiers = new Set<string>();
    todayAttendanceLogs.forEach((l) => {
      const key = (l.netid || l.email || l.userId || l.id).toLowerCase();
      if (key) uniqueIdentifiers.add(key);
    });
    todayHistoryRecords.forEach((h) => {
      const key = (h.netId || h.email || h.userId || h.id).toLowerCase();
      if (key) uniqueIdentifiers.add(key);
    });
    return Math.max(uniqueIdentifiers.size, todayAttendanceLogs.length, todayHistoryRecords.length);
  }, [todayAttendanceLogs, todayHistoryRecords]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2500);
    } catch {
      setCopyLinkSuccess(false);
    }
  };

  // =========================================================================
  // SECTION 4: MEMBER & DUES ROSTER STATE
  // =========================================================================
  const [rosterUsers, setRosterUsers] = useState<UserProfile[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'paid' | 'unpaid' | 'officer'>('all');
  const [rosterActionMessage, setRosterActionMessage] = useState<string | null>(null);

  // Subscribe to live users roster
  useEffect(() => {
    const usersColl = collection(db, 'users');
    const unsub = onSnapshot(
      usersColl,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as UserProfile), uid: docSnap.id });
        });
        // Sort by full name or email
        list.sort((a, b) => (a.fullName || a.displayName || a.email || '').localeCompare(b.fullName || b.displayName || b.email || ''));
        setRosterUsers(list);
        setLoadingRoster(false);
      },
      (err) => {
        console.warn('Roster subscription notice:', err);
        setLoadingRoster(false);
      }
    );
    return () => unsub();
  }, []);

  const handleAdminVerifyDues = async (uid: string, newStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isPaidMember: newStatus,
        updatedAt: serverTimestamp(),
      });
      setRosterActionMessage(`Dues status updated: ${newStatus ? 'Paid Member' : 'Unpaid / Pending'}`);
      setTimeout(() => setRosterActionMessage(null), 3000);
    } catch (err) {
      console.error('Error updating dues status:', err);
      setRosterActionMessage('Error updating dues status.');
    }
  };

  const handleAdminVerifyNetId = async (uid: string, newStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isNetIDVerified: newStatus,
        txstateVerified: newStatus,
        updatedAt: serverTimestamp(),
      });
      setRosterActionMessage(`NetID status updated: ${newStatus ? 'Verified' : 'Unverified'}`);
      setTimeout(() => setRosterActionMessage(null), 3000);
    } catch (err) {
      console.error('Error updating NetID status:', err);
      setRosterActionMessage('Error updating NetID status.');
    }
  };

  const handleAdminAdjustPoints = async (uid: string, newPoints: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        meritPoints: Math.max(0, newPoints),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adjusting points:', err);
    }
  };

  const handleAdminRole = async (uid: string, newRole: 'member' | 'officer') => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      setRosterActionMessage(`Role updated: ${newRole}`);
      setTimeout(() => setRosterActionMessage(null), 3000);
    } catch (err) {
      console.error('Error updating role:', err);
      setRosterActionMessage('Error updating role.');
    }
  };

  const filteredRosterUsers = useMemo(() => {
    return rosterUsers.filter((u) => {
      const q = rosterSearch.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.netid && u.netid.toLowerCase().includes(q)) ||
        (u.studentId && u.studentId.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (rosterFilter === 'paid') return Boolean(u.isPaidMember);
      if (rosterFilter === 'unpaid') return !u.isPaidMember;
      if (rosterFilter === 'officer') return u.role === 'officer';
      return true;
    });
  }, [rosterUsers, rosterSearch, rosterFilter]);

  const handleExportRosterCsv = () => {
    const headers = ['Full Name', 'NetID', 'Email', 'Payment Status', 'Role', 'Merit Points', 'Attendance Count'];
    const rows = filteredRosterUsers.map((u) => [
      `"${(u.fullName || u.displayName || 'No Name').replace(/"/g, '""')}"`,
      `"${(u.netid || u.studentId || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${u.isPaidMember ? 'Paid Member' : 'Unpaid'}"`,
      `"${u.role || 'member'}"`,
      u.meritPoints || 0,
      u.attendanceCount || 0
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SHPE_TXST_Member_Roster_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Access control
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-2 border-[#501214] space-y-4">
          <div className="w-16 h-16 bg-[#501214] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md animate-pulse">
            <Shield className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-xl font-black text-[#1A1A1A]">Loading Admin Hub...</h2>
          <p className="text-xs text-gray-700">Verifying administrative access credentials.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-2 border-red-300 space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#1A1A1A]">Restricted Access</h2>
          <p className="text-xs text-gray-700">
            The Admin Hub is reserved for chapter executive administrators (<strong className="text-[#501214]">shpetxst@gmail.com</strong>).
          </p>
          <div className="pt-2">
            <Link
              to="/profile"
              className="px-5 py-2.5 bg-[#501214] text-white rounded-xl text-xs font-black shadow-md inline-block"
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20 animate-fade-in">
      
      {/* ===================================================================== */}
      {/* TOP COMMAND HEADER                                                    */}
      {/* ===================================================================== */}
      <div className="bg-[#501214] text-white border-b-4 border-[#C4A47C] shadow-lg py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-black/40 text-white rounded-lg text-xs font-black border border-white/20">
                <Shield className="w-3.5 h-3.5 text-[#C4A47C]" />
                <span>Executive Command Center</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#C4A47C] text-[#501214] rounded-lg text-xs font-black">
                <span>shpetxst@gmail.com</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              SHPE Texas State Admin Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 max-w-2xl font-medium">
              Unified administration portal for live projector check-ins, event analytics, website media management, and member dues verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/check-in"
              target="_blank"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white text-[#501214] hover:bg-gray-100 rounded-xl text-xs font-black shadow-md transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Check-In Page</span>
            </Link>

            <Link
              to="/programs/merits"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#C4A47C] text-[#501214] hover:bg-[#b09068] rounded-xl text-xs font-black shadow-md transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Merit Leaderboard</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* ===================================================================== */}
        {/* 4 CONSOLIDATED SECTION TABS (SOLID COLORS, HIGH LEGIBILITY)           */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          
          {/* TAB 1 */}
          <button
            onClick={() => handleTabChange('attendance')}
            className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start space-x-3.5 shadow-sm ${
              activeSection === 'attendance'
                ? 'bg-[#501214] text-white border-[#501214] ring-2 ring-[#C4A47C] shadow-md'
                : 'bg-white text-[#1A1A1A] border-gray-300 hover:bg-gray-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              activeSection === 'attendance' ? 'bg-[#C4A47C] text-[#501214]' : 'bg-gray-100 text-[#501214]'
            }`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-80">Section 1</div>
              <div className="text-xs sm:text-sm font-black">Live Event Attendance &amp; QR</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'attendance' ? 'text-gray-200' : 'text-gray-600'}`}>
                Projector QR pass &amp; door scanner
              </div>
            </div>
          </button>

          {/* TAB 2 */}
          <button
            onClick={() => handleTabChange('analytics')}
            className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start space-x-3.5 shadow-sm ${
              activeSection === 'analytics'
                ? 'bg-[#501214] text-white border-[#501214] ring-2 ring-[#C4A47C] shadow-md'
                : 'bg-white text-[#1A1A1A] border-gray-300 hover:bg-gray-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              activeSection === 'analytics' ? 'bg-[#C4A47C] text-[#501214]' : 'bg-gray-100 text-[#501214]'
            }`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-80">Section 2</div>
              <div className="text-xs sm:text-sm font-black">Analytics &amp; Export</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'analytics' ? 'text-gray-200' : 'text-gray-600'}`}>
                Demographics, trends &amp; CSV
              </div>
            </div>
          </button>

          {/* TAB 3 */}
          <button
            onClick={() => handleTabChange('media')}
            className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start space-x-3.5 shadow-sm ${
              activeSection === 'media'
                ? 'bg-[#501214] text-white border-[#501214] ring-2 ring-[#C4A47C] shadow-md'
                : 'bg-white text-[#1A1A1A] border-gray-300 hover:bg-gray-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              activeSection === 'media' ? 'bg-[#C4A47C] text-[#501214]' : 'bg-gray-100 text-[#501214]'
            }`}>
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-80">Section 3</div>
              <div className="text-xs sm:text-sm font-black">Content &amp; Media Manager</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'media' ? 'text-gray-200' : 'text-gray-600'}`}>
                30s slide flyers &amp; hero images
              </div>
            </div>
          </button>

          {/* TAB 4 */}
          <button
            onClick={() => handleTabChange('roster')}
            className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start space-x-3.5 shadow-sm ${
              activeSection === 'roster'
                ? 'bg-[#501214] text-white border-[#501214] ring-2 ring-[#C4A47C] shadow-md'
                : 'bg-white text-[#1A1A1A] border-gray-300 hover:bg-gray-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              activeSection === 'roster' ? 'bg-[#C4A47C] text-[#501214]' : 'bg-gray-100 text-[#501214]'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-80">Section 4</div>
              <div className="text-xs sm:text-sm font-black">Member &amp; Dues Roster</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'roster' ? 'text-gray-200' : 'text-gray-600'}`}>
                Verify NetID, dues &amp; adjust points
              </div>
            </div>
          </button>

        </div>

        {/* ===================================================================== */}
        {/* SECTION 1: LIVE EVENT ATTENDANCE & QR CODE (FULL SCREEN PROJECTOR)   */}
        {/* ===================================================================== */}
        {activeSection === 'attendance' && (
          <div className="space-y-6">
            
            {/* Control Bar: Mode Toggle (Projector Mode vs Officer Camera Scanner) */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#501214] text-white rounded-xl">
                  <Tv className="w-5 h-5 text-[#C4A47C]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1A1A]">
                    Live Meeting Attendance System
                  </h3>
                  <p className="text-xs text-gray-700">
                    Switch between projector screen QR display for members or officer camera pass scanner.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setAttendanceMode('projector')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                    attendanceMode === 'projector'
                      ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-sm'
                      : 'bg-white text-[#1A1A1A] border-2 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Tv className="w-4 h-4 text-[#C4A47C]" />
                  <span>Projector Screen Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceMode('camera')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                    attendanceMode === 'camera'
                      ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-sm'
                      : 'bg-white text-[#1A1A1A] border-2 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Camera className="w-4 h-4 text-[#C4A47C]" />
                  <span>Officer Camera Scanner</span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: PROJECTOR DISPLAY MODE */}
            {attendanceMode === 'projector' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SETTINGS PANEL (1 Col) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-200 space-y-5">
                  <div className="border-b-2 border-gray-200 pb-3">
                    <h4 className="text-sm font-black text-[#1A1A1A]">Meeting &amp; Code Configuration</h4>
                    <p className="text-xs text-gray-600">Customize the active event and pass parameters.</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-black text-[#1A1A1A] mb-1">
                        Select Standard Event or Type Custom Name:
                      </label>
                      <select
                        value={eventName}
                        onChange={(e) => {
                          setEventName(e.target.value);
                          setCustomEvent('');
                        }}
                        className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-bold text-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="GBM #1: Fall Kickoff & Chapter Welcome">GBM #1: Fall Kickoff & Chapter Welcome</option>
                        <option value="GBM #2: National Convention Delegation & Career Prep">GBM #2: National Convention Delegation</option>
                        <option value="GBM #3: Industry Keynote & Dell Technologies Spotlight">GBM #3: Industry Keynote & Dell</option>
                        <option value="Tech Workshop: Git, GitHub & Technical Portfolio">Tech Workshop: Git & GitHub</option>
                        <option value="RLDC Leadership Academy & Resume Critique">RLDC Leadership Academy</option>
                        <option value="Intramural Athletics & Engineering Wellness Cup">Intramural Athletics & Wellness</option>
                        <option value="Study Night & Academic Familas">Study Night & Academic Familas</option>
                        <option value="Custom Event">-- Custom Meeting Name Below --</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-black text-[#1A1A1A] mb-1">
                        Custom Event Title (Optional override):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Spring 2026 Opening Banquet"
                        value={customEvent}
                        onChange={(e) => setCustomEvent(e.target.value)}
                        className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-bold text-[#1A1A1A] focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-black text-[#1A1A1A]">
                            Attendance Code:
                          </label>
                          {eventSyncStatus === 'saving' && (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin mr-1" />
                              Syncing...
                            </span>
                          )}
                          {eventSyncStatus === 'synced' && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center">
                              <Check className="w-2.5 h-2.5 mr-0.5" />
                              Active in DB
                            </span>
                          )}
                          {eventSyncStatus === 'idle' && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center">
                              <Radio className="w-2.5 h-2.5 mr-0.5 text-emerald-600 animate-pulse" />
                              Live in DB
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={attendanceCode}
                          onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                          className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-mono font-black text-[#501214] focus:outline-hidden uppercase"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-[#1A1A1A] mb-1">
                          Points Value:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={nominalPoints}
                          onChange={(e) => setNominalPoints(Number(e.target.value) || 10)}
                          className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-mono font-bold text-[#1A1A1A] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        type="button"
                        onClick={handleManualSyncEvent}
                        disabled={eventSyncStatus === 'saving'}
                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors text-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${eventSyncStatus === 'saving' ? 'animate-spin' : ''}`} />
                        <span>
                          {eventSyncStatus === 'saving'
                            ? 'Saving Active Code to Firestore...'
                            : 'Sync Event Code to Live Database'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors border border-gray-300"
                      >
                        {copyLinkSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copyLinkSuccess ? 'Check-In Link Copied!' : 'Copy Student Check-In Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsProjectorFullScreen(true)}
                        className="w-full py-3 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl font-black shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
                      >
                        <Maximize2 className="w-4 h-4 text-[#C4A47C]" />
                        <span>Launch Full-Screen Projector View</span>
                      </button>
                    </div>

                    {/* Live Attendee Counter for this Event */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-gray-600">Live Attendees Logged Today</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      </div>
                      <div className="text-2xl font-black text-[#501214]">
                        {liveTodayAttendeeCount} Bobcats
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Updates automatically as members submit the live attendance code or scan QR.
                      </p>
                    </div>

                  </div>
                </div>

                {/* PROJECTOR QR SCREEN PREVIEW (2 Cols) */}
                <div className="lg:col-span-2 bg-[#501214] text-white rounded-3xl p-8 sm:p-10 shadow-xl border-4 border-[#C4A47C] flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
                  
                  <div className="space-y-2 max-w-lg">
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white text-[#501214] rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Scan for Meeting Attendance &amp; Merit Points</span>
                    </span>

                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      {activeEventTitle}
                    </h2>
                    <p className="text-xs text-gray-200">
                      Open your phone camera, scan the QR code below, or visit{' '}
                      <strong className="text-[#C4A47C] font-mono">{typeof window !== 'undefined' ? `${window.location.host}/check-in` : '/check-in'}</strong>
                    </p>
                  </div>

                  {/* High Resolution QR Code */}
                  <div className="p-5 bg-white rounded-3xl shadow-2xl border-4 border-[#C4A47C]">
                    <QRCodeSVG
                      value={checkInUrl}
                      size={240}
                      level="H"
                      fgColor="#501214"
                      bgColor="#FFFFFF"
                      includeMargin={true}
                    />
                  </div>

                  {/* Prominent Alphanumeric Attendance Code Display */}
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-3.5 border-2 border-[#C4A47C] text-center space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#C4A47C] block">
                      Meeting Alphanumeric Attendance Code:
                    </span>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-widest">
                      {attendanceCode}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                    <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white/10 rounded-xl border border-white/20 font-bold">
                      <Award className="w-4 h-4 text-[#C4A47C]" />
                      <span>Award: +{nominalPoints} Points</span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-700 rounded-xl font-bold text-white shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>{liveTodayAttendeeCount} Logged Today</span>
                    </span>
                  </div>

                </div>

              </div>
            )}

            {/* SUB-VIEW 2: EMBEDDED OFFICER CAMERA SCANNER */}
            {attendanceMode === 'camera' && (
              <div className="space-y-4">
                <AdminScanner />
              </div>
            )}

            {/* FULL-SCREEN PROJECTOR MODAL OVERLAY */}
            {isProjectorFullScreen && (
              <div className="fixed inset-0 z-50 bg-[#501214] text-white flex flex-col items-center justify-between p-6 sm:p-12 animate-fade-in overflow-y-auto">
                {/* Header */}
                <div className="w-full flex items-center justify-between pb-4 border-b border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-[#501214] flex items-center justify-center font-black">
                      SHPE
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Texas State University Chapter</h3>
                      <p className="text-xs text-[#C4A47C] font-bold">Projector Attendance Station</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsProjectorFullScreen(false)}
                    className="px-4 py-2 bg-white text-[#501214] hover:bg-gray-100 rounded-xl font-black text-xs flex items-center space-x-1.5 shadow-md"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>Exit Full Screen (ESC)</span>
                  </button>
                </div>

                {/* Center Content */}
                <div className="flex flex-col items-center justify-center text-center space-y-6 my-auto py-8">
                  <div className="space-y-2">
                    <span className="inline-block px-4 py-1.5 bg-[#C4A47C] text-[#501214] rounded-full text-xs font-black uppercase tracking-wider shadow-md">
                      Scan Phone Camera for Event Check-In
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white max-w-3xl">
                      {activeEventTitle}
                    </h1>
                  </div>

                  <div className="p-6 bg-white rounded-3xl shadow-2xl border-8 border-[#C4A47C]">
                    <QRCodeSVG
                      value={checkInUrl}
                      size={320}
                      level="H"
                      fgColor="#501214"
                      bgColor="#FFFFFF"
                      includeMargin={true}
                    />
                  </div>

                  {/* Alphanumeric Code */}
                  <div className="bg-black/60 rounded-3xl px-8 py-4 border-2 border-[#C4A47C] space-y-1">
                    <span className="text-xs uppercase font-black tracking-widest text-[#C4A47C] block">
                      Attendance Code:
                    </span>
                    <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-widest">
                      {attendanceCode}
                    </div>
                  </div>

                  <p className="text-sm text-gray-200">
                    Visit <strong className="text-[#C4A47C] font-mono text-base">{window.location.host}/check-in</strong> to submit attendance manually.
                  </p>
                </div>

                {/* Footer Bar */}
                <div className="w-full flex items-center justify-between pt-4 border-t border-white/20 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live Attendance Stream Active</span>
                  </div>
                  <div className="font-black text-[#C4A47C] text-sm">
                    {liveTodayAttendeeCount} Bobcats Checked In
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ===================================================================== */}
        {/* SECTION 2: ANALYTICS & EXPORT                                         */}
        {/* ===================================================================== */}
        {activeSection === 'analytics' && (
          <div className="space-y-6">
            <AdminAnalytics />
          </div>
        )}

        {/* ===================================================================== */}
        {/* SECTION 3: CONTENT & MEDIA MANAGER                                    */}
        {/* ===================================================================== */}
        {activeSection === 'media' && (
          <div className="space-y-6">
            <AdminImageManagement />
          </div>
        )}

        {/* ===================================================================== */}
        {/* SECTION 4: MEMBER & DUES ROSTER                                       */}
        {/* ===================================================================== */}
        {activeSection === 'roster' && (
          <div className="space-y-6">
            
            {/* Command Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#1A1A1A] flex items-center space-x-2">
                  <Users className="w-5 h-5 text-[#501214]" />
                  <span>Member Dues Verification &amp; Points Roster</span>
                </h3>
                <p className="text-xs text-gray-700">
                  Manage Texas State NetID verifications, override dues status, and manually adjust member merit point balances.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExportRosterCsv}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Roster CSV</span>
                </button>
              </div>
            </div>

            {rosterActionMessage && (
              <div className="p-3 bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs animate-scale-up">
                {rosterActionMessage}
              </div>
            )}

            {/* Filters & Search */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-200 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search registered members by name, NetID, or email..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-bold text-[#1A1A1A] focus:bg-white focus:border-[#501214] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={rosterFilter}
                  onChange={(e) => setRosterFilter(e.target.value as 'all' | 'paid' | 'unpaid' | 'officer')}
                  className="p-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-black text-[#1A1A1A] focus:bg-white focus:outline-hidden"
                >
                  <option value="all">All Members ({rosterUsers.length})</option>
                  <option value="paid">Paid Members Only</option>
                  <option value="unpaid">Unpaid Students Only</option>
                  <option value="officer">Officers Only</option>
                </select>
              </div>
            </div>

            {/* Roster Table */}
            <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#501214] text-white text-[11px] uppercase font-black tracking-wider">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">NetID</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">NetID Verification</th>
                      <th className="py-3 px-4">Chapter Dues</th>
                      <th className="py-3 px-4">Merit Points</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loadingRoster ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs font-bold text-gray-500">
                          Loading member roster...
                        </td>
                      </tr>
                    ) : filteredRosterUsers.length > 0 ? (
                      filteredRosterUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-black text-[#1A1A1A] whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span>{u.fullName || u.displayName || 'No Name'}</span>
                              {u.role === 'officer' && (
                                <span className="px-1.5 py-0.5 bg-[#C4A47C] text-[#501214] text-[9px] font-black rounded uppercase">
                                  Officer
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-700">
                            {u.netid || u.studentId || '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 truncate max-w-xs font-medium">
                            {u.email}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {u.isNetIDVerified || u.txstateVerified ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700 mr-1" />
                                  Verified
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAdminVerifyNetId(u.uid, false)}
                                  className="text-[10px] text-gray-500 hover:text-red-700 underline font-bold"
                                >
                                  Revoke
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAdminVerifyNetId(u.uid, true)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black shadow-xs transition-colors"
                              >
                                Verify NetID
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {u.isPaidMember ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Paid Member
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                                Unpaid / Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleAdminAdjustPoints(u.uid, (u.meritPoints || 0) - 1)}
                                className="w-6 h-6 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded font-black text-xs border border-gray-300 flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-mono font-black text-[#501214]">
                                {u.meritPoints || 0}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdminAdjustPoints(u.uid, (u.meritPoints || 0) + 1)}
                                className="w-6 h-6 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded font-black text-xs border border-gray-300 flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleAdminVerifyDues(u.uid, !u.isPaidMember)}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition-colors ${
                                u.isPaidMember
                                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                                  : 'bg-[#501214] text-white hover:bg-[#420f11] shadow-xs'
                              }`}
                            >
                              {u.isPaidMember ? 'Revoke Paid' : 'Verify Paid'}
                            </button>

                            {u.role !== 'officer' ? (
                              <button
                                type="button"
                                onClick={() => handleAdminRole(u.uid, 'officer')}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold border border-gray-300"
                              >
                                Make Officer
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAdminRole(u.uid, 'member')}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold border border-gray-300"
                              >
                                Demote
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 px-4 text-center text-xs text-gray-500 font-bold">
                          No members found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default AdminHub;
