import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';

export interface SiteImageRecord {
  id: string;
  category: 'hero' | 'officers' | 'sponsors' | 'events' | 'committees' | 'branding';
  title: string;
  description: string;
  currentUrl: string;
  defaultUrl: string;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_SITE_IMAGES: SiteImageRecord[] = [
  {
    id: 'hero_slide_1',
    category: 'hero',
    title: 'Hero Banner: Slide 1 (Convention)',
    description: 'Main background image shown on the landing page hero section.',
    currentUrl: '/images/hero/hero1.JPG',
    defaultUrl: '/images/hero/hero1.JPG',
  },
  {
    id: 'hero_slide_2',
    category: 'hero',
    title: 'Hero Banner: Slide 2 (General Body)',
    description: 'Second rotational hero banner photo of chapter members.',
    currentUrl: '/images/hero/hero2.JPG',
    defaultUrl: '/images/hero/hero2.JPG',
  },
  {
    id: 'hero_slide_3',
    category: 'hero',
    title: 'Hero Banner: Slide 3 (Leadership)',
    description: 'Third rotational hero banner photo of chapter officers.',
    currentUrl: '/images/hero/hero3.JPG',
    defaultUrl: '/images/hero/hero3.JPG',
  },
  {
    id: 'brand_logo',
    category: 'branding',
    title: 'Official Chapter Logo',
    description: 'Primary Texas State SHPE vector / raster emblem displayed in header and navigation.',
    currentUrl: '/assets/icons/logo.svg',
    defaultUrl: '/assets/icons/logo.svg',
  },
  {
    id: 'event_showcase_convention',
    category: 'events',
    title: 'National Convention California Showcase',
    description: 'Main photo featured across event galleries and convention briefings.',
    currentUrl: '/assets/images/SHPENATIONALCONV.jpg',
    defaultUrl: '/assets/images/SHPENATIONALCONV.jpg',
  },
  {
    id: 'event_showcase_tech',
    category: 'events',
    title: 'Corporate Networking & Tech Talk',
    description: 'Industry meeting photo with Accenture and corporate partners.',
    currentUrl: '/assets/images/SHPEACCENTURE.jpg',
    defaultUrl: '/assets/images/SHPEACCENTURE.jpg',
  },
  {
    id: 'event_athletics_soccer',
    category: 'events',
    title: 'Intramural Athletics Championship',
    description: 'Athletics photo of soccer and volleyball teams at the Rec Center.',
    currentUrl: '/assets/images/Athletics_gallery/IMG_7292.jpg',
    defaultUrl: '/assets/images/Athletics_gallery/IMG_7292.jpg',
  },
  {
    id: 'event_shpetinas_conference',
    category: 'events',
    title: 'SHPEtinas Empowerment Workshop',
    description: 'Sisterhood mentorship and leadership conference snapshot.',
    currentUrl: '/assets/images/SHPEtinas_events/IMG_7301.JPG',
    defaultUrl: '/assets/images/SHPEtinas_events/IMG_7301.JPG',
  },
];

export async function uploadToFirebaseStorage(
  file: File, 
  storageFolder: string = 'site_assets',
  onProgress?: (percent: number) => void
): Promise<string> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const storagePath = `${storageFolder}/${Date.now()}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

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
          console.warn('Firebase Storage uploadTask interrupted, activating fallback:', error);
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
    console.warn('Firebase Storage direct upload notice, generating optimized client data URL fallback:', storageErr);
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

export function subscribeSiteImages(
  onUpdate: (images: SiteImageRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'siteImages');

  return onSnapshot(
    collRef,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_SITE_IMAGES);
        if (db && typeof window !== 'undefined') {
          seedDefaultSiteImages().catch((e) => {
            console.warn('Initial site images seed skipped:', e);
          });
        }
        return;
      }

      const list: SiteImageRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SiteImageRecord);
      });

      // Merge with defaults to ensure all keys exist
      const merged = DEFAULT_SITE_IMAGES.map((def) => {
        const found = list.find((item) => item.id === def.id);
        return found || def;
      });

      onUpdate(merged);
    },
    (err) => {
      if (onError) onError(err);
      onUpdate(DEFAULT_SITE_IMAGES);
    }
  );
}

export async function updateSiteImage(
  imageId: string,
  newUrl: string,
  editorEmail: string
) {
  const docRef = doc(db, 'siteImages', imageId);
  try {
    const existingDef = DEFAULT_SITE_IMAGES.find((i) => i.id === imageId);
    await setDoc(
      docRef,
      {
        id: imageId,
        category: existingDef?.category || 'branding',
        title: existingDef?.title || imageId,
        description: existingDef?.description || '',
        defaultUrl: existingDef?.defaultUrl || newUrl,
        currentUrl: newUrl,
        updatedAt: serverTimestamp(),
        updatedBy: editorEmail,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `siteImages/${imageId}`);
  }
}

export async function seedDefaultSiteImages() {
  try {
    const existing = await getDocs(collection(db, 'siteImages'));
    if (!existing.empty) return;

    for (const img of DEFAULT_SITE_IMAGES) {
      await setDoc(doc(db, 'siteImages', img.id), {
        ...img,
        updatedAt: serverTimestamp(),
        updatedBy: 'system',
      });
    }
  } catch (err) {
    console.warn('Could not auto-seed site images:', err);
  }
}
