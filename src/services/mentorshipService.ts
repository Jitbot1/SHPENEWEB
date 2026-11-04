import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';

export interface MentorProgramContent {
  id: string;
  programTitle: string;
  programSubtitle: string;
  description: string;
  academicGuidance: string;
  careerGuidance: string;
  familiaGuidance: string;
  mentorGuidelines: string[];
  menteeGuidelines: string[];
  mentorApplyLink: string;
  menteeApplyLink: string;
  contactEmail: string;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface MentorShpePhoto {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  storagePath?: string;
  uploadedAt: string;
  uploadedBy: string;
  order?: number;
}

export const DEFAULT_MENTOR_CONTENT: MentorProgramContent = {
  id: 'config',
  programTitle: 'MentorSHPE Program',
  programSubtitle: 'Connecting aspiring Bobcat engineers with experienced upperclassmen, graduate researchers, and industry alumni to navigate academia, unlock internships, and build lifelong bonds.',
  description: 'MentorSHPE is Texas State University\'s premier peer-to-peer engineering mentorship initiative. We cultivate professional readiness, academic excellence, and personal growth through dedicated one-on-one pairings and familia cohort check-ins.',
  academicGuidance: 'Navigate prerequisites, professor recommendations, study groups, and exam preparation with Bobcats who have walked in your shoes.',
  careerGuidance: 'Resume critiques, technical mock interviews, convention strategies, and corporate referral tips from students with proven industry experience.',
  familiaGuidance: 'A built-in support system that keeps you motivated through midterms and finals, celebrating your personal and engineering milestones together.',
  mentorGuidelines: [
    'Meet with your mentee at least twice a month (in person at Ingram Hall or virtually).',
    'Offer constructive feedback on engineering resumes, LinkedIn profiles, and degree planning.',
    'Introduce your mentee to chapter general meetings, committee directors, and company recruiters.',
    'Be supportive, maintain confidentiality, and encourage your mentee during challenging exam weeks.',
  ],
  menteeGuidelines: [
    'Take initiative in scheduling meetings and communicating your availability promptly.',
    'Set 2-3 concrete semester goals (e.g. landing an internship, improving GPA, joining a committee).',
    'Come to check-ins prepared with questions regarding coursework, projects, or career directions.',
    'Attend chapter events, general meetings, and MentorSHPE mixer gatherings.',
  ],
  mentorApplyLink: '',
  menteeApplyLink: '',
  contactEmail: 'shpetxst@gmail.com',
};

export const INITIAL_MENTOR_PHOTOS: MentorShpePhoto[] = [
  {
    id: 'photo_mentor_1',
    title: 'National Convention Mentorship',
    caption: 'Mentors coaching Bobcat engineers on career fair networking and technical interviews.',
    imageUrl: '/assets/images/SHPENATIONALCONV.jpg',
    uploadedAt: '2026-10-14T12:00:00.000Z',
    uploadedBy: 'shpetxst@gmail.com',
    order: 1,
  },
  {
    id: 'photo_mentor_2',
    title: 'Corporate Mentorship with Accenture',
    caption: 'Industry engineering alumni guiding students through consulting, tech roadmaps, and internship applications.',
    imageUrl: '/assets/images/SHPEACCENTURE.jpg',
    uploadedAt: '2026-10-14T13:00:00.000Z',
    uploadedBy: 'shpetxst@gmail.com',
    order: 2,
  },
  {
    id: 'photo_mentor_3',
    title: 'Familia Study Night & Academic Check-In',
    caption: 'Upperclassmen peer tutoring and calculus study sessions in Ingram Hall.',
    imageUrl: '/assets/images/SHPEtinas_events/IMG_2971.jpg',
    uploadedAt: '2026-10-14T14:00:00.000Z',
    uploadedBy: 'shpetxst@gmail.com',
    order: 3,
  },
  {
    id: 'photo_mentor_4',
    title: 'Cultural Celebration & Community Bonding',
    caption: 'Celebrating Bobcat heritage and building supportive lifelong bonds through our Dia de los Muertos ofrenda.',
    imageUrl: '/assets/images/SHPEOFRENDA.jpg',
    uploadedAt: '2026-10-14T15:00:00.000Z',
    uploadedBy: 'shpetxst@gmail.com',
    order: 4,
  },
  {
    id: 'photo_mentor_5',
    title: 'Leadership & Professional Workshop',
    caption: 'Mentor and mentee breakout session preparing elevator pitches for upcoming tech conferences.',
    imageUrl: '/assets/images/SHPEtinas_events/IMG_7301.JPG',
    uploadedAt: '2026-10-14T16:00:00.000Z',
    uploadedBy: 'shpetxst@gmail.com',
    order: 5,
  },
  {
    id: 'photo_mentor_6',
    title: 'Chapter General Body Meeting & Welcome',
    caption: 'Pairing reveals and welcoming new freshmen to the Bobcat SHPE familia.',
    imageUrl: '/assets/images/Merits_page/IMG_2966.jpg',
    uploadedAt: '2026-10-14T17:00:00.000Z',
    uploadedBy: 'shpetxst@gmail.com',
    order: 6,
  },
];

export const DEFAULT_MENTOR_PHOTOS = INITIAL_MENTOR_PHOTOS;

/**
 * Subscribes to MentorSHPE Program content configuration in Firestore.
 */
export function subscribeMentorProgramContent(
  onUpdate: (content: MentorProgramContent) => void
) {
  const docRef = doc(db, 'mentorProgram', 'config');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MentorProgramContent;
        onUpdate({
          ...DEFAULT_MENTOR_CONTENT,
          ...data,
          id: 'config',
        });
      } else {
        onUpdate(DEFAULT_MENTOR_CONTENT);
        // Auto-seed default configuration to Firestore
        if (typeof window !== 'undefined') {
          setDoc(docRef, {
            ...DEFAULT_MENTOR_CONTENT,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            console.warn('Auto-seed mentor program config notice:', err);
          });
        }
      }
    },
    (err) => {
      console.warn('Notice reading mentor program config, using default content:', err);
      onUpdate(DEFAULT_MENTOR_CONTENT);
    }
  );
}

/**
 * Updates MentorSHPE program content & guidelines in Firestore.
 * Strictly restricted to admin (shpetxst@gmail.com).
 */
export async function updateMentorProgramContent(
  updates: Partial<MentorProgramContent>,
  adminEmail = 'shpetxst@gmail.com'
): Promise<void> {
  const docRef = doc(db, 'mentorProgram', 'config');
  try {
    await setDoc(
      docRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: adminEmail,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'mentorProgram/config');
    throw err;
  }
}

/**
 * Subscribes to dedicated MentorSHPE photo gallery.
 */
export function subscribeMentorShpeGallery(
  onUpdate: (photos: MentorShpePhoto[]) => void
) {
  const collRef = collection(db, 'mentorShpeGallery');
  const q = query(collRef, orderBy('uploadedAt', 'desc'));

  const processSnap = (snapshot: { empty: boolean; forEach: (cb: (d: { data: () => unknown }) => void) => void }) => {
    if (snapshot.empty) {
      onUpdate(INITIAL_MENTOR_PHOTOS);
      if (typeof window !== 'undefined') {
        seedInitialMentorPhotosIfEmpty().catch((err) => {
          console.warn('Initial mentor photo gallery seed notice:', err);
        });
      }
      return;
    }
    const list: MentorShpePhoto[] = [];
    snapshot.forEach((d) => {
      list.push({ ...(d.data() as MentorShpePhoto), id: d.id });
    });
    // In-memory sort by uploadedAt descending
    list.sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
    onUpdate(list);
  };

  try {
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        processSnap(snapshot);
      },
      (err) => {
        console.warn('Ordered gallery query failed, falling back to base collection:', err);
        return onSnapshot(
          collRef,
          (fallbackSnap) => {
            processSnap(fallbackSnap);
          },
          (fallbackErr) => {
            console.error('Gallery collection error:', fallbackErr);
            onUpdate(INITIAL_MENTOR_PHOTOS);
          }
        );
      }
    );
    return unsub;
  } catch {
    return onSnapshot(
      collRef,
      (snapshot) => {
        processSnap(snapshot);
      },
      () => {
        onUpdate(INITIAL_MENTOR_PHOTOS);
      }
    );
  }
}

export const subscribeMentorGallery = subscribeMentorShpeGallery;

/**
 * Uploads a photo to Firebase Storage and adds record to mentorShpeGallery Firestore collection.
 */
export async function uploadMentorGalleryPhoto(
  file: File,
  title: string,
  caption: string,
  adminEmail: string,
  onProgress?: (percent: number) => void
): Promise<MentorShpePhoto> {
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let imageUrl: string;
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const storagePath = `mentorshpe/${Date.now()}_${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  try {
    imageUrl = await new Promise<string>((resolve, reject) => {
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
          console.warn('Firebase Storage upload notice:', error);
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
    console.warn('Firebase Storage direct upload notice, generating optimized client data URL:', storageErr);
    imageUrl = await new Promise<string>((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                const maxDim = 960;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                  if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                  } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                  }
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, w, h);
                  if (onProgress) onProgress(100);
                  resolve(canvas.toDataURL('image/jpeg', 0.75));
                } else {
                  if (onProgress) onProgress(100);
                  resolve(reader.result as string);
                }
              } catch (canvasErr) {
                console.warn('Canvas error:', canvasErr);
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

  const newPhoto: MentorShpePhoto = {
    id: photoId,
    title: title.trim() || 'MentorSHPE Activity',
    caption: caption.trim(),
    imageUrl,
    storagePath,
    uploadedAt: new Date().toISOString(),
    uploadedBy: adminEmail || 'shpetxst@gmail.com',
  };

  try {
    const docRef = doc(db, 'mentorShpeGallery', photoId);
    await setDoc(docRef, {
      ...newPhoto,
      createdAt: serverTimestamp(),
    });
    return newPhoto;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `mentorShpeGallery/${photoId}`);
    throw err;
  }
}

/**
 * Replaces an existing photo's image file or updates title/caption in Firestore.
 */
export async function updateMentorGalleryPhoto(
  photoId: string,
  updates: Partial<MentorShpePhoto>,
  newFile?: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const docRef = doc(db, 'mentorShpeGallery', photoId);
  let newImageUrl = updates.imageUrl;
  let newStoragePath = updates.storagePath;

  if (newFile) {
    try {
      const cleanFileName = newFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      newStoragePath = `mentorshpe/${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, newStoragePath);
      newImageUrl = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, newFile, { contentType: newFile.type });
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              if (onProgress) onProgress(percent);
            }
          },
          (error) => {
            console.warn('Firebase Storage replace notice:', error);
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
      console.warn('Storage replace notice, generating data URL fallback:', storageErr);
      newImageUrl = await new Promise<string>((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const img = new Image();
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  const maxDim = 960;
                  let w = img.width;
                  let h = img.height;
                  if (w > maxDim || h > maxDim) {
                    if (w > h) {
                      h = Math.round((h * maxDim) / w);
                      w = maxDim;
                    } else {
                      w = Math.round((w * maxDim) / h);
                      h = maxDim;
                    }
                  }
                  canvas.width = w;
                  canvas.height = h;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, w, h);
                    if (onProgress) onProgress(100);
                    resolve(canvas.toDataURL('image/jpeg', 0.75));
                  } else {
                    if (onProgress) onProgress(100);
                    resolve(reader.result as string);
                  }
                } catch {
                  resolve(reader.result as string);
                }
              };
              img.onerror = () => resolve(reader.result as string);
              img.src = reader.result as string;
            } catch {
              resolve(reader.result as string);
            }
          };
          reader.onerror = (rErr) => {
            console.error('FileReader error:', rErr);
            reject(new Error('Failed to read image on client.'));
          };
          reader.readAsDataURL(newFile);
        } catch (fErr) {
          reject(fErr instanceof Error ? fErr : new Error('FileReader initialization error.'));
        }
      });
    }
  }

  try {
    await updateDoc(docRef, {
      ...updates,
      ...(newImageUrl ? { imageUrl: newImageUrl } : {}),
      ...(newStoragePath ? { storagePath: newStoragePath } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `mentorShpeGallery/${photoId}`);
    throw err;
  }
}

/**
 * Deletes a photo from the dedicated MentorSHPE gallery and Firebase Storage.
 */
export async function deleteMentorGalleryPhoto(photo: MentorShpePhoto): Promise<void> {
  // 1. Delete from Firebase Storage if storagePath exists
  if (photo.storagePath) {
    try {
      const fileRef = ref(storage, photo.storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Storage delete warning:', err);
    }
  }

  // 2. Delete from Firestore
  const docRef = doc(db, 'mentorShpeGallery', photo.id);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `mentorShpeGallery/${photo.id}`);
    throw err;
  }
}

/**
 * Seeds initial sample photos if gallery collection is empty.
 */
export async function seedInitialMentorPhotosIfEmpty(): Promise<void> {
  try {
    const existing = await getDocs(collection(db, 'mentorShpeGallery'));
    if (!existing.empty) return;

    for (const photo of INITIAL_MENTOR_PHOTOS) {
      await setDoc(doc(db, 'mentorShpeGallery', photo.id), {
        ...photo,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not seed initial mentor photos:', err);
  }
}
