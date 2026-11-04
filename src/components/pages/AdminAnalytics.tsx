import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  Search, 
  Clock, 
  Shield, 
  Plus, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  UserCheck, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar, 
  Layers, 
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { 
  AttendanceLogRecord, 
  EventAnalyticsSummary, 
  subscribeAttendanceLogs, 
  recordAttendanceLog, 
  deleteAttendanceLog, 
  downloadAttendanceLogsCsv, 
  copyLogsForGoogleSheets, 
  computeEventAnalytics
} from '../../services/attendanceService';
import { 
  subscribeAttendanceHistory, 
  subscribeEvents, 
  calculateDynamicAnalytics, 
  AttendanceHistoryRecord, 
  ChapterEvent 
} from '../../services/eventAttendanceService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile } from '../../context/auth-context-def';

export const AdminAnalytics: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [logs, setLogs] = useState<AttendanceLogRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [eventsList, setEventsList] = useState<ChapterEvent[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Active View Tab: 'events' | 'comparison' | 'all_logs'
  const [activeTab, setActiveTab] = useState<'events' | 'comparison' | 'all_logs'>('events');

  // Selected event for deep dive demographic analysis
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  // Filters for historical table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active_member' | 'guest_visitor'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Delete confirmation state (no window.confirm)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Manual Check-in modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualNetId, setManualNetId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualEvent, setManualEvent] = useState('GBM #2: National Convention Delegation & Career Prep');
  const [manualPoints, setManualPoints] = useState('10');
  const [manualIsActive, setManualIsActive] = useState(true);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  // Copy feedback
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Subscribe to live Firestore collections: attendanceLogs, attendanceHistory, events, users
  useEffect(() => {
    let isMounted = true;
    setLoadingLogs(true);

    // 1. Subscribe to live attendanceLogs
    const unsubLogs = subscribeAttendanceLogs(
      (data) => {
        if (!isMounted) return;
        setLogs(data);
        setLoadingLogs(false);
        setLogsError(null);
      },
      (err) => {
        if (!isMounted) return;
        console.warn('Attendance logs subscription warning:', err);
        setLogsError(err instanceof Error ? err.message : 'Notice while syncing attendance records.');
        setLoadingLogs(false);
      }
    );

    // 2. Subscribe to live attendanceHistory collection
    const unsubHistory = subscribeAttendanceHistory(
      (hData) => {
        if (!isMounted) return;
        setHistoryRecords(hData);
      },
      (err) => {
        console.warn('Attendance history subscription notice:', err);
      }
    );

    // 3. Subscribe to live events collection
    const unsubEvents = subscribeEvents(
      (eData) => {
        if (!isMounted) return;
        setEventsList(eData);
      },
      (err) => {
        console.warn('Events collection subscription notice:', err);
      }
    );

    // 4. Subscribe to live registered users collection for conversion tracking
    const usersColl = collection(db, 'users');
    const unsubUsers = onSnapshot(
      usersColl,
      (snapshot) => {
        if (!isMounted) return;
        const uList: UserProfile[] = [];
        snapshot.forEach((d) => {
          uList.push({ ...(d.data() as UserProfile), uid: d.id });
        });
        setUsersList(uList);
      },
      (err) => {
        console.warn('Users list notice for analytics:', err);
      }
    );

    return () => {
      isMounted = false;
      unsubLogs();
      unsubHistory();
      unsubEvents();
      unsubUsers();
    };
  }, [reloadTrigger]);

  // Merge logs and historyRecords into a deduplicated list of records
  const unifiedLogs: AttendanceLogRecord[] = useMemo(() => {
    const list: AttendanceLogRecord[] = [...logs];
    const existingIds = new Set(logs.map((l) => l.id));

    historyRecords.forEach((h) => {
      if (!existingIds.has(h.id)) {
        list.push({
          id: h.id,
          userId: h.userId,
          memberName: h.memberName,
          netid: h.netId || h.netid || '',
          email: h.email,
          eventName: h.eventName,
          pointsAwarded: Number(h.pointsEarned ?? h.pointsAwarded ?? 0),
          memberStatus: h.memberStatus,
          timestamp: h.timestamp,
          date: h.date,
          arrivalTime: h.arrivalTime,
          scannedBy: h.scannedBy,
        });
        existingIds.add(h.id);
      }
    });

    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [logs, historyRecords]);

  // Compute Event Analytics Summaries strictly from live unified Firestore attendance logs
  const eventSummaries: EventAnalyticsSummary[] = useMemo(() => {
    return computeEventAnalytics(unifiedLogs, usersList);
  }, [unifiedLogs, usersList]);

  // Target event for demographic deep dive
  const activeEventSummary = useMemo(() => {
    if (eventSummaries.length === 0) return null;
    if (selectedEventId === 'all') return eventSummaries[0];
    return eventSummaries.find((s) => `${s.date}___${s.eventName}` === selectedEventId) || eventSummaries[0];
  }, [eventSummaries, selectedEventId]);

  // Calculate live dynamic chapter metrics (strictly from live collections, zero random/mock values)
  const liveKpiMetrics = useMemo(() => {
    const combinedHistoryRecords: AttendanceHistoryRecord[] = unifiedLogs.map((l) => ({
      id: l.id,
      userId: l.userId,
      netId: l.netid,
      memberName: l.memberName,
      email: l.email,
      eventId: `event_${(l.eventName || 'meeting').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      eventName: l.eventName,
      pointsEarned: l.pointsAwarded,
      memberStatus: l.memberStatus,
      timestamp: l.timestamp,
      date: l.date,
      arrivalTime: l.arrivalTime,
      scannedBy: l.scannedBy,
    }));

    return calculateDynamicAnalytics(combinedHistoryRecords, usersList, eventsList);
  }, [unifiedLogs, usersList, eventsList]);

  // Overall Chapter Key Metrics
  const chapterMetrics = useMemo(() => {
    return {
      totalAttendees: liveKpiMetrics.totalAttendees,
      activeMembersCount: liveKpiMetrics.activeMembersCount,
      guestCount: liveKpiMetrics.guestCount,
      avgRetentionRate: liveKpiMetrics.retentionRatePct,
      usersWithMultipleCheckins: liveKpiMetrics.usersWithMultipleCheckins,
      uniqueAttendeesCount: liveKpiMetrics.uniqueAttendeesCount,
      avgAttendancePerEvent: liveKpiMetrics.avgAttendancePerEvent,
      overallConversionRate: liveKpiMetrics.overallConversionRatePct,
      totalConvertedGuests: liveKpiMetrics.totalConvertedGuests,
      totalGuestsObserved: liveKpiMetrics.totalGuestsObserved,
      totalNewMembers: usersList.length,
      totalEventsTracked: Math.max(eventSummaries.length, liveKpiMetrics.totalEventsTracked),
    };
  }, [liveKpiMetrics, eventSummaries.length, usersList.length]);

  // Unique event names for filter
  const uniqueEventNames = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.eventName) set.add(l.eventName);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered logs for Master Historical Table
  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter((log) => {
      // Search
      const searchLower = searchQuery.toLowerCase().trim();
      if (searchLower) {
        const matches = 
          log.memberName.toLowerCase().includes(searchLower) ||
          log.netid.toLowerCase().includes(searchLower) ||
          log.email.toLowerCase().includes(searchLower) ||
          log.eventName.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      // Event filter
      if (selectedEventFilter !== 'all' && log.eventName !== selectedEventFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && log.memberStatus !== selectedStatusFilter) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const logDate = new Date(log.timestamp);
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateRangeFilter === 'today' && diffDays > 1) return false;
        if (dateRangeFilter === '7days' && diffDays > 7) return false;
        if (dateRangeFilter === '30days' && diffDays > 30) return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedEventFilter, selectedStatusFilter, dateRangeFilter]);

  // Real-time Firestore Refresh
  const handleRefreshFirestore = () => {
    setIsSyncingFirestore(true);
    setLoadingLogs(true);
    setSyncFeedback('Refreshing attendance logs directly from live Firestore...');
    setReloadTrigger((v) => v + 1);
    setTimeout(() => {
      setIsSyncingFirestore(false);
      setSyncFeedback(null);
    }, 1200);
  };

  // Export handler
  const handleExportCsv = () => {
    downloadAttendanceLogsCsv(filteredLogs, 'SHPE_TXST_Event_Analytics_Report', eventSummaries);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Copy handler
  const handleCopyForSheets = async () => {
    const success = await copyLogsForGoogleSheets(filteredLogs);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteAttendanceLog(logId);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete log error:', err);
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualNetId.trim()) {
      setManualMessage('Please enter student name and NetID.');
      return;
    }

    setIsSubmittingManual(true);
    setManualMessage(null);

    try {
      const res = await recordAttendanceLog({
        userId: 'manual_entry',
        memberName: manualName.trim(),
        netid: manualNetId.trim().toLowerCase(),
        email: manualEmail.trim() || `${manualNetId.trim().toLowerCase()}@txstate.edu`,
        eventName: manualEvent.trim(),
        nominalPoints: Number(manualPoints) || 10,
        isActiveMember: manualIsActive,
        scannedBy: user?.email || 'shpetxst@gmail.com',
      });

      // Immediate UI update
      setLogs((prev) => [res.logRecord, ...prev]);
      setManualMessage(res.statusMessage);
      setTimeout(() => {
        setIsManualModalOpen(false);
        setManualMessage(null);
        setManualName('');
        setManualNetId('');
        setManualEmail('');
      }, 1400);
    } catch (err) {
      console.error('Manual check-in error:', err);
      setManualMessage(err instanceof Error ? err.message : 'Failed to record check-in.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-2 border-[#501214] space-y-4">
          <div className="w-16 h-16 bg-[#501214] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-[#1A1A1A]">Verifying Admin Credentials...</h2>
          <p className="text-xs text-gray-700">
            Establishing secure connection to chapter attendance records & Firestore databases.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-2 border-[#501214] space-y-4">
          <div className="w-16 h-16 bg-[#501214] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#1A1A1A]">Administrator Access Required</h2>
          <p className="text-xs text-gray-700">
            Attendance logs, timestamps, and demographic conversion metrics are restricted to executive chapter administrators (<strong className="text-[#501214]">shpetxst@gmail.com</strong>).
          </p>
          <div className="pt-2">
            <Link
              to="/profile"
              className="inline-block px-5 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              Go to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* TOP COMMAND HEADER */}
        <div className="bg-white rounded-3xl shadow-md border-2 border-gray-200 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#501214] text-white rounded-lg text-xs font-black shadow-xs">
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>Admin Authority: shpetxst@gmail.com</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#1A1A1A] text-white rounded-lg text-xs font-black shadow-xs">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Firestore: {loadingLogs ? 'Syncing...' : `${logs.length} Check-Ins Synced`}</span>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A] tracking-tight">
              Time Logs, Attendance & Conversion Analytics
            </h1>
            <p className="text-xs sm:text-sm text-gray-700 max-w-2xl leading-relaxed">
              Real-time check-in timestamps, member vs. guest demographic ratios, meeting-to-meeting attendance comparisons, and club dues conversion metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Populate / Re-sync to live Firestore */}
            {/* Refresh Live Firestore Data */}
            <button
              onClick={handleRefreshFirestore}
              disabled={isSyncingFirestore}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-black transition-all shadow-sm disabled:opacity-50"
              title="Refresh attendance records directly from live Firestore"
            >
              <Database className={`w-3.5 h-3.5 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirestore ? 'Syncing...' : 'Refresh Live Data'}</span>
            </button>

            {/* Quick Launch QR Scanner */}
            <Link
              to="/admin/scanner"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-black transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[#501214]" />
              <span>QR Scanner</span>
            </Link>

            {/* Manual Check-in Button */}
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white text-[#501214] hover:bg-gray-100 border-2 border-[#501214] rounded-xl text-xs font-black transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual Check-In</span>
            </button>

            {/* PROMINENT EXPORT TO EXCEL/CSV BUTTON */}
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Report Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Event Analytics to Excel/CSV</span>
                </>
              )}
            </button>

            {/* Copy for Google Sheets */}
            <button
              onClick={handleCopyForSheets}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-black transition-all shadow-xs"
              title="Copy tab-separated values to paste into Google Sheets"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-600" />
                  <span>Google Sheets</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SYNC FEEDBACK BANNER */}
        {syncFeedback && (
          <div className="p-4 bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{syncFeedback}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="px-2 py-0.5 bg-black/20 hover:bg-black/40 rounded text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 5 KEY METRIC CARDS - CRISP SOLID CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Event Attendees */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">Total Check-Ins</span>
              <div className="w-8 h-8 rounded-xl bg-[#501214] text-white flex items-center justify-center shadow-xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                {chapterMetrics.totalAttendees}
              </div>
              <p className="text-[11px] text-gray-700 mt-0.5 font-bold">
                {chapterMetrics.totalAttendees > 0
                  ? `Across ${chapterMetrics.totalEventsTracked} meetings`
                  : 'No data recorded yet'}
              </p>
            </div>
          </div>

          {/* Card 2: Chapter Retention Rate */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">Retention Rate</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight flex items-baseline space-x-1">
                <span>{chapterMetrics.avgRetentionRate}%</span>
                <span className="text-[11px] font-bold text-gray-700">rate</span>
              </div>
              <p className="text-[11px] text-gray-700 mt-0.5 font-bold">
                {chapterMetrics.uniqueAttendeesCount > 0
                  ? `${chapterMetrics.usersWithMultipleCheckins}/${chapterMetrics.uniqueAttendeesCount} with ≥2 check-ins`
                  : 'No data recorded yet'}
              </p>
            </div>
          </div>

          {/* Card 3: Average Attendance per Event */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">Avg Attendance</span>
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                {chapterMetrics.avgAttendancePerEvent}
              </div>
              <p className="text-[11px] text-gray-700 mt-0.5 font-bold">
                {chapterMetrics.totalAttendees > 0
                  ? 'Average attendees per event'
                  : 'No data recorded yet'}
              </p>
            </div>
          </div>

          {/* Card 4: Total Members vs. Non-Members */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">Members vs Guests</span>
              <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                {chapterMetrics.activeMembersCount} / {chapterMetrics.guestCount}
              </div>
              <p className="text-[11px] text-gray-700 mt-0.5 font-bold">
                {chapterMetrics.totalAttendees > 0
                  ? `${chapterMetrics.activeMembersCount} members, ${chapterMetrics.guestCount} guests`
                  : 'No data recorded yet'}
              </p>
            </div>
          </div>

          {/* Card 5: Chapter Dues & Membership Conversion Rate */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">Conversion Rate</span>
              <div className="w-8 h-8 rounded-xl bg-[#501214] text-white flex items-center justify-center shadow-xs">
                <UserCheck className="w-4 h-4 text-amber-300" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#501214] tracking-tight">
                {chapterMetrics.overallConversionRate}%
              </div>
              <p className="text-[11px] text-gray-700 mt-0.5 font-bold">
                {chapterMetrics.totalGuestsObserved > 0
                  ? `${chapterMetrics.totalConvertedGuests}/${chapterMetrics.totalGuestsObserved} guests converted`
                  : 'No data recorded yet'}
              </p>
            </div>
          </div>
        </div>

        {/* ERROR / NOTICE BANNER */}
        {logsError && (
          <div className="p-4 bg-amber-100 rounded-2xl border-2 border-amber-300 flex items-center justify-between text-amber-950 text-xs font-bold">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{logsError}</span>
            </div>
            <button
              onClick={() => setReloadTrigger((v) => v + 1)}
              className="px-3 py-1 bg-amber-300 hover:bg-amber-400 text-amber-950 rounded-lg font-black"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* NAVIGATION TABS - SOLID COLORS (NO FADED PASTELS) */}
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-gray-300 pb-3">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'events'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>Event Demographics & Check-In Roster</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'comparison'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Meeting-to-Meeting & Conversion Trends</span>
          </button>

          <button
            onClick={() => setActiveTab('all_logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'all_logs'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Master Historical Event Log ({filteredLogs.length})</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: EVENT DEMOGRAPHICS & CHECK-IN ROSTER                     */}
        {/* ============================================================== */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Event Selector Ribbon */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <Calendar className="w-5 h-5 text-[#501214] shrink-0" />
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Select Meeting or Event for Demographic Breakdown:
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="mt-1 w-full md:w-96 text-xs font-extrabold text-[#1A1A1A] bg-white border-2 border-gray-300 rounded-xl p-2.5 focus:border-[#501214] focus:outline-hidden"
                  >
                    {eventSummaries.length > 0 ? (
                      eventSummaries.map((ev) => (
                        <option key={`${ev.date}___${ev.eventName}`} value={`${ev.date}___${ev.eventName}`}>
                          {ev.date} — {ev.eventName} ({ev.totalAttendees} attendees)
                        </option>
                      ))
                    ) : (
                      <option value="none">No attendance check-ins recorded yet</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <span className="text-xs text-gray-700">
                  Average Check-in Time:{' '}
                  <strong className="text-[#1A1A1A] font-black">
                    {activeEventSummary?.averageCheckInTime && activeEventSummary.averageCheckInTime !== 'N/A'
                      ? activeEventSummary.averageCheckInTime
                      : 'No data recorded yet'}
                  </strong>
                </span>
              </div>
            </div>

            {activeEventSummary ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* DEMOGRAPHIC VISUALIZATION CARD (SVG DONUT / PIE CHART) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-[#1A1A1A] flex items-center space-x-1.5">
                        <PieChartIcon className="w-4 h-4 text-[#501214]" />
                        <span>Member vs. Non-Member Ratio</span>
                      </h3>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-[#1A1A1A] text-white rounded">
                        {activeEventSummary.date}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 mb-6 font-medium">
                      Demographic composition for <strong className="text-[#1A1A1A] font-black">{activeEventSummary.eventName}</strong>.
                    </p>

                    {/* Interactive SVG Donut Chart */}
                    <div className="relative flex items-center justify-center my-4">
                      <svg viewBox="0 0 100 100" className="w-48 h-48 transform -rotate-90">
                        {/* Background track */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#E5E7EB"
                          strokeWidth="14"
                        />
                        {/* Active Member Arc (Solid Deep Maroon #501214) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#501214"
                          strokeWidth="14"
                          strokeDasharray={`${(activeEventSummary.memberRatioPct / 100) * 238.76} 238.76`}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                        {/* Non-Member Guest Arc (Solid Gold/Amber #D97706) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#D97706"
                          strokeWidth="14"
                          strokeDasharray={`${(activeEventSummary.guestRatioPct / 100) * 238.76} 238.76`}
                          strokeDashoffset={`-${(activeEventSummary.memberRatioPct / 100) * 238.76}`}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>

                      {/* Donut Center Display */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-black text-[#1A1A1A]">{activeEventSummary.totalAttendees}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Attendees</span>
                      </div>
                    </div>

                    {/* Legend & Ratio Breakdown */}
                    <div className="space-y-3 pt-4 border-t-2 border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3.5 h-3.5 rounded bg-[#501214]" />
                          <span className="font-black text-[#1A1A1A]">Active Paid Members</span>
                        </div>
                        <span className="font-black text-[#501214]">
                          {activeEventSummary.activeMembers} ({activeEventSummary.memberRatioPct}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3.5 h-3.5 rounded bg-amber-600" />
                          <span className="font-black text-[#1A1A1A]">Non-Member Guests</span>
                        </div>
                        <span className="font-black text-amber-700">
                          {activeEventSummary.guestVisitors} ({activeEventSummary.guestRatioPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conversion Result Card */}
                  {activeEventSummary.conversion && (
                    <div className="mt-6 p-4 bg-white rounded-2xl border-2 border-[#501214] shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-[#501214]">Club Conversion Metric</span>
                        <span className="text-xs font-black px-2 py-0.5 bg-[#501214] text-white rounded">
                          {activeEventSummary.conversion.conversionRatePct}% Converted
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed font-medium">
                        <strong>{activeEventSummary.conversion.subsequentlyConvertedCount}</strong> out of{' '}
                        <strong>{activeEventSummary.conversion.totalGuestsAtEvent}</strong> guest attendees became active members.
                      </p>
                      {activeEventSummary.conversion.convertedNames.length > 0 && (
                        <div className="mt-2 text-[11px] text-[#501214] font-mono font-bold">
                          Converted: {activeEventSummary.conversion.convertedNames.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ATTENDEE LIST FOR THIS EVENT */}
                <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 p-6 lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <div>
                        <h3 className="text-base font-black text-[#1A1A1A]">
                          Meeting Attendee Roster & Exact Check-In Timestamps
                        </h3>
                        <p className="text-xs text-gray-700">
                          Exact timestamps for {activeEventSummary.eventName} ({activeEventSummary.attendees.length} checked-in)
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs">
                        {activeEventSummary.pointsDistributed} Points Credited
                      </span>
                    </div>

                    <div className="overflow-x-auto border-2 border-gray-200 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#501214] text-white text-[11px] uppercase font-black tracking-wider">
                            <th className="py-3 px-3">Arrival Time</th>
                            <th className="py-3 px-3">Full Name</th>
                            <th className="py-3 px-3">NetID</th>
                            <th className="py-3 px-3">Email</th>
                            <th className="py-3 px-3">Membership Status</th>
                            <th className="py-3 px-3 text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {activeEventSummary.attendees.map((attendee) => (
                            <tr key={attendee.id} className="hover:bg-gray-100 transition-colors">
                              <td className="py-3 px-3 font-mono font-black text-[#1A1A1A] whitespace-nowrap">
                                <span className="inline-flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5 text-[#501214]" />
                                  <span>{attendee.arrivalTime}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 font-black text-[#1A1A1A]">
                                {attendee.memberName}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-gray-700">
                                {attendee.netid}
                              </td>
                              <td className="py-3 px-3 text-gray-600 truncate max-w-xs">
                                {attendee.email}
                              </td>
                              <td className="py-3 px-3">
                                {attendee.memberStatus === 'active_member' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#501214] text-white shadow-2xs">
                                    Active Member
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-600 text-white shadow-2xs">
                                    Guest / Non-Member
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-[#1A1A1A]">
                                {attendee.pointsAwarded > 0 ? `+${attendee.pointsAwarded}` : '0'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-gray-200 space-y-3">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center text-[#501214]">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-[#1A1A1A]">No attendance recorded yet for this event</h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto">
                  When members and guests check in using the meeting QR pass or are scanned by chapter officers, real live statistics and demographic charts will render here automatically.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setIsManualModalOpen(true)}
                    className="px-4 py-2 bg-[#501214] text-white rounded-xl text-xs font-black shadow-xs"
                  >
                    Record Manual Check-In
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MEETING COMPARISON & CONVERSION TRENDS                   */}
        {/* ============================================================== */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            
            {/* SIDE-BY-SIDE ATTENDANCE BAR CHART */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-gray-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-gray-200 pb-4">
                <div>
                  <h3 className="text-base font-black text-[#1A1A1A] flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-[#501214]" />
                    <span>Meeting-to-Meeting Attendance Comparison</span>
                  </h3>
                  <p className="text-xs text-gray-700">
                    Side-by-side growth and attendance trajectory across the Fall 2026 semester.
                  </p>
                </div>
                <div className="flex items-center space-x-4 text-xs font-black">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-[#501214]" />
                    <span>Active Members</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-amber-600" />
                    <span>Guests / Non-Members</span>
                  </div>
                </div>
              </div>

              {/* Side-by-side Bar Chart */}
              <div className="space-y-4 pt-2">
                {eventSummaries.length > 0 ? (
                  eventSummaries.map((summary) => {
                    const maxPossible = 30;
                    const memberWidth = Math.min(100, (summary.activeMembers / maxPossible) * 100);
                    const guestWidth = Math.min(100, (summary.guestVisitors / maxPossible) * 100);

                    return (
                      <div key={`${summary.date}_${summary.eventName}`} className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                          <div className="font-black text-[#1A1A1A] flex items-center space-x-2">
                            <span className="font-mono text-gray-600">{summary.date}</span>
                            <span>—</span>
                            <span className="truncate max-w-md">{summary.eventName}</span>
                          </div>

                          <div className="flex items-center space-x-3 text-xs">
                            <span className="font-black text-[#1A1A1A]">{summary.totalAttendees} Total Attendees</span>
                            {summary.previousMeetingDelta && (
                              <span className={`inline-flex items-center text-[11px] font-black px-2 py-0.5 rounded ${
                                summary.previousMeetingDelta.diffCount >= 0
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-red-700 text-white'
                              }`}>
                                {summary.previousMeetingDelta.diffCount >= 0 ? '+' : ''}
                                {summary.previousMeetingDelta.diffCount} ({summary.previousMeetingDelta.diffPct}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stacked / Dual Bar */}
                        <div className="h-6 w-full bg-gray-200 rounded-xl overflow-hidden flex shadow-inner">
                          <div 
                            className="bg-[#501214] h-full flex items-center justify-end pr-2 text-white text-[10px] font-black transition-all duration-700"
                            style={{ width: `${memberWidth}%` }}
                            title={`Active Members: ${summary.activeMembers}`}
                          >
                            {summary.activeMembers > 0 && summary.activeMembers}
                          </div>
                          <div 
                            className="bg-amber-600 h-full flex items-center justify-end pr-2 text-white text-[10px] font-black transition-all duration-700"
                            style={{ width: `${guestWidth}%` }}
                            title={`Guests: ${summary.guestVisitors}`}
                          >
                            {summary.guestVisitors > 0 && summary.guestVisitors}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 space-y-2">
                    <BarChart3 className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-xs font-bold text-gray-700">No data recorded yet</p>
                    <p className="text-[11px] text-gray-500">Live attendance check-ins will automatically populate the meeting-to-meeting comparison bar charts.</p>
                  </div>
                )}
              </div>
            </div>

            {/* CONVERSION METRICS & FUNNEL CARD */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-gray-200 space-y-6">
              <div className="border-b-2 border-gray-200 pb-4">
                <h3 className="text-base font-black text-[#1A1A1A] flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-[#501214]" />
                  <span>Chapter Dues & Membership Conversion Analysis</span>
                </h3>
                <p className="text-xs text-gray-700">
                  Detailed analysis tracking non-member guests who attended a meeting and later converted into official paid chapter members.
                </p>
              </div>

              <div className="overflow-x-auto border-2 border-gray-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#501214] text-white text-[11px] uppercase font-black tracking-wider">
                      <th className="py-3 px-3">Meeting / Event</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-center">Total Attendees</th>
                      <th className="py-3 px-3 text-center">Guest Count</th>
                      <th className="py-3 px-3 text-center">Converted to Members</th>
                      <th className="py-3 px-3 text-center">Conversion Rate</th>
                      <th className="py-3 px-3">Converted Students</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {eventSummaries.length > 0 ? (
                      eventSummaries.map((s) => (
                        <tr key={s.eventName + s.date} className="hover:bg-gray-100 transition-colors">
                          <td className="py-3 px-3 font-black text-[#1A1A1A]">{s.eventName}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-700">{s.date}</td>
                          <td className="py-3 px-3 text-center font-black text-[#1A1A1A]">{s.totalAttendees}</td>
                          <td className="py-3 px-3 text-center font-black text-amber-700">{s.guestVisitors}</td>
                          <td className="py-3 px-3 text-center font-black text-emerald-800">
                            {s.conversion?.subsequentlyConvertedCount || 0}
                          </td>
                          <td className="py-3 px-3 text-center font-black">
                            <span className="px-2 py-0.5 bg-[#501214] text-white rounded text-[11px]">
                              {s.conversion?.conversionRatePct || 0}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-800 font-medium">
                            {s.conversion?.convertedNames.length ? s.conversion.convertedNames.join(', ') : 'None yet'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs font-bold text-gray-500">
                          No data recorded yet — Guest check-ins and conversion rates will appear here in real-time.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MASTER HISTORICAL SEARCHABLE LOG TABLE                   */}
        {/* ============================================================== */}
        {activeTab === 'all_logs' && (
          <div className="space-y-6">
            
            {/* SEARCH AND FILTER BAR */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, netid, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold focus:border-[#501214]"
                  />
                </div>

                {/* Event Filter */}
                <div>
                  <select
                    value={selectedEventFilter}
                    onChange={(e) => setSelectedEventFilter(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold focus:border-[#501214]"
                  >
                    <option value="all">All Events ({uniqueEventNames.length})</option>
                    {uniqueEventNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value as 'all' | 'active_member' | 'guest_visitor')}
                    className="w-full py-2.5 px-3 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold focus:border-[#501214]"
                  >
                    <option value="all">All Membership Statuses</option>
                    <option value="active_member">Active Members Only</option>
                    <option value="guest_visitor">Guests / Non-Members Only</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value as 'all' | 'today' | '7days' | '30days')}
                    className="w-full py-2.5 px-3 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold focus:border-[#501214]"
                  >
                    <option value="all">All Dates & History</option>
                    <option value="today">Today Only</option>
                    <option value="7days">Past 7 Days</option>
                    <option value="30days">Past 30 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-700 pt-2 border-t border-gray-200">
                <span className="font-bold">
                  Showing <strong className="text-[#1A1A1A]">{filteredLogs.length}</strong> of {logs.length} attendance records
                </span>

                {(searchQuery || selectedEventFilter !== 'all' || selectedStatusFilter !== 'all' || dateRangeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedEventFilter('all');
                      setSelectedStatusFilter('all');
                      setDateRangeFilter('all');
                    }}
                    className="text-[#501214] font-black hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* MASTER TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#501214] text-white text-[11px] uppercase font-black tracking-wider">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Arrival Time</th>
                      <th className="py-3 px-3">Full Name</th>
                      <th className="py-3 px-3">NetID</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Meeting / Event</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Points</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-100 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-gray-700 whitespace-nowrap">
                            {log.date}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-[#1A1A1A] whitespace-nowrap">
                            {log.arrivalTime}
                          </td>
                          <td className="py-3 px-3 font-black text-[#1A1A1A]">{log.memberName}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-700">{log.netid}</td>
                          <td className="py-3 px-3 text-gray-600 truncate max-w-xs">{log.email}</td>
                          <td className="py-3 px-3 font-bold text-[#1A1A1A]">{log.eventName}</td>
                          <td className="py-3 px-3">
                            {log.memberStatus === 'active_member' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#501214] text-white">
                                Active Member
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-600 text-white">
                                Guest / Non-Member
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[#1A1A1A]">
                            {log.pointsAwarded > 0 ? `+${log.pointsAwarded}` : '0'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {deleteConfirmId === log.id ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="px-2 py-0.5 bg-red-700 text-white text-[10px] font-black rounded"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-gray-200 text-[#1A1A1A] text-[10px] rounded"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(log.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded"
                                title="Delete attendance record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 px-4 text-center">
                          <div className="max-w-md mx-auto space-y-2">
                            <Users className="w-8 h-8 text-gray-400 mx-auto" />
                            <h4 className="text-sm font-black text-[#1A1A1A]">No attendance recorded yet for this event</h4>
                            <p className="text-xs text-gray-600">
                              No student check-ins have been recorded matching your current filter criteria. Use the meeting projector QR pass or manual check-in to log attendees.
                            </p>
                          </div>
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

      {/* MANUAL CHECK-IN MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border-2 border-gray-300 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200">
              <div className="flex items-center space-x-2 text-[#501214] font-black text-base">
                <Plus className="w-5 h-5 text-[#501214]" />
                <span>Manual Attendance Log Entry</span>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-gray-500 hover:text-[#1A1A1A] text-lg font-black p-1"
              >
                ✕
              </button>
            </div>

            {manualMessage && (
              <div className="p-3 bg-emerald-700 text-white text-xs font-black rounded-xl">
                {manualMessage}
              </div>
            )}

            <form onSubmit={handleManualCheckIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Garcia"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-[#1A1A1A] mb-1">Texas State NetID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. eg819"
                    value={manualNetId}
                    onChange={(e) => setManualNetId(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-black text-[#1A1A1A] mb-1">Points</label>
                  <input
                    type="number"
                    value={manualPoints}
                    onChange={(e) => setManualPoints(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. eg819@txstate.edu"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214]"
                />
              </div>

              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Select Event *</label>
                <select
                  value={manualEvent}
                  onChange={(e) => setManualEvent(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-bold"
                >
                  {uniqueEventNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="General Meeting">General Meeting</option>
                  <option value="Workshop / Tech Talk">Workshop / Tech Talk</option>
                  <option value="Social Event">Social Event</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={manualIsActive}
                  onChange={(e) => setManualIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#501214] border-gray-300 focus:ring-[#501214]"
                />
                <label htmlFor="isActiveCheck" className="font-black text-[#1A1A1A]">
                  Active Paid Chapter Member (Credits points to merit balance)
                </label>
              </div>

              <div className="pt-3 border-t-2 border-gray-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-[#1A1A1A] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-6 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl font-black shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmittingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAnalytics;
