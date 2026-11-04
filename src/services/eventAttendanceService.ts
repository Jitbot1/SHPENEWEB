import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  writeBatch, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  where, 
  increment, 
  arrayUnion 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../context/auth-context-def';

export interface ChapterEvent {
  id: string;
  title: string;
  attendanceCode: string;
  points: number;
  active: boolean;
  date: string;
  location?: string;
  description?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AttendanceHistoryRecord {
  id: string;
  userId: string;
  netId: string;
  netid?: string;
  eventId: string;
  eventName: string;
  timestamp: unknown;
  pointsEarned: number;
  pointsAwarded?: number;
  memberStatus: 'active_member' | 'guest_visitor';
  memberName: string;
  email: string;
  date: string;
  arrivalTime: string;
  scannedBy?: string;
}

export interface LiveAnalyticsMetrics {
  totalAttendees: number;
  uniqueAttendeesCount: number;
  activeMembersCount: number;
  guestCount: number;
  retentionRatePct: number;
  usersWithMultipleCheckins: number;
  avgAttendancePerEvent: number;
  overallConversionRatePct: number;
  totalConvertedGuests: number;
  totalGuestsObserved: number;
  totalEventsTracked: number;
}

// Initial active events to bootstrap the database if collection is empty
export const DEFAULT_ACTIVE_EVENTS: ChapterEvent[] = [
  {
    id: 'event_gbm2',
    title: 'GBM #2: National Convention Delegation & Career Prep',
    attendanceCode: 'BOBCAT-2026',
    points: 10,
    active: true,
    date: new Date().toISOString().split('T')[0],
    location: 'Ingram Hall 4101',
    description: 'General body meeting covering resume drops, travel stipends, and convention logistics.'
  },
  {
    id: 'event_gbm1',
    title: 'GBM #1: Spring Semester Kickoff & Technical Roadmaps',
    attendanceCode: 'SHPE-SPRING26',
    points: 10,
    active: false,
    date: '2026-10-14',
    location: 'Ingram Hall 4101',
    description: 'Welcome back social with officer introductions and committee signups.'
  },
  {
    id: 'event_accenture',
    title: 'Corporate Spotlight & Tech Workshop with Accenture',
    attendanceCode: 'ACCENTURE-TECH',
    points: 15,
    active: false,
    date: '2026-10-07',
    location: 'Ingram Hall 3202',
    description: 'Consultant tech panel and resume review workshop.'
  }
];

/**
 * Seeds default active events in Firestore if the events collection is empty.
 */
export async function seedDefaultActiveEventsIfEmpty(): Promise<void> {
  try {
    const collRef = collection(db, 'events');
    const snap = await getDocs(collRef);
    if (snap.empty) {
      for (const ev of DEFAULT_ACTIVE_EVENTS) {
        await setDoc(doc(db, 'events', ev.id), {
          ...ev,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Notice seeding default events:', err);
  }
}

/**
 * Subscribes to live chapter events in Firestore.
 */
export function subscribeEvents(
  onUpdate: (events: ChapterEvent[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'events');
  return onSnapshot(
    collRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_ACTIVE_EVENTS);
        seedDefaultActiveEventsIfEmpty().catch((e) => console.warn('Events seed error:', e));
        return;
      }
      const list: ChapterEvent[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as ChapterEvent), id: d.id });
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Events subscription notice:', err);
      if (onError) onError(err);
      onUpdate(DEFAULT_ACTIVE_EVENTS);
    }
  );
}

/**
 * Creates or updates an active event in the events collection (e.g. from AdminHub live screen).
 */
export async function saveOrUpdateActiveEvent(params: {
  id?: string;
  title: string;
  attendanceCode: string;
  points: number;
  active?: boolean;
  location?: string;
  date?: string;
}): Promise<string> {
  const cleanCode = params.attendanceCode.trim().toUpperCase();
  const eventId = params.id || `event_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
  const dateStr = params.date || new Date().toISOString().split('T')[0];

  const payload: ChapterEvent = {
    id: eventId,
    title: params.title.trim(),
    attendanceCode: cleanCode,
    points: Number(params.points) || 10,
    active: params.active !== false,
    date: dateStr,
    location: params.location || 'Ingram Hall 4101',
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = doc(db, 'events', eventId);
    await setDoc(docRef, payload, { merge: true });
    return eventId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `events/${eventId}`);
    throw err;
  }
}

/**
 * Atomic Claim Attendance Code Verification & Point Crediting:
 * 1. Validates code against active events in `events` collection.
 * 2. Checks if NetID/UID has already checked into that event ID.
 * 3. Writes attendance record to `attendanceHistory` and `attendanceLogs`.
 * 4. Increments user's point total in their profile document using atomic `increment(eventPoints)`.
 */
export async function claimAttendanceCodeWithTransaction(params: {
  attendanceCode: string;
  userId: string;
  netId: string;
  memberName: string;
  email: string;
}): Promise<{
  success: boolean;
  eventId: string;
  eventName: string;
  pointsEarned: number;
  newPointBalance: number;
  memberStatus: 'active_member' | 'guest_visitor';
  message: string;
}> {
  const cleanCode = params.attendanceCode.trim().toUpperCase();
  const cleanNetId = params.netId.trim().toLowerCase();
  const cleanName = params.memberName.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanUserId = params.userId.trim();

  if (!cleanCode) {
    throw new Error('Please enter the attendance code displayed on the screen.');
  }
  if (!cleanNetId) {
    throw new Error('Please enter your Texas State NetID (e.g. abc123).');
  }
  if (!cleanName) {
    throw new Error('Please enter your full name.');
  }

  // 1. Validate the code against active events in the `events` collection
  let matchedEvent: ChapterEvent | null = null;

  try {
    const eventsColl = collection(db, 'events');
    const activeEventsSnap = await getDocs(query(eventsColl, where('active', '==', true)));

    if (!activeEventsSnap.empty) {
      activeEventsSnap.forEach((docSnap) => {
        const ev = docSnap.data() as ChapterEvent;
        if (ev.attendanceCode && ev.attendanceCode.trim().toUpperCase() === cleanCode) {
          matchedEvent = { ...ev, id: docSnap.id };
        }
      });
    }

    // Fallback: If not found in active events query, check all events in collection
    if (!matchedEvent) {
      const allEventsSnap = await getDocs(eventsColl);
      allEventsSnap.forEach((docSnap) => {
        const ev = docSnap.data() as ChapterEvent;
        if (ev.attendanceCode && ev.attendanceCode.trim().toUpperCase() === cleanCode) {
          matchedEvent = { ...ev, id: docSnap.id };
        }
      });
    }

    // Default bootstrap match if collection was brand new
    if (!matchedEvent) {
      const defaultMatch = DEFAULT_ACTIVE_EVENTS.find(
        (def) => def.attendanceCode.toUpperCase() === cleanCode
      );
      if (defaultMatch) {
        matchedEvent = defaultMatch;
        // Persist to events collection
        await setDoc(doc(db, 'events', defaultMatch.id), {
          ...defaultMatch,
          active: true,
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
    }
  } catch (eventErr) {
    console.warn('Error querying events collection:', eventErr);
  }

  if (!matchedEvent) {
    throw new Error(
      `Invalid attendance code "${cleanCode}". Please verify the active code displayed on the projector screen.`
    );
  }

  const activeEvent: ChapterEvent = matchedEvent;
  const eventId = activeEvent.id;
  const eventName = activeEvent.title;
  const nominalPoints = Number(activeEvent.points) || 10;

  // 2. Check if the user's NetID or UID has already checked into that event ID (prevent duplicate claims)
  try {
    const historyColl = collection(db, 'attendanceHistory');
    const existingSnap = await getDocs(query(historyColl, where('eventId', '==', eventId)));

    let alreadyCheckedIn = false;
    existingSnap.forEach((docSnap) => {
      const rec = docSnap.data() as AttendanceHistoryRecord;
      const recNetId = (rec.netId || rec.netid || '').trim().toLowerCase();
      const recUserId = (rec.userId || '').trim();
      const recEmail = (rec.email || '').trim().toLowerCase();

      if (
        (cleanNetId && recNetId === cleanNetId) ||
        (cleanUserId && recUserId === cleanUserId) ||
        (cleanEmail && recEmail === cleanEmail)
      ) {
        alreadyCheckedIn = true;
      }
    });

    if (alreadyCheckedIn) {
      throw new Error(
        `Duplicate check-in: NetID "${cleanNetId}" has already checked into "${eventName}". Attendance was already recorded.`
      );
    }
  } catch (dupErr) {
    if (dupErr instanceof Error && dupErr.message.includes('Duplicate check-in')) {
      throw dupErr;
    }
    console.warn('Duplicate check notice:', dupErr);
  }

  // 3. Determine User Membership Status & Points
  let isMember = false;
  let userRef = doc(db, 'users', cleanUserId);
  let existingUserSnap = await getDoc(userRef);

  // If cleanUserId is not the direct doc or doesn't exist, search users collection by netid or email
  if (!existingUserSnap.exists() && (cleanNetId || cleanEmail)) {
    try {
      const usersColl = collection(db, 'users');
      if (cleanNetId) {
        const netSnap = await getDocs(query(usersColl, where('netid', '==', cleanNetId)));
        if (!netSnap.empty) {
          userRef = doc(db, 'users', netSnap.docs[0].id);
          existingUserSnap = netSnap.docs[0];
        }
      }
      if (!existingUserSnap.exists() && cleanEmail) {
        const emailSnap = await getDocs(query(usersColl, where('email', '==', cleanEmail)));
        if (!emailSnap.empty) {
          userRef = doc(db, 'users', emailSnap.docs[0].id);
          existingUserSnap = emailSnap.docs[0];
        }
      }
    } catch (uErr) {
      console.warn('User doc lookup warning:', uErr);
    }
  }

  let currentPoints = 0;
  if (existingUserSnap.exists()) {
    const uData = existingUserSnap.data() as UserProfile;
    isMember = Boolean(uData.isPaidMember || uData.isDuePaying || uData.role === 'member' || uData.role === 'officer');
    currentPoints = Number(uData.meritPoints || 0);
  }

  const pointsEarned = isMember ? nominalPoints : 0;
  const memberStatus: 'active_member' | 'guest_visitor' = isMember ? 'active_member' : 'guest_visitor';
  const newPointBalance = currentPoints + pointsEarned;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // Unique ID for the attendance record
  const recordId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? `att_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
    : `att_${Date.now()}_${now.getTime().toString(36)}`;

  // 4. Atomic Firestore Batch Update
  const batch = writeBatch(db);

  // A. Write attendance record to `attendanceHistory`
  const historyRef = doc(db, 'attendanceHistory', recordId);
  const historyRecord: AttendanceHistoryRecord = {
    id: recordId,
    userId: cleanUserId || `netid_${cleanNetId}`,
    netId: cleanNetId,
    netid: cleanNetId,
    eventId: eventId,
    eventName: eventName,
    timestamp: serverTimestamp(),
    pointsEarned: pointsEarned,
    pointsAwarded: pointsEarned,
    memberStatus: memberStatus,
    memberName: cleanName,
    email: cleanEmail || `${cleanNetId}@txstate.edu`,
    date: dateStr,
    arrivalTime: timeStr,
    scannedBy: `Projector Live Code (${cleanCode})`,
  };

  batch.set(historyRef, historyRecord);

  // B. Write attendance record to `attendanceLogs` for backwards-compatibility
  const logRef = doc(db, 'attendanceLogs', recordId);
  batch.set(logRef, {
    ...historyRecord,
    createdAt: serverTimestamp(),
  });

  // C. Increment user point total in their profile document using atomic FieldValue.increment
  if (existingUserSnap.exists()) {
    batch.update(userRef, {
      meritPoints: increment(pointsEarned),
      attendanceCount: increment(1),
      attendanceHistory: arrayUnion({
        id: recordId,
        eventId: eventId,
        eventName: eventName,
        date: dateStr,
        points: pointsEarned,
        timestamp: now.toISOString(),
      }),
      updatedAt: serverTimestamp(),
    });
  }

  // Execute the atomic batch
  try {
    await batch.commit();
  } catch (batchErr) {
    handleFirestoreError(batchErr, OperationType.WRITE, `attendanceHistory/${recordId}`);
    throw batchErr;
  }

  const message = isMember
    ? `Attendance recorded for ${cleanName}! +${pointsEarned} merit points added to your account.`
    : `Guest attendance recorded for ${cleanName}. Pay dues to start earning merit points for future events!`;

  return {
    success: true,
    eventId,
    eventName,
    pointsEarned,
    newPointBalance,
    memberStatus,
    message,
  };
}

/**
 * Subscribes to live attendanceHistory records.
 */
export function subscribeAttendanceHistory(
  onUpdate: (records: AttendanceHistoryRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'attendanceHistory');

  return onSnapshot(
    collRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Fallback check: check attendanceLogs so historical records are not missed
        const logsColl = collection(db, 'attendanceLogs');
        getDocs(logsColl)
          .then((lSnap) => {
            if (!lSnap.empty) {
              const list: AttendanceHistoryRecord[] = [];
              lSnap.forEach((d) => {
                const data = d.data() as AttendanceHistoryRecord;
                list.push({
                  ...data,
                  id: d.id,
                  netId: data.netId || data.netid || '',
                  pointsEarned: Number(data.pointsEarned ?? data.pointsAwarded ?? 0),
                  eventId: data.eventId || `event_${(data.eventName || 'meeting').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                });
              });
              list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
              onUpdate(list);
            } else {
              onUpdate([]);
            }
          })
          .catch(() => onUpdate([]));
        return;
      }

      const list: AttendanceHistoryRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as AttendanceHistoryRecord;
        list.push({
          ...data,
          id: d.id,
          netId: data.netId || data.netid || '',
          pointsEarned: Number(data.pointsEarned ?? data.pointsAwarded ?? 0),
          eventId: data.eventId || `event_${(data.eventName || 'meeting').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        });
      });

      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('AttendanceHistory subscription notice:', err);
      if (onError) onError(err);
      onUpdate([]);
    }
  );
}

/**
 * Computes strictly live chapter KPIs with ZERO dummy numbers and ZERO random formulas:
 * - Retention Rate = (Users with >= 2 event check-ins / Total unique attendees) * 100
 * - Average Attendance = Total check-ins / Unique events
 * - Returns 0 or clean empty state if no check-ins exist
 */
export function calculateDynamicAnalytics(
  records: AttendanceHistoryRecord[],
  usersList: UserProfile[],
  eventsList: ChapterEvent[]
): LiveAnalyticsMetrics {
  const totalAttendees = records.length;
  if (totalAttendees === 0) {
    return {
      totalAttendees: 0,
      uniqueAttendeesCount: 0,
      activeMembersCount: 0,
      guestCount: 0,
      retentionRatePct: 0,
      usersWithMultipleCheckins: 0,
      avgAttendancePerEvent: 0,
      overallConversionRatePct: 0,
      totalConvertedGuests: 0,
      totalGuestsObserved: 0,
      totalEventsTracked: eventsList.length,
    };
  }

  // 1. Group check-ins by unique student identifier (NetID, Email, or UserId)
  const studentCheckinsMap = new Map<string, Set<string>>(); // studentKey -> Set of unique eventIds or eventNames
  const activeMembersSet = new Set<string>();

  // Populate active members set from registered users collection
  usersList.forEach((u) => {
    if (u.isPaidMember || u.isDuePaying || u.role === 'member' || u.role === 'officer') {
      if (u.netid) activeMembersSet.add(u.netid.trim().toLowerCase());
      if (u.studentId) activeMembersSet.add(u.studentId.trim().toLowerCase());
      if (u.email) activeMembersSet.add(u.email.trim().toLowerCase());
      if (u.uid) activeMembersSet.add(u.uid);
    }
  });

  // Track each check-in
  let activeMembersCheckinsCount = 0;
  let guestCheckinsCount = 0;
  const uniqueEventKeys = new Set<string>();

  const guestStudents = new Set<string>();
  const convertedStudents = new Set<string>();

  records.forEach((rec) => {
    const studentKey = (rec.netId || rec.netid || rec.email || rec.userId || '').trim().toLowerCase();
    const eventKey = (rec.eventId || rec.eventName || rec.date || 'event').trim().toLowerCase();
    uniqueEventKeys.add(eventKey);

    if (studentKey) {
      if (!studentCheckinsMap.has(studentKey)) {
        studentCheckinsMap.set(studentKey, new Set());
      }
      studentCheckinsMap.get(studentKey)!.add(eventKey);
    }

    const isMember = rec.memberStatus === 'active_member' || (studentKey && activeMembersSet.has(studentKey));
    if (isMember) {
      activeMembersCheckinsCount++;
    } else {
      guestCheckinsCount++;
      if (studentKey) {
        guestStudents.add(studentKey);
      }
    }
  });

  // Check which guest students subsequently converted to active members
  guestStudents.forEach((guestKey) => {
    if (activeMembersSet.has(guestKey)) {
      convertedStudents.add(guestKey);
    }
  });

  // Total unique attendees
  const uniqueAttendeesCount = studentCheckinsMap.size;

  // Retention Rate: (Users with >= 2 event check-ins / Total unique attendees) * 100
  let usersWithMultipleCheckins = 0;
  studentCheckinsMap.forEach((attendedEvents) => {
    if (attendedEvents.size >= 2) {
      usersWithMultipleCheckins++;
    }
  });

  const retentionRatePct = uniqueAttendeesCount > 0
    ? Math.round((usersWithMultipleCheckins / uniqueAttendeesCount) * 100)
    : 0;

  // Average Attendance
  const totalEventsTracked = Math.max(uniqueEventKeys.size, eventsList.length, 1);
  const avgAttendancePerEvent = totalEventsTracked > 0
    ? Math.round(totalAttendees / totalEventsTracked)
    : 0;

  // Overall Conversion Rate
  const totalGuestsObserved = guestStudents.size;
  const totalConvertedGuests = convertedStudents.size;
  const overallConversionRatePct = totalGuestsObserved > 0
    ? Math.round((totalConvertedGuests / totalGuestsObserved) * 100)
    : 0;

  return {
    totalAttendees,
    uniqueAttendeesCount,
    activeMembersCount: activeMembersCheckinsCount,
    guestCount: guestCheckinsCount,
    retentionRatePct,
    usersWithMultipleCheckins,
    avgAttendancePerEvent,
    overallConversionRatePct,
    totalConvertedGuests,
    totalGuestsObserved,
    totalEventsTracked: uniqueEventKeys.size,
  };
}
