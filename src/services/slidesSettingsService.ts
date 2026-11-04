import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export const DEFAULT_GOOGLE_SLIDES_EMBED =
  'https://docs.google.com/presentation/d/e/2PACX-1vQW6l_example_events/embed?start=true&loop=true&delayms=4000';

export function formatGoogleSlidesEmbedUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If already an embed url
  if (trimmed.includes('docs.google.com/presentation') && trimmed.includes('/embed')) {
    if (!trimmed.includes('delayms')) {
      const separator = trimmed.includes('?') ? '&' : '?';
      return `${trimmed}${separator}start=true&loop=true&delayms=4000`;
    }
    return trimmed;
  }

  // Published to web link (/pub)
  if (trimmed.includes('docs.google.com/presentation') && trimmed.includes('/pub')) {
    const embedUrl = trimmed.replace('/pub', '/embed');
    if (!embedUrl.includes('delayms')) {
      const separator = embedUrl.includes('?') ? '&' : '?';
      return `${embedUrl}${separator}start=true&loop=true&delayms=4000`;
    }
    return embedUrl;
  }

  // Published web /d/e/2PACX-.../
  const pubMatch = trimmed.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pubMatch && pubMatch[1]) {
    return `https://docs.google.com/presentation/d/e/${pubMatch[1]}/embed?start=true&loop=true&delayms=4000`;
  }

  // Standard presentation ID extraction: /presentation/d/{ID}
  const idMatch = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://docs.google.com/presentation/d/${idMatch[1]}/embed?start=true&loop=true&delayms=4000`;
  }

  // If user only provided the presentation ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return `https://docs.google.com/presentation/d/${trimmed}/embed?start=true&loop=true&delayms=4000`;
  }

  return trimmed;
}

export function subscribeEventsGoogleSlideUrl(
  onUpdate: (url: string) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, 'settings', 'events_slides');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate(data.value || '');
      } else {
        onUpdate('');
      }
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        console.warn('Google slides setting warning:', err);
      }
    }
  );
}

export async function updateEventsGoogleSlideUrl(rawUrl: string, editorEmail: string) {
  const formattedUrl = formatGoogleSlidesEmbedUrl(rawUrl);
  const docRef = doc(db, 'settings', 'events_slides');
  try {
    await setDoc(docRef, {
      id: 'events_slides',
      value: formattedUrl,
      rawInput: rawUrl.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: editorEmail,
    });
    return formattedUrl;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/events_slides');
  }
}
