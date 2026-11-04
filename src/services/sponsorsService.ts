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
import { CarouselItem } from '../components/Carousel';

export interface FirestoreSponsor extends CarouselItem {
  id: string;
  order?: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_SPONSORS: FirestoreSponsor[] = [
  {
    id: 'sponsor_1_dell',
    title: 'Dell Technologies',
    subtitle: 'Supporting SHPE since 2022',
    image: '/assets/images/sponsors/dell.png',
    alt: 'Dell Technologies logo',
    website: 'https://www.dell.com/',
    order: 0,
  },
  {
    id: 'sponsor_2_ufcu',
    title: 'UFCU',
    subtitle: 'Supporting SHPE since 2025',
    image: '/assets/images/sponsors/UFCU.png',
    alt: 'UFCU logo',
    website: 'https://www.ufcu.org/',
    order: 1,
  },
  {
    id: 'sponsor_3_lcra',
    title: 'LCRA',
    subtitle: 'Supporting SHPE since 2025',
    image: '/assets/images/sponsors/lcra.png',
    alt: 'LCRA logo',
    website: 'https://www.lcra.org/',
    order: 2,
  },
];

const SETTING_SPONSORS_INIT = 'sponsors_initialized';

export function compressImageFile(file: File, maxWidth = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image file'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function subscribeSponsors(
  onUpdate: (sponsors: FirestoreSponsor[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'sponsors');
  const q = query(collRef, orderBy('order', 'asc'));

  return onSnapshot(
    q,
    async (snap) => {
      if (snap.empty) {
        try {
          const initSnap = await getDoc(doc(db, 'settings', SETTING_SPONSORS_INIT));
          if (initSnap.exists() && initSnap.data()?.initialized) {
            onUpdate([]);
            return;
          }
        } catch {
          // Ignore
        }
        onUpdate(DEFAULT_SPONSORS);
      } else {
        const list: FirestoreSponsor[] = snap.docs.map((d) => ({
          ...(d.data() as FirestoreSponsor),
          id: d.id,
        }));
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Sponsors Firestore listener fallback:', err);
      if (onError) onError(err);
      onUpdate(DEFAULT_SPONSORS);
    }
  );
}

export async function saveSponsor(
  sponsor: Partial<FirestoreSponsor> & { title: string; website: string },
  editorEmail: string
) {
  const sponsorId =
    sponsor.id ||
    `sponsor_${Date.now()}_${sponsor.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const docRef = doc(db, 'sponsors', sponsorId);
  try {
    await setDoc(
      docRef,
      {
        id: sponsorId,
        title: sponsor.title.trim(),
        subtitle: sponsor.subtitle?.trim() || '',
        website: sponsor.website.trim(),
        image: sponsor.image || '/assets/icons/logo.svg',
        alt: sponsor.alt || `${sponsor.title} logo`,
        order: sponsor.order ?? 999,
        updatedAt: serverTimestamp(),
        updatedBy: editorEmail,
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'settings', SETTING_SPONSORS_INIT),
      { initialized: true, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `sponsors/${sponsorId}`);
    throw err;
  }
}

export async function deleteSponsor(sponsorId: string) {
  const docRef = doc(db, 'sponsors', sponsorId);
  try {
    await deleteDoc(docRef);
    await setDoc(
      doc(db, 'settings', SETTING_SPONSORS_INIT),
      { initialized: true, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `sponsors/${sponsorId}`);
    throw err;
  }
}

export async function seedInitialSponsorsIfEmpty(editorEmail: string) {
  try {
    const snap = await getDocs(collection(db, 'sponsors'));
    if (!snap.empty) {
      await setDoc(
        doc(db, 'settings', SETTING_SPONSORS_INIT),
        { initialized: true, updatedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
      return;
    }

    const initSnap = await getDoc(doc(db, 'settings', SETTING_SPONSORS_INIT));
    if (initSnap.exists() && initSnap.data()?.initialized) {
      return;
    }

    for (let i = 0; i < DEFAULT_SPONSORS.length; i++) {
      const sp = DEFAULT_SPONSORS[i];
      await setDoc(doc(db, 'sponsors', sp.id), {
        ...sp,
        order: i,
        updatedAt: serverTimestamp(),
        updatedBy: editorEmail,
      });
    }

    await setDoc(
      doc(db, 'settings', SETTING_SPONSORS_INIT),
      { initialized: true, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  } catch (err) {
    console.warn('Initial sponsors seed deferred or not permitted:', err);
  }
}
