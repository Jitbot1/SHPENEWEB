import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface SpotlightItemConfig {
  mode: 'auto' | 'custom';
  monthTitle: string; // e.g. "November 2026"
  memberUid?: string;
  customName?: string;
  customMajor?: string;
  customNetId?: string;
  customPoints?: number;
  customPhotoURL?: string;
  customQuote?: string;
  customBadge?: string;
}

export interface SpotlightsConfig {
  memberOfTheMonth: SpotlightItemConfig;
  shpetinaOfTheMonth: SpotlightItemConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SPOTLIGHTS_CONFIG: SpotlightsConfig = {
  memberOfTheMonth: {
    mode: 'auto',
    monthTitle: 'Member of the Month Spotlight',
    customBadge: 'Top Chapter Achiever & Active Bobcat',
    customQuote: 'Recognized for exceptional chapter involvement, event participation, and academic leadership!',
  },
  shpetinaOfTheMonth: {
    mode: 'auto',
    monthTitle: 'SHPEtina of the Month Spotlight',
    customBadge: 'Leading Latina in STEM & Sisterhood Ambassador',
    customQuote: 'Honored for outstanding engagement, empowerment, and academic excellence in SHPEtinas!',
  },
};

export const SPOTLIGHTS_DOC_PATH = 'settings/meritSpotlights';

/**
 * Fetch current spotlight settings from Firestore
 */
export async function getSpotlightsConfig(): Promise<SpotlightsConfig> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'meritSpotlights'));
    if (snap.exists()) {
      const data = snap.data() as Partial<SpotlightsConfig>;
      return {
        memberOfTheMonth: {
          ...DEFAULT_SPOTLIGHTS_CONFIG.memberOfTheMonth,
          ...(data.memberOfTheMonth || {}),
        },
        shpetinaOfTheMonth: {
          ...DEFAULT_SPOTLIGHTS_CONFIG.shpetinaOfTheMonth,
          ...(data.shpetinaOfTheMonth || {}),
        },
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
    return DEFAULT_SPOTLIGHTS_CONFIG;
  } catch (err) {
    console.warn('Could not read spotlights config:', err);
    return DEFAULT_SPOTLIGHTS_CONFIG;
  }
}

/**
 * Save customized spotlights config to Firestore (restricted to shpetxst@gmail.com)
 */
export async function saveSpotlightsConfig(
  config: SpotlightsConfig,
  adminEmail: string
): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'meritSpotlights');
    await setDoc(docRef, {
      memberOfTheMonth: config.memberOfTheMonth,
      shpetinaOfTheMonth: config.shpetinaOfTheMonth,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
      timestamp: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, SPOTLIGHTS_DOC_PATH);
    throw err;
  }
}
