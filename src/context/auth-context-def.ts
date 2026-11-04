import { createContext } from 'react';
import { User } from 'firebase/auth';

export type UserRole = 'officer' | 'member' | 'non_member';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  fullName?: string;
  isShpetinasMember?: boolean;
  showOnLeaderboard?: boolean;
  photoURL?: string;
  role: UserRole;
  netid?: string;
  major?: string;
  gradYear?: string;
  studentId?: string;
  isPaidMember?: boolean;
  isDuePaying?: boolean;
  meritPoints?: number;
  attendanceCount?: number;
  attendanceHistory?: Array<{ eventName: string; pointsAwarded: number; timestamp: string; scannedBy?: string }>;
  membershipVerifiedAt?: string;
  membershipVerifiedBy?: string;
  membershipYear?: string;
  txstateVerified?: boolean;
  isNetIDVerified?: boolean;
  netIdVerificationCode?: string;
  codeExpiresAt?: string;
  netIdVerification?: {
    code?: string;
    expiresAt?: string;
  };
  txstateEmail?: string;
  committee?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  isMember: boolean;
  isPaidMember: boolean;
  isDuePaying: boolean;
  meritPoints: number;
  isNonMember: boolean;
  isTxStateEmail: boolean;
  isEmailVerified: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserRole: (targetUid: string, role: UserRole, committee?: string) => Promise<void>;
  updateProfileInfo: (updates: Partial<UserProfile>) => Promise<void>;
  verifyUserMembership: (targetUid: string, isPaid: boolean, membershipYear?: string) => Promise<void>;
  updateDuePayingStatus: (targetUid: string, isDuePaying: boolean) => Promise<void>;
  awardMeritPoints: (targetUid: string, points: number, eventName: string) => Promise<{ success: boolean; newTotal: number; memberName: string }>;
  adminUpdateUserPoints: (targetUid: string, newPoints: number) => Promise<void>;
  adminVerifyNetId: (targetUid: string, isVerified?: boolean) => Promise<void>;
  sendNetIdVerificationCode: (netIdOrEmail: string) => Promise<{ success: boolean; email: string; netid: string; message: string; expiresAt?: string }>;
  verifyNetIdCode: (code: string) => Promise<{ success: boolean; message: string }>;
  submitNetIdVerification: (netId: string) => Promise<{ success: boolean; email: string; message: string }>;
  applyVerificationCode: (codeOrUrl: string) => Promise<{ success: boolean; email?: string; message: string }>;
  resendVerificationLink: () => Promise<void>;
  reloadUserVerification: () => Promise<boolean>;
  setLeaderboardPrivacy: (showOnLeaderboard: boolean) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
