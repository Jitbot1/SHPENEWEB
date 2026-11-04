import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../context/auth-context-def';

export interface AttendanceLogRecord {
  id: string;
  userId: string;
  memberName: string;
  netid: string;
  email: string;
  eventName: string;
  pointsAwarded: number;
  memberStatus: 'active_member' | 'guest_visitor';
  timestamp: string; // ISO format
  date: string; // e.g. "2026-10-14"
  arrivalTime: string; // e.g. "06:31:05 PM"
  scannedBy: string;
  createdAt?: unknown;
}

export interface EventAnalyticsSummary {
  eventName: string;
  date: string;
  totalAttendees: number;
  activeMembers: number;
  guestVisitors: number;
  memberRatioPct: number;
  guestRatioPct: number;
  averageCheckInTime: string;
  pointsDistributed: number;
  attendees: AttendanceLogRecord[];
  previousMeetingDelta?: {
    diffCount: number;
    diffPct: number;
  };
  retentionFromPrevious?: {
    returningCount: number;
    retentionRatePct: number;
  };
  conversion?: {
    totalGuestsAtEvent: number;
    subsequentlyConvertedCount: number;
    conversionRatePct: number;
    convertedNames: string[];
  };
}

/**
 * Computes event analytics summaries, meeting-to-meeting deltas, retention rates, and conversion metrics
 * strictly from live Firestore attendance records.
 */
export function computeEventAnalytics(
  logs: AttendanceLogRecord[],
  registeredUsers?: UserProfile[]
): EventAnalyticsSummary[] {
  if (!logs || logs.length === 0) {
    return [];
  }

  // Group logs by eventName + date
  const groups = new Map<string, AttendanceLogRecord[]>();

  logs.forEach((log) => {
    const key = `${log.date}___${log.eventName}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(log);
  });

  // Sort groups chronologically (ascending for trend comparison)
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const dateA = a.split('___')[0];
    const dateB = b.split('___')[0];
    return dateA.localeCompare(dateB);
  });

  // Track unique user IDs, emails, and NetIDs who are verified paid active members
  const activeMembersSet = new Set<string>();
  logs.forEach((l) => {
    if (l.memberStatus === 'active_member') {
      if (l.netid) activeMembersSet.add(l.netid.trim().toLowerCase());
      if (l.email) activeMembersSet.add(l.email.trim().toLowerCase());
      if (l.userId) activeMembersSet.add(l.userId);
    }
  });

  if (registeredUsers && registeredUsers.length > 0) {
    registeredUsers.forEach((u) => {
      if (u.isPaidMember || u.role === 'member' || u.role === 'officer') {
        if (u.netid) activeMembersSet.add(u.netid.trim().toLowerCase());
        if (u.studentId) activeMembersSet.add(u.studentId.trim().toLowerCase());
        if (u.email) activeMembersSet.add(u.email.trim().toLowerCase());
        if (u.txstateEmail) activeMembersSet.add(u.txstateEmail.trim().toLowerCase());
        if (u.uid) activeMembersSet.add(u.uid);
      }
    });
  }

  const summaries: EventAnalyticsSummary[] = [];

  sortedKeys.forEach((key, index) => {
    const eventLogs = groups.get(key)!;
    // Sort attendees by timestamp ascending
    eventLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const eventName = eventLogs[0].eventName;
    const date = eventLogs[0].date;
    const total = eventLogs.length;

    const activeCount = eventLogs.filter((l) => l.memberStatus === 'active_member').length;
    const guestCount = eventLogs.filter((l) => l.memberStatus === 'guest_visitor').length;
    const memberRatioPct = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const guestRatioPct = total > 0 ? 100 - memberRatioPct : 0;
    const pointsDistributed = eventLogs.reduce((acc, curr) => acc + (Number(curr.pointsAwarded) || 0), 0);

    // Calculate average arrival time
    let avgCheckInStr = 'N/A';
    if (eventLogs.length > 0) {
      const validLogs = eventLogs.filter((l) => l.timestamp && !isNaN(new Date(l.timestamp).getTime()));
      if (validLogs.length > 0) {
        const totalMinutes = validLogs.reduce((sum, l) => {
          const d = new Date(l.timestamp);
          return sum + d.getHours() * 60 + d.getMinutes();
        }, 0);
        const avgMinutes = Math.round(totalMinutes / validLogs.length);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;
        const period = avgHours >= 12 ? 'PM' : 'AM';
        const displayHours = avgHours % 12 === 0 ? 12 : avgHours % 12;
        avgCheckInStr = `${String(displayHours).padStart(2, '0')}:${String(avgMins).padStart(2, '0')} ${period}`;
      }
    }

    // Previous meeting comparison
    let previousMeetingDelta: EventAnalyticsSummary['previousMeetingDelta'] = undefined;
    let retentionFromPrevious: EventAnalyticsSummary['retentionFromPrevious'] = undefined;

    if (index > 0) {
      const prevSummary = summaries[index - 1];
      const diffCount = total - prevSummary.totalAttendees;
      const diffPct = prevSummary.totalAttendees > 0 
        ? Math.round((diffCount / prevSummary.totalAttendees) * 100) 
        : 0;

      previousMeetingDelta = { diffCount, diffPct };

      // Retention: how many attendees of previous event also attended this event
      const prevAttendeeKeys = new Set(
        prevSummary.attendees.map((l) => (l.netid || l.email || l.userId).trim().toLowerCase())
      );
      const returningAttendees = eventLogs.filter((l) => 
        prevAttendeeKeys.has((l.netid || l.email || l.userId).trim().toLowerCase())
      );
      const returningCount = returningAttendees.length;
      const retentionRatePct = prevSummary.totalAttendees > 0
        ? Math.round((returningCount / prevSummary.totalAttendees) * 100)
        : 0;

      retentionFromPrevious = { returningCount, retentionRatePct };
    }

    // Conversion Analytics: Check how many guests at this event later became active paid members
    const guestLogs = eventLogs.filter((l) => l.memberStatus === 'guest_visitor');
    const convertedNames: string[] = [];
    guestLogs.forEach((g) => {
      const keyNet = (g.netid || '').trim().toLowerCase();
      const keyEmail = (g.email || '').trim().toLowerCase();
      const keyUid = g.userId;

      if (
        (keyNet && activeMembersSet.has(keyNet)) ||
        (keyEmail && activeMembersSet.has(keyEmail)) ||
        (keyUid && activeMembersSet.has(keyUid))
      ) {
        if (!convertedNames.includes(g.memberName)) {
          convertedNames.push(g.memberName);
        }
      }
    });

    const conversionRatePct = guestLogs.length > 0
      ? Math.round((convertedNames.length / guestLogs.length) * 100)
      : 0;

    summaries.push({
      eventName,
      date,
      totalAttendees: total,
      activeMembers: activeCount,
      guestVisitors: guestCount,
      memberRatioPct,
      guestRatioPct,
      averageCheckInTime: avgCheckInStr,
      pointsDistributed,
      attendees: eventLogs,
      previousMeetingDelta,
      retentionFromPrevious,
      conversion: {
        totalGuestsAtEvent: guestLogs.length,
        subsequentlyConvertedCount: convertedNames.length,
        conversionRatePct,
        convertedNames,
      },
    });
  });

  // Return summaries sorted in reverse chronological order (newest meeting first)
  return summaries.reverse();
}

/**
 * Subscribes to live Firestore attendance logs collection.
 * Connects directly to real database records.
 * Returns empty array [] if no attendance has been recorded yet.
 */
export function subscribeAttendanceLogs(
  onUpdate: (logs: AttendanceLogRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'attendanceLogs');

  const processSnapshot = (snapshot: { empty: boolean; forEach: (cb: (doc: { id: string; data: () => unknown }) => void) => void }) => {
    if (snapshot.empty) {
      onUpdate([]);
      return;
    }
    const list: AttendanceLogRecord[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as AttendanceLogRecord;
      list.push({ ...data, id: d.id || data.id });
    });
    // Strict descending order by timestamp
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    onUpdate(list);
  };

  let fallbackUnsub: (() => void) | null = null;
  let active = true;

  try {
    const q = query(collRef, orderBy('timestamp', 'desc'));
    const primaryUnsub = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        processSnapshot(snapshot);
      },
      (err) => {
        if (!active) return;
        console.warn('Ordered query fallback in subscribeAttendanceLogs:', err);
        try {
          fallbackUnsub = onSnapshot(
            collRef,
            (fallbackSnap) => {
              if (!active) return;
              processSnapshot(fallbackSnap);
            },
            (fallbackErr) => {
              if (!active) return;
              console.error('Attendance collection query error:', fallbackErr);
              if (onError) onError(fallbackErr);
              onUpdate([]);
            }
          );
        } catch (fErr) {
          if (!active) return;
          if (onError) onError(fErr);
          onUpdate([]);
        }
      }
    );

    return () => {
      active = false;
      primaryUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (initialErr) {
    console.warn('Could not construct query with orderBy, using fallback:', initialErr);
    const basicUnsub = onSnapshot(
      collRef,
      (snapshot) => {
        if (!active) return;
        processSnapshot(snapshot);
      },
      (err) => {
        if (!active) return;
        console.error('Basic attendance snapshot error:', err);
        if (onError) onError(err);
        onUpdate([]);
      }
    );
    return () => {
      active = false;
      basicUnsub();
    };
  }
}

/**
 * Records real attendance log in Firestore.
 */
export async function recordAttendanceLog(params: {
  userId: string;
  memberName: string;
  netid: string;
  email: string;
  eventName: string;
  nominalPoints: number;
  isActiveMember: boolean;
  scannedBy: string;
}): Promise<{
  logRecord: AttendanceLogRecord;
  pointsCredited: number;
  statusMessage: string;
}> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const pointsCredited = params.isActiveMember ? params.nominalPoints : 0;
  const memberStatus: 'active_member' | 'guest_visitor' = params.isActiveMember ? 'active_member' : 'guest_visitor';

  // Secure unique ID generator without Math.random() simulation
  const logId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? `log_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
    : `log_${Date.now()}_${now.getTime().toString(36)}`;

  const logRecord: AttendanceLogRecord = {
    id: logId,
    userId: params.userId,
    memberName: params.memberName,
    netid: params.netid,
    email: params.email,
    eventName: params.eventName,
    pointsAwarded: pointsCredited,
    memberStatus,
    timestamp: now.toISOString(),
    date: dateStr,
    arrivalTime: timeStr,
    scannedBy: params.scannedBy,
  };

  try {
    const docRef = doc(db, 'attendanceLogs', logId);
    await setDoc(docRef, {
      ...logRecord,
      createdAt: serverTimestamp(),
    });

    if (params.isActiveMember && params.userId && params.userId !== 'manual_entry') {
      try {
        const userRef = doc(db, 'users', params.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data() as UserProfile;
          const currentPoints = Number(uData.meritPoints || 0);
          const currentCount = Number(uData.attendanceCount || 0);
          const currentHistory = Array.isArray(uData.attendanceHistory) ? uData.attendanceHistory : [];

          await updateDoc(userRef, {
            meritPoints: currentPoints + pointsCredited,
            attendanceCount: currentCount + 1,
            attendanceHistory: [
              ...currentHistory,
              {
                id: logId,
                eventName: params.eventName,
                date: dateStr,
                points: pointsCredited,
                timestamp: now.toISOString(),
              },
            ],
            updatedAt: serverTimestamp(),
          });
        }
      } catch (userErr) {
        console.warn('Could not increment user points on log creation:', userErr);
      }
    }

    const statusMessage = params.isActiveMember
      ? `Check-in confirmed for ${params.memberName}! +${pointsCredited} merit points credited.`
      : `Guest check-in logged for ${params.memberName}. (Non-member status: 0 points awarded).`;

    return {
      logRecord,
      pointsCredited,
      statusMessage,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `attendanceLogs/${logId}`);
    throw err;
  }
}

/**
 * Deletes an attendance record from Firestore.
 */
export async function deleteAttendanceLog(logId: string) {
  try {
    await deleteDoc(doc(db, 'attendanceLogs', logId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `attendanceLogs/${logId}`);
    throw err;
  }
}

/**
 * Generates RFC 4180 compliant CSV string for attendance logs and conversion summaries
 */
export function generateComprehensiveAttendanceCsv(
  logs: AttendanceLogRecord[],
  summaries: EventAnalyticsSummary[]
): string {
  const escapeCsv = (str: string | number) => {
    const s = String(str ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const sections: string[] = [];

  // SECTION 1: EXECUTIVE EVENT CONVERSION & DEMOGRAPHIC SUMMARY
  sections.push('=== SECTION 1: EVENT ATTENDANCE & CONVERSION EXECUTIVE SUMMARY ===');
  const summaryHeaders = [
    'Event Name',
    'Event Date',
    'Total Attendees',
    'Active Members',
    'Guest / Non-Members',
    'Member Ratio (%)',
    'Guest Ratio (%)',
    'Avg Check-in Time',
    'Attendance vs Prev Meeting',
    'Attendee Retention Rate (%)',
    'Guests Converted to Members',
    'Club Conversion Rate (%)',
  ];
  sections.push(summaryHeaders.map(escapeCsv).join(','));

  summaries.forEach((s) => {
    const deltaStr = s.previousMeetingDelta
      ? `${s.previousMeetingDelta.diffCount >= 0 ? '+' : ''}${s.previousMeetingDelta.diffCount} (${s.previousMeetingDelta.diffPct}%)`
      : 'Baseline Meeting';
    const retentionStr = s.retentionFromPrevious
      ? `${s.retentionFromPrevious.retentionRatePct}% (${s.retentionFromPrevious.returningCount} returning)`
      : 'N/A';
    const convStr = s.conversion
      ? `${s.conversion.subsequentlyConvertedCount} of ${s.conversion.totalGuestsAtEvent}`
      : '0';
    const convPct = s.conversion ? `${s.conversion.conversionRatePct}%` : '0%';

    sections.push(
      [
        escapeCsv(s.eventName),
        escapeCsv(s.date),
        escapeCsv(s.totalAttendees),
        escapeCsv(s.activeMembers),
        escapeCsv(s.guestVisitors),
        escapeCsv(`${s.memberRatioPct}%`),
        escapeCsv(`${s.guestRatioPct}%`),
        escapeCsv(s.averageCheckInTime),
        escapeCsv(deltaStr),
        escapeCsv(retentionStr),
        escapeCsv(convStr),
        escapeCsv(convPct),
      ].join(',')
    );
  });

  sections.push('');
  sections.push('');

  // SECTION 2: TIMESTAMPED ATTENDEE ROSTER
  sections.push('=== SECTION 2: TIMESTAMPED ATTENDEE CHECK-IN RECORDS ===');
  const detailHeaders = [
    'Event Date',
    'Exact Check-in Timestamp',
    'Arrival Time',
    'Event Name',
    'Full Name',
    'Texas State NetID',
    'Email Address',
    'Membership Status',
    'Points Awarded',
    'Verified by / Source',
  ];
  sections.push(detailHeaders.map(escapeCsv).join(','));

  logs.forEach((log) => {
    sections.push(
      [
        escapeCsv(log.date),
        escapeCsv(log.timestamp),
        escapeCsv(log.arrivalTime),
        escapeCsv(log.eventName),
        escapeCsv(log.memberName),
        escapeCsv(log.netid),
        escapeCsv(log.email),
        escapeCsv(log.memberStatus === 'active_member' ? 'Active Member' : 'Guest / Non-Member'),
        escapeCsv(log.pointsAwarded),
        escapeCsv(log.scannedBy),
      ].join(',')
    );
  });

  return sections.join('\r\n');
}

/**
 * Downloads comprehensive event analytics and attendance records directly as an Excel/CSV file
 */
export function downloadAttendanceLogsCsv(
  logs: AttendanceLogRecord[], 
  filename = 'SHPE_TXST_Event_Analytics_Report',
  summaries?: EventAnalyticsSummary[]
) {
  const summs = summaries || computeEventAnalytics(logs);
  const csvContent = generateComprehensiveAttendanceCsv(logs, summs);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateSuffix = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filename}_${dateSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies TSV format to clipboard so admin can paste directly into Google Sheets
 */
export async function copyLogsForGoogleSheets(logs: AttendanceLogRecord[]): Promise<boolean> {
  const headers = [
    'Date',
    'Exact Timestamp',
    'Arrival Time',
    'Full Name',
    'Texas State NetID',
    'Email Address',
    'Event Name',
    'Member Status',
    'Points Credited',
    'Scanned By',
  ];

  const rows = logs.map((log) => [
    log.date,
    log.timestamp,
    log.arrivalTime,
    log.memberName,
    log.netid,
    log.email,
    log.eventName,
    log.memberStatus === 'active_member' ? 'Active Member' : 'Guest / Non-Member',
    log.pointsAwarded,
    log.scannedBy,
  ]);

  const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}
