import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { officers as defaultOfficersList, Officer } from '../officers';

export interface FirestoreOfficer extends Officer {
  id: string;
  order?: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export type { Officer };

export const DEFAULT_OFFICERS: FirestoreOfficer[] = defaultOfficersList.map((off, idx) => ({
  ...off,
  id: `officer_${idx + 1}_${off.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
  order: idx,
}));

const SETTING_ROSTER_INIT = 'roster_initialized';

export function subscribeOfficers(
  onUpdate: (officersList: FirestoreOfficer[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'officers');
  const q = query(collRef, orderBy('order', 'asc'));

  return onSnapshot(
    q,
    async (snap) => {
      if (snap.empty) {
        // Check if roster was previously initialized by admin
        try {
          const initSnap = await getDoc(doc(db, 'settings', SETTING_ROSTER_INIT));
          if (initSnap.exists() && initSnap.data()?.initialized) {
            // Admin intentionally deleted all officers; do not fall back to defaults
            onUpdate([]);
            return;
          }
        } catch {
          // Ignore setting check error
        }

        // Fresh database fallback
        const formatted = defaultOfficersList.map((off, idx) => ({
          ...off,
          id: `officer_${idx + 1}_${off.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          order: idx,
        }));
        onUpdate(formatted);
      } else {
        const list: FirestoreOfficer[] = snap.docs.map((d) => ({
          ...(d.data() as FirestoreOfficer),
          id: d.id,
        }));
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Officers Firestore subscription fallback:', err);
      if (onError) onError(err);
      const formatted = defaultOfficersList.map((off, idx) => ({
        ...off,
        id: `officer_${idx + 1}_${off.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        order: idx,
      }));
      onUpdate(formatted);
    }
  );
}

export async function saveOfficerProfile(
  officer: Partial<FirestoreOfficer> & { name: string; position: string; group: 'Executive Board' | 'Board of Directors' },
  editorEmail: string
) {
  const officerId =
    officer.id ||
    `officer_${Date.now()}_${officer.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const docRef = doc(db, 'officers', officerId);
  try {
    await setDoc(
      docRef,
      {
        id: officerId,
        name: officer.name.trim(),
        gradYear: officer.gradYear || '',
        major: officer.major || '',
        position: officer.position.trim(),
        image: officer.image || '/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png',
        group: officer.group,
        linkedin: officer.linkedin || '',
        bio: officer.bio || '',
        order: officer.order ?? 999,
        updatedAt: serverTimestamp(),
        updatedBy: editorEmail,
      },
      { merge: true }
    );

    // Mark roster as initialized
    await setDoc(
      doc(db, 'settings', SETTING_ROSTER_INIT),
      { initialized: true, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `officers/${officerId}`);
    throw err;
  }
}

export async function deleteOfficerProfile(officerId: string) {
  const docRef = doc(db, 'officers', officerId);
  try {
    await deleteDoc(docRef);
    // Mark roster as initialized so empty state persists if all deleted
    await setDoc(
      doc(db, 'settings', SETTING_ROSTER_INIT),
      { initialized: true, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `officers/${officerId}`);
    throw err;
  }
}

export async function seedInitialOfficersIfEmpty(editorEmail: string) {
  try {
    const snap = await getDocs(collection(db, 'officers'));
    if (!snap.empty) {
      await setDoc(
        doc(db, 'settings', SETTING_ROSTER_INIT),
        { initialized: true, updatedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
      return;
    }

    // Check if already initialized before seeding
    const initSnap = await getDoc(doc(db, 'settings', SETTING_ROSTER_INIT));
    if (initSnap.exists() && initSnap.data()?.initialized) {
      return;
    }

    for (let i = 0; i < defaultOfficersList.length; i++) {
      const off = defaultOfficersList[i];
      const id = `officer_${i + 1}_${off.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await setDoc(doc(db, 'officers', id), {
        ...off,
        id,
        order: i,
        updatedAt: serverTimestamp(),
        updatedBy: editorEmail,
      });
    }

    await setDoc(
      doc(db, 'settings', SETTING_ROSTER_INIT),
      { initialized: true, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  } catch (err) {
    console.warn('Initial officers seed deferred or not permitted:', err);
  }
}
