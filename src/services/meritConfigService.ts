import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface MeritCategory {
  id: string;
  name: string;
  points: number;
  description: string;
  tag?: string;
}

export interface MeritConfig {
  categories: MeritCategory[];
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_MERIT_CATEGORIES: MeritCategory[] = [
  {
    id: 'general-meetings',
    name: 'General Meetings',
    points: 5,
    description: 'Bi-weekly chapter meetings in Ingram Hall with food, updates, and guest speakers.',
    tag: 'Core Chapter',
  },
  {
    id: 'prof-dev',
    name: 'Professional Development',
    points: 4,
    description: 'Technical workshops, resume reviews, recruiter presentations, and career panels.',
    tag: 'Career & Tech',
  },
  {
    id: 'athletics',
    name: 'Lonestar Practices & Athletic Events',
    points: 3,
    description: 'Lonestar conference athletic practices, intramural tournaments, and sports matches.',
    tag: 'Athletics & Lonestar',
  },
  {
    id: 'volunteering',
    name: 'Volunteering',
    points: 3,
    description: 'Community STEM outreach, San Marcos cleanups, high school tutoring, and volunteering.',
    tag: 'Service',
  },
  {
    id: 'profit-shares',
    name: 'Profit Shares',
    points: 2,
    description: 'Chapter restaurant profit shares and sponsored fundraising community nights.',
    tag: 'Fundraising',
  },
  {
    id: 'study-nights',
    name: 'Study Nights',
    points: 2,
    description: 'Engineering study sessions, finals review halls, and peer homework collaboration.',
    tag: 'Academics',
  },
  {
    id: 'social-events',
    name: 'Social Events',
    points: 1,
    description: 'Game nights, park tailgates, holiday parties, banquets, and member social mixers.',
    tag: 'Social',
  },
  {
    id: 'social-media',
    name: 'Reposting Social Media Posts',
    points: 0.5,
    description: 'Reposting and amplifying @shpetxst chapter Instagram / LinkedIn announcements and flyers.',
    tag: 'Marketing',
  },
];

/**
 * Fetch merit category point configuration from Firestore
 */
export async function getMeritConfig(): Promise<MeritCategory[]> {
  try {
    const configDocRef = doc(db, 'settings', 'meritConfig');
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data() as MeritConfig;
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        return data.categories;
      }
    }
  } catch (err) {
    console.warn('Could not read meritConfig from Firestore, using defaults:', err);
  }
  return DEFAULT_MERIT_CATEGORIES;
}

/**
 * Save customized merit category point configuration to Firestore (Admin only)
 */
export async function saveMeritConfig(categories: MeritCategory[], adminEmail: string): Promise<void> {
  const configDocRef = doc(db, 'settings', 'meritConfig');
  await setDoc(
    configDocRef,
    {
      categories,
      updatedAt: serverTimestamp(),
      updatedBy: adminEmail,
    },
    { merge: true }
  );
}
