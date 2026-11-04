import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface SlideshowPhoto {
  id: string;
  slideshowId: string;
  imageUrl: string;
  caption: string;
  uploadedById: string;
  uploadedByEmail: string;
  uploadedAt?: unknown;
}

export interface Slideshow {
  id: string;
  title: string;
  description: string;
  committee: string;
  createdById: string;
  createdByEmail: string;
  designatedUploaderEmail: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const FALLBACK_SLIDESHOW: Slideshow = {
  id: 'ss_featured_events',
  title: 'Chapter Highlights & Conference 2026',
  description: 'Moments from our general meetings, Texas State engineering events, Lonestar competitions, and national conferences.',
  committee: 'Executive Board',
  createdById: 'system',
  createdByEmail: 'shpetxst@gmail.com',
  designatedUploaderEmail: 'shpetxst@gmail.com',
};

export const FALLBACK_PHOTOS: SlideshowPhoto[] = [
  {
    id: 'photo_default_1',
    slideshowId: 'ss_featured_events',
    imageUrl: '/assets/images/SHPENATIONALCONV.jpg',
    caption: 'SHPE Texas State members at the National Convention in California!',
    uploadedById: 'system',
    uploadedByEmail: 'shpetxst@gmail.com',
  },
  {
    id: 'photo_default_2',
    slideshowId: 'ss_featured_events',
    imageUrl: '/assets/images/SHPEACCENTURE.jpg',
    caption: 'Tech Talk & networking dinner with Accenture consultants in Austin.',
    uploadedById: 'system',
    uploadedByEmail: 'shpetxst@gmail.com',
  },
  {
    id: 'photo_default_3',
    slideshowId: 'ss_featured_events',
    imageUrl: '/assets/images/Athletics_gallery/IMG_7292.jpg',
    caption: 'Intramural Soccer champions representing our Bobcat familia!',
    uploadedById: 'system',
    uploadedByEmail: 'shpetxst@gmail.com',
  },
  {
    id: 'photo_default_4',
    slideshowId: 'ss_featured_events',
    imageUrl: '/assets/images/SHPEtinas_events/IMG_7301.JPG',
    caption: 'SHPEtinas conference mentorship circle discussing career milestones.',
    uploadedById: 'system',
    uploadedByEmail: 'shpetxst@gmail.com',
  },
];

export function subscribeSlideshows(
  onUpdate: (slideshows: Slideshow[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'slideshows');
  return onSnapshot(
    collRef,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate([FALLBACK_SLIDESHOW]);
        seedDefaultSlideshow().catch((e) => {
          console.warn('Initial slideshow seed skipped:', e);
        });
        return;
      }
      const list: Slideshow[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Slideshow);
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        console.warn('Slideshow listener warning:', err);
      }
    }
  );
}

export function subscribeSlideshowPhotos(
  slideshowId: string,
  onUpdate: (photos: SlideshowPhoto[]) => void,
  onError?: (err: unknown) => void
) {
  const collRef = collection(db, 'slideshows', slideshowId, 'photos');
  return onSnapshot(
    collRef,
    (snapshot) => {
      if (snapshot.empty && slideshowId === FALLBACK_SLIDESHOW.id) {
        onUpdate(FALLBACK_PHOTOS);
        return;
      }
      const list: SlideshowPhoto[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SlideshowPhoto);
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        console.warn('Photos listener warning:', err);
      }
    }
  );
}

export async function createSlideshow(data: {
  title: string;
  description: string;
  committee: string;
  createdById: string;
  createdByEmail: string;
  designatedUploaderEmail: string;
}) {
  const newId = `ss_${Date.now()}`;
  const docRef = doc(db, 'slideshows', newId);
  const newSlideshow: Slideshow = {
    id: newId,
    title: data.title.trim(),
    description: data.description.trim(),
    committee: data.committee.trim() || 'General',
    createdById: data.createdById,
    createdByEmail: data.createdByEmail,
    designatedUploaderEmail: data.designatedUploaderEmail.trim().toLowerCase(),
  };

  try {
    await setDoc(docRef, {
      ...newSlideshow,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `slideshows/${newId}`);
  }
}

export async function deleteSlideshow(slideshowId: string) {
  const docRef = doc(db, 'slideshows', slideshowId);
  try {
    // Delete subcollection photos first
    const photosSnap = await getDocs(collection(db, 'slideshows', slideshowId, 'photos'));
    for (const p of photosSnap.docs) {
      await deleteDoc(p.ref);
    }
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `slideshows/${slideshowId}`);
  }
}

export async function uploadPhotoToSlideshow(data: {
  slideshowId: string;
  imageUrl: string;
  caption: string;
  uploadedById: string;
  uploadedByEmail: string;
}) {
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const photoRef = doc(db, 'slideshows', data.slideshowId, 'photos', photoId);

  const newPhoto: SlideshowPhoto = {
    id: photoId,
    slideshowId: data.slideshowId,
    imageUrl: data.imageUrl,
    caption: data.caption.trim(),
    uploadedById: data.uploadedById,
    uploadedByEmail: data.uploadedByEmail,
  };

  try {
    await setDoc(photoRef, {
      ...newPhoto,
      uploadedAt: serverTimestamp(),
    });
    return photoId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `slideshows/${data.slideshowId}/photos/${photoId}`);
  }
}

export async function deletePhoto(slideshowId: string, photoId: string) {
  const photoRef = doc(db, 'slideshows', slideshowId, 'photos', photoId);
  try {
    await deleteDoc(photoRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `slideshows/${slideshowId}/photos/${photoId}`);
  }
}

// Client-side image compressor for seamless file uploads
export function compressImageFile(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
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
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function seedDefaultSlideshow() {
  try {
    const existing = await getDocs(collection(db, 'slideshows'));
    if (!existing.empty) return;

    const defaultId = 'ss_featured_events';
    await setDoc(doc(db, 'slideshows', defaultId), {
      id: defaultId,
      title: 'Chapter Highlights & Conference 2026',
      description: 'Moments from our general meetings, Texas State engineering events, Lonestar competitions, and national conferences.',
      committee: 'Executive Board',
      createdById: 'system',
      createdByEmail: 'shpetxst@gmail.com',
      designatedUploaderEmail: 'shpetxst@gmail.com',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const defaultPhotos = [
      {
        id: 'photo_default_1',
        slideshowId: defaultId,
        imageUrl: '/assets/images/SHPENATIONALCONV.jpg',
        caption: 'SHPE Texas State members at the National Convention in California!',
        uploadedById: 'system',
        uploadedByEmail: 'shpetxst@gmail.com',
      },
      {
        id: 'photo_default_2',
        slideshowId: defaultId,
        imageUrl: '/assets/images/SHPEACCENTURE.jpg',
        caption: 'Tech Talk & networking dinner with Accenture consultants in Austin.',
        uploadedById: 'system',
        uploadedByEmail: 'shpetxst@gmail.com',
      },
      {
        id: 'photo_default_3',
        slideshowId: defaultId,
        imageUrl: '/assets/images/Athletics_gallery/IMG_7292.jpg',
        caption: 'Intramural Soccer champions representing our Bobcat familia!',
        uploadedById: 'system',
        uploadedByEmail: 'shpetxst@gmail.com',
      },
      {
        id: 'photo_default_4',
        slideshowId: defaultId,
        imageUrl: '/assets/images/SHPEtinas_events/IMG_7301.JPG',
        caption: 'SHPEtinas conference mentorship circle discussing career milestones.',
        uploadedById: 'system',
        uploadedByEmail: 'shpetxst@gmail.com',
      },
    ];

    for (const p of defaultPhotos) {
      await setDoc(doc(db, 'slideshows', defaultId, 'photos', p.id), {
        ...p,
        uploadedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not auto-seed slideshow to Firestore:', err);
  }
}
