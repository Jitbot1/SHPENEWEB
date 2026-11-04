import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';

export interface WeeklyAnnouncement {
  id: string;
  title: string;
  weekLabel: string;
  imageUrl: string;
  description?: string;
  active: boolean;
  order: number;
  uploadedAt?: unknown;
  uploadedBy?: string;
}

export const DEFAULT_WEEKLY_ANNOUNCEMENTS: WeeklyAnnouncement[] = [
  {
    id: 'announcement_1_gbm',
    title: 'General Body Meeting & Engineering Tech Talk',
    weekLabel: 'Week of Oct 14 - Oct 20',
    imageUrl: '/images/hero/hero1.JPG',
    description: 'Join us Wednesdays at 6:30 PM in Ingram Hall 4101 for industry keynote speakers and dinner!',
    active: true,
    order: 0,
    uploadedBy: 'shpetxst@gmail.com',
  },
  {
    id: 'announcement_2_convention',
    title: 'National Convention California Delegation Briefing',
    weekLabel: 'Conference Prep Series',
    imageUrl: '/assets/images/SHPENATIONALCONV.jpg',
    description: 'Travel scholarship recipients and attendees: Mandatory travel logistics and corporate career fair strategy meeting.',
    active: true,
    order: 1,
    uploadedBy: 'shpetxst@gmail.com',
  },
  {
    id: 'announcement_3_accenture',
    title: 'Corporate Spotlight & Tech Workshop',
    weekLabel: 'Career & Networking',
    imageUrl: '/assets/images/SHPEACCENTURE.jpg',
    description: 'Consultant panel and technical resume review workshop with Accenture corporate partners.',
    active: true,
    order: 2,
    uploadedBy: 'shpetxst@gmail.com',
  },
  {
    id: 'announcement_4_athletics',
    title: 'Intramural Athletics & Bobcat Wellness Match',
    weekLabel: 'Athletics & Fellowship',
    imageUrl: '/assets/images/Athletics_gallery/IMG_7292.jpg',
    description: 'Come cheer on SHPE FC or join the pickup soccer match this Friday at 4:00 PM at the Student Rec Center.',
    active: true,
    order: 3,
    uploadedBy: 'shpetxst@gmail.com',
  },
  {
    id: 'announcement_5_shpetinas',
    title: 'SHPEtinas Sisterhood & Mentorship Circle',
    weekLabel: 'Empowerment Panel',
    imageUrl: '/assets/images/SHPEtinas_events/IMG_7301.JPG',
    description: 'Empowering Hispanic women in STEM with executive leadership panels, career guidance, and wellness.',
    active: true,
    order: 4,
    uploadedBy: 'shpetxst@gmail.com',
  },
];

const DELETED_ANNOUNCEMENTS_KEY = 'shpe_deleted_announcements_v1';

function getDeletedAnnouncementIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_ANNOUNCEMENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function recordDeletedAnnouncementId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedAnnouncementIds();
    set.add(id);
    localStorage.setItem(DELETED_ANNOUNCEMENTS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore localStorage errors
  }
}

export function subscribeWeeklyAnnouncements(
  onUpdate: (announcements: WeeklyAnnouncement[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'weeklyAnnouncements');
  const q = query(collRef, orderBy('order', 'asc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      const deletedIds = getDeletedAnnouncementIds();
      if (snapshot.empty) {
        const activeDefaults = DEFAULT_WEEKLY_ANNOUNCEMENTS.filter((a) => !deletedIds.has(a.id));
        onUpdate(activeDefaults);
        return;
      }
      const list: WeeklyAnnouncement[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WeeklyAnnouncement;
        if (!deletedIds.has(data.id || docSnap.id)) {
          list.push({ ...data, id: docSnap.id || data.id });
        }
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        console.warn('Weekly announcements subscription warning:', err);
      }
      const deletedIds = getDeletedAnnouncementIds();
      const activeDefaults = DEFAULT_WEEKLY_ANNOUNCEMENTS.filter((a) => !deletedIds.has(a.id));
      onUpdate(activeDefaults);
    }
  );
}

export async function uploadAnnouncementImage(
  file: File, 
  filenamePrefix = 'announcement',
  onProgress?: (percent: number) => void
): Promise<string> {
  const filename = `${filenamePrefix}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const storageRef = ref(storage, `announcements/${filename}`);

  try {
    return await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(percent);
          }
        },
        (error) => {
          console.warn('Firebase Storage announcement upload notice:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve(downloadUrl);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });
  } catch (storageErr) {
    console.warn('Firebase Storage upload error, generating compressed data URL fallback:', storageErr);
    return new Promise<string>((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                const maxDim = 960;
                let width = img.width;
                let height = img.height;
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  if (onProgress) onProgress(100);
                  resolve(canvas.toDataURL('image/jpeg', 0.75));
                } else {
                  if (onProgress) onProgress(100);
                  resolve(reader.result as string);
                }
              } catch (canvasErr) {
                console.warn('Canvas processing error:', canvasErr);
                resolve(reader.result as string);
              }
            };
            img.onerror = () => {
              resolve(reader.result as string);
            };
            img.src = reader.result as string;
          } catch (imgErr) {
            console.warn('Image creation error:', imgErr);
            resolve(reader.result as string);
          }
        };
        reader.onerror = (rErr) => {
          console.error('FileReader error:', rErr);
          reject(new Error('Failed to read image file on client.'));
        };
        reader.readAsDataURL(file);
      } catch (fErr) {
        reject(fErr instanceof Error ? fErr : new Error('FileReader initialization error.'));
      }
    });
  }
}

export async function saveWeeklyAnnouncement(
  announcement: Partial<WeeklyAnnouncement> & { title: string; imageUrl: string },
  editorEmail: string
) {
  const announcementId = announcement.id || `announcement_${Date.now()}`;
  const docRef = doc(db, 'weeklyAnnouncements', announcementId);

  const payload: WeeklyAnnouncement = {
    id: announcementId,
    title: announcement.title.trim(),
    weekLabel: announcement.weekLabel?.trim() || `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    imageUrl: announcement.imageUrl,
    description: announcement.description?.trim() || '',
    active: announcement.active !== false,
    order: announcement.order ?? 999,
    uploadedAt: serverTimestamp(),
    uploadedBy: editorEmail,
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return announcementId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `weeklyAnnouncements/${announcementId}`);
  }
}

export async function deleteWeeklyAnnouncement(announcementId: string, imageUrl?: string) {
  // 1. Record in local blacklist so it is immediately filtered from defaults/cache
  recordDeletedAnnouncementId(announcementId);

  // 2. Delete Firestore reference
  try {
    const docRef = doc(db, 'weeklyAnnouncements', announcementId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Firestore delete doc warning for ${announcementId}:`, err);
  }

  // 3. Delete storage asset if it is a Firebase Storage URL
  if (imageUrl && (imageUrl.includes('firebasestorage.googleapis.com') || imageUrl.includes('storage.googleapis.com'))) {
    try {
      // Extract storage path from download URL or decode
      const match = imageUrl.match(/\/o\/([^?]+)/);
      if (match && match[1]) {
        const decodedPath = decodeURIComponent(match[1]);
        const storageAssetRef = ref(storage, decodedPath);
        await deleteObject(storageAssetRef);
      }
    } catch (storageErr) {
      console.warn('Firebase Storage asset cleanup notice (non-fatal):', storageErr);
    }
  }
}

export async function seedDefaultAnnouncements() {
  try {
    const existing = await getDocs(collection(db, 'weeklyAnnouncements'));
    if (!existing.empty) return;

    for (const ann of DEFAULT_WEEKLY_ANNOUNCEMENTS) {
      await setDoc(doc(db, 'weeklyAnnouncements', ann.id), {
        ...ann,
        uploadedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not auto-seed weekly announcements:', err);
  }
}
