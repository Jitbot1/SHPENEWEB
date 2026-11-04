import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface Committee {
  id: string;
  name: string;
  description: string;
  meetingInfo: string;
  leadOfficer: string;
  leadOfficerRole?: string;
  contactEmail?: string;
  officerEmails: string[];
  updatedAt?: unknown;
  updatedBy?: string;
}

// Strictly restricted to the 6 official committees
export const OFFICIAL_COMMITTEE_IDS = [
  'athletics',
  'events',
  'fundraising',
  'media',
  'shpetinas',
  'technology',
] as const;

export type OfficialCommitteeId = typeof OFFICIAL_COMMITTEE_IDS[number];

export const INITIAL_COMMITTEES: Omit<Committee, 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'athletics',
    name: 'Athletics Committee',
    description: 'Coordinates intramural sports leagues, campus tournaments, fitness challenges, and outdoor recreational events across Texas State.',
    meetingInfo: 'Fridays @ 4:00 PM (Student Rec Center - Field 2)',
    leadOfficer: 'Joaquín Valeriano & Kiana Monsivais',
    leadOfficerRole: 'Co-Directors of Athletics',
    contactEmail: 'shpetxst@gmail.com',
    officerEmails: ['shpetxst@gmail.com'],
  },
  {
    id: 'events',
    name: 'Events & Logistics Committee',
    description: 'Plans general body meetings, company tech talks, auditorium venue reservations, annual banquet gala, and major event logistics.',
    meetingInfo: 'Wednesdays @ 5:00 PM (Ingram Hall 3105)',
    leadOfficer: 'Diego Perez & Sebastian Hernandez',
    leadOfficerRole: 'Co-Directors of Events & Logistics',
    contactEmail: 'shpetxst@gmail.com',
    officerEmails: ['shpetxst@gmail.com'],
  },
  {
    id: 'fundraising',
    name: 'Fundraising & Sponsorship Committee',
    description: 'Coordinates corporate sponsorships, profit shares, merchandise sales, and national conference travel grants for members.',
    meetingInfo: 'Thursdays @ 5:00 PM (Ingram Hall 3204)',
    leadOfficer: 'Cristian Vizcaya & Eladio Gonzalez',
    leadOfficerRole: 'Co-Directors of Fundraising',
    contactEmail: 'shpetxst@gmail.com',
    officerEmails: ['shpetxst@gmail.com'],
  },
  {
    id: 'media',
    name: 'Media & Marketing Committee',
    description: 'Manages chapter social media, professional photography, event flyers, website assets, newsletters, and digital communications.',
    meetingInfo: 'Thursdays @ 6:30 PM (Virtual & Ingram 2101)',
    leadOfficer: 'James Tanner & Vicente Chavez',
    leadOfficerRole: 'Co-Directors of Media',
    contactEmail: 'shpetxst@gmail.com',
    officerEmails: ['shpetxst@gmail.com'],
  },
  {
    id: 'shpetinas',
    name: 'SHPEtinas Committee',
    description: 'Empowers Hispanic women in STEM through mentorship programs, industry panels, community service, and professional leadership workshops.',
    meetingInfo: 'Alternate Tuesdays @ 6:30 PM (Ingram Hall 2201)',
    leadOfficer: 'Alexsandra Luna Gonzalez',
    leadOfficerRole: 'Director of SHPEtinas',
    contactEmail: 'shpetxst@gmail.com',
    officerEmails: ['shpetxst@gmail.com'],
  },
  {
    id: 'technology',
    name: 'Technology Committee',
    description: 'Designs and builds chapter web platforms, coding hackathons, project teams, git workshops, and technical engineering challenges.',
    meetingInfo: 'Mondays @ 5:30 PM (Ingram Hall Tech Lab)',
    leadOfficer: 'Adrian Hackett',
    leadOfficerRole: 'Director of Technology',
    contactEmail: 'shpetxst@gmail.com',
    officerEmails: ['shpetxst@gmail.com'],
  },
];

export function subscribeCommittees(
  onUpdate: (committees: Committee[]) => void,
  onError?: (error: unknown) => void
) {
  const collRef = collection(db, 'committees');
  return onSnapshot(
    collRef,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate(INITIAL_COMMITTEES as Committee[]);
        if (db && typeof window !== 'undefined') {
          seedDefaultCommittees().catch((e) => {
            console.warn('Initial committees seed skipped:', e);
          });
        }
        return;
      }
      const rawCommittees: Committee[] = [];
      snapshot.forEach((docSnap) => {
        // STRICTLY FILTER: Only include the 6 official committees
        if (OFFICIAL_COMMITTEE_IDS.includes(docSnap.id as OfficialCommitteeId)) {
          rawCommittees.push(docSnap.data() as Committee);
        } else {
          // If legacy non-official committee exists in DB, clean it up if admin
          deleteDoc(docSnap.ref).catch(() => {});
        }
      });

      // Ensure all 6 official committees are represented
      const mapped = INITIAL_COMMITTEES.map((initComm) => {
        const found = rawCommittees.find((c) => c.id === initComm.id);
        return found || (initComm as Committee);
      });

      onUpdate(mapped);
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        console.warn('Committees listener warning:', err);
      }
      onUpdate(INITIAL_COMMITTEES as Committee[]);
    }
  );
}

export async function seedDefaultCommittees() {
  try {
    for (const comm of INITIAL_COMMITTEES) {
      await setDoc(
        doc(db, 'committees', comm.id),
        {
          ...comm,
          updatedAt: serverTimestamp(),
          updatedBy: 'system',
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Could not auto-seed committees to Firestore:', err);
  }
}

export async function updateCommittee(
  committeeId: string,
  updates: Partial<Omit<Committee, 'id'>>,
  editorEmail: string
) {
  const commRef = doc(db, 'committees', committeeId);
  try {
    await updateDoc(commRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: editorEmail,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `committees/${committeeId}`);
  }
}
