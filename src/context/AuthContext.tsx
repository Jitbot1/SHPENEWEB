import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  applyActionCode,
  deleteUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { AuthContext, UserProfile, UserRole } from './auth-context-def';
import { 
  generateAndSendNetIdCode, 
  verifyNetIdCodeSubmit 
} from '../services/otpVerificationService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authVersion, setAuthVersion] = useState<number>(0);

  useEffect(() => {
    // Catch Firebase auth action codes if user opens verification link that redirected here
    const checkUrlActionCode = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const oobCode = params.get('oobCode');
        const mode = params.get('mode');
        if (oobCode && (mode === 'verifyAndChangeEmail' || mode === 'verifyEmail')) {
          await applyActionCode(auth, oobCode);
          if (auth.currentUser) {
            await auth.currentUser.reload();
            setAuthVersion((v) => v + 1);
            setUser(auth.currentUser);
          }
          // Clean URL params so it doesn't re-trigger on subsequent re-renders
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (e) {
        console.warn('Auto action code handling warning:', e);
      }
    };
    checkUrlActionCode();
  }, []);

  const reloadUserVerification = useCallback(async () => {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
      setAuthVersion((v) => v + 1);
      setUser(auth.currentUser);

      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as UserProfile;
        setUserProfile(data);
        return data.isNetIDVerified === true;
      }
    } catch (err) {
      console.warn('Reload user verification notice:', err);
    }
    return false;
  }, []);

  // Auto-check verification status when user returns to window/tab
  useEffect(() => {
    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        if (!userProfile?.isNetIDVerified) {
          await reloadUserVerification();
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [reloadUserVerification, userProfile?.isNetIDVerified]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!currentUser) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Reload user from Firebase to ensure latest state
      try {
        await currentUser.reload();
      } catch (reloadErr) {
        console.warn('User silent reload warning:', reloadErr);
      }

      const activeUser = auth.currentUser || currentUser;
      setUser(activeUser);

      try {
        const userDocRef = doc(db, 'users', activeUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        const emailLower = (activeUser.email || '').toLowerCase();
        const isBootstrapAdmin = emailLower === 'shpetxst@gmail.com';

        if (!userDocSnap.exists()) {
          const isTxStateDirect = emailLower.endsWith('@txstate.edu');
          const initialRole: UserRole = isBootstrapAdmin ? 'officer' : 'non_member';
          const newProfile: UserProfile = {
            uid: activeUser.uid,
            email: activeUser.email || '',
            displayName: activeUser.displayName || 'SHPE Member',
            fullName: activeUser.displayName || '',
            isShpetinasMember: false,
            showOnLeaderboard: true,
            photoURL: activeUser.photoURL || '',
            role: initialRole,
            major: 'Engineering',
            gradYear: '2027',
            studentId: '',
            isPaidMember: isBootstrapAdmin,
            isDuePaying: isBootstrapAdmin,
            meritPoints: isBootstrapAdmin ? 50 : 0,
            attendanceCount: 0,
            attendanceHistory: [],
            membershipYear: '2026-2027',
            isNetIDVerified: isBootstrapAdmin,
            txstateVerified: isBootstrapAdmin,
            txstateEmail: isTxStateDirect ? emailLower : '',
            committee: isBootstrapAdmin ? 'Executive Board' : 'General',
          };

          try {
            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${activeUser.uid}`);
          }
          setUserProfile(newProfile);
        } else {
          const existingData = userDocSnap.data() as UserProfile;

          if (isBootstrapAdmin && (existingData.role !== 'officer' || !existingData.isNetIDVerified)) {
            await updateDoc(userDocRef, {
              role: 'officer',
              isPaidMember: true,
              isNetIDVerified: true,
              txstateVerified: true,
              updatedAt: serverTimestamp()
            });
            existingData.role = 'officer';
            existingData.isPaidMember = true;
            existingData.isNetIDVerified = true;
          }

          if (existingData.showOnLeaderboard === undefined) {
            existingData.showOnLeaderboard = true;
          }

          setUserProfile(existingData);
        }

        // Subscribe to real-time profile updates in Firestore
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const liveData = docSnap.data() as UserProfile;
              setUserProfile({
                ...liveData,
                uid: docSnap.id,
                showOnLeaderboard: liveData.showOnLeaderboard ?? true,
              });
            }
          },
          (snapshotErr) => {
            console.warn('Real-time profile subscription notice:', snapshotErr);
          }
        );
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (targetUid: string, role: UserRole, committee?: string) => {
    const targetRef = doc(db, 'users', targetUid);
    const updates: Partial<UserProfile> = {
      role,
      updatedAt: serverTimestamp(),
    };
    if (committee !== undefined) {
      updates.committee = committee;
    }
    try {
      await updateDoc(targetRef, updates);
      if (user?.uid === targetUid) {
        setUserProfile((prev) => prev ? ({ ...prev, ...updates }) : prev);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const updateProfileInfo = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const targetRef = doc(db, 'users', user.uid);
    const sanitizedUpdates: Partial<UserProfile> = { ...updates };
    if (sanitizedUpdates.fullName && !sanitizedUpdates.displayName) {
      sanitizedUpdates.displayName = sanitizedUpdates.fullName;
    }
    try {
      await updateDoc(targetRef, {
        ...sanitizedUpdates,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => prev ? ({ ...prev, ...sanitizedUpdates }) : prev);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const setLeaderboardPrivacy = async (showOnLeaderboard: boolean) => {
    if (!user) return;
    const targetRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(targetRef, {
        showOnLeaderboard,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => prev ? ({ ...prev, showOnLeaderboard }) : prev);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      throw err;
    }
  };

  const verifyUserMembership = async (targetUid: string, isPaid: boolean, membershipYear = '2026-2027') => {
    const targetRef = doc(db, 'users', targetUid);
    try {
      await updateDoc(targetRef, {
        isPaidMember: isPaid,
        isDuePaying: isPaid,
        role: isPaid ? 'member' : 'non_member',
        membershipYear,
        membershipVerifiedAt: serverTimestamp(),
        membershipVerifiedBy: user?.email || 'shpetxst@gmail.com',
        updatedAt: serverTimestamp(),
      });
      if (user?.uid === targetUid) {
        setUserProfile((prev) => prev ? ({
          ...prev,
          isPaidMember: isPaid,
          isDuePaying: isPaid,
          role: isPaid ? 'member' : 'non_member',
        }) : prev);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const updateDuePayingStatus = async (targetUid: string, isDuePaying: boolean) => {
    const targetRef = doc(db, 'users', targetUid);
    try {
      await updateDoc(targetRef, {
        isDuePaying,
        isPaidMember: isDuePaying,
        role: isDuePaying ? 'member' : 'non_member',
        membershipVerifiedAt: isDuePaying ? new Date().toISOString() : null,
        membershipVerifiedBy: user?.email || 'shpetxst@gmail.com',
        updatedAt: serverTimestamp(),
      });
      if (user?.uid === targetUid) {
        setUserProfile((prev) => prev ? ({
          ...prev,
          isDuePaying,
          isPaidMember: isDuePaying,
          role: isDuePaying ? 'member' : 'non_member',
        }) : prev);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const awardMeritPoints = async (targetUid: string, points: number, eventName: string) => {
    if (!isAdmin && !isOfficer) {
      throw new Error('Only chapter officers and administrators can scan and award merit points.');
    }
    const targetRef = doc(db, 'users', targetUid);
    const snap = await getDoc(targetRef);
    if (!snap.exists()) {
      throw new Error('Member profile not found in chapter directory.');
    }

    const memberData = snap.data() as UserProfile;
    const isDuePayingMember = memberData.isDuePaying === true || memberData.isPaidMember === true;
    if (!isDuePayingMember) {
      throw new Error(
        `Points Blocked: ${memberData.fullName || memberData.displayName || 'Member'} (${memberData.netid || 'No NetID'}) is not a due-paying member. Only due-paying members can earn merit points. Prompt member to pay chapter dues.`
      );
    }

    const currentPoints = Number(memberData.meritPoints || 0);
    const currentAttendance = Number(memberData.attendanceCount || 0);
    const newTotal = currentPoints + points;

    const newAttendanceItem = {
      eventName,
      pointsAwarded: points,
      timestamp: new Date().toISOString(),
      scannedBy: user?.email || 'shpetxst@gmail.com',
    };

    const existingHistory = Array.isArray(memberData.attendanceHistory) ? memberData.attendanceHistory : [];
    const updatedHistory = [newAttendanceItem, ...existingHistory].slice(0, 50);

    try {
      await updateDoc(targetRef, {
        meritPoints: newTotal,
        attendanceCount: currentAttendance + 1,
        attendanceHistory: updatedHistory,
        updatedAt: serverTimestamp(),
      });

      if (user?.uid === targetUid) {
        setUserProfile((prev) => prev ? ({
          ...prev,
          meritPoints: newTotal,
          attendanceCount: currentAttendance + 1,
          attendanceHistory: updatedHistory,
        }) : prev);
      }

      return {
        success: true,
        newTotal,
        memberName: memberData.fullName || memberData.displayName || memberData.email,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const adminUpdateUserPoints = async (targetUid: string, newPoints: number) => {
    if (!isAdmin) {
      throw new Error("Only administrators (shpetxst@gmail.com) can modify member points.");
    }
    const cleanPoints = Math.max(0, Number(newPoints) || 0);
    const targetRef = doc(db, "users", targetUid);
    try {
      await updateDoc(targetRef, {
        meritPoints: cleanPoints,
        updatedAt: serverTimestamp(),
      });
      if (user?.uid === targetUid) {
        setUserProfile((prev) => prev ? ({
          ...prev,
          meritPoints: cleanPoints,
        }) : prev);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "users/" + targetUid);
      throw err;
    }
  };

  const adminVerifyNetId = async (targetUid: string, isVerified = true) => {
    if (!isAdmin) {
      throw new Error("Only administrators (shpetxst@gmail.com) can manually verify NetID.");
    }
    const targetRef = doc(db, "users", targetUid);
    try {
      await updateDoc(targetRef, {
        isNetIDVerified: isVerified,
        txstateVerified: isVerified,
        isVerified: isVerified,
        emailVerified: isVerified,
        netidVerifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (user?.uid === targetUid) {
        setUserProfile((prev) => prev ? ({
          ...prev,
          isNetIDVerified: isVerified,
          txstateVerified: isVerified,
          isVerified: isVerified,
          emailVerified: isVerified,
        }) : prev);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "users/" + targetUid);
      throw err;
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) throw new Error('No user is currently signed in.');
    const userToDelete = auth.currentUser;
    const uid = userToDelete.uid;

    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
    } catch (dbErr) {
      console.warn('Error deleting user Firestore document:', dbErr);
    }

    try {
      await deleteUser(userToDelete);
      setUser(null);
      setUserProfile(null);
    } catch (authErr: unknown) {
      const err = authErr as { code?: string; message?: string };
      if (err.code === 'auth/requires-recent-login') {
        throw new Error('For security reasons, deleting your account requires a fresh login. Please sign out and sign back in, then click Delete Account.');
      }
      throw new Error(err.message || 'Failed to delete account.');
    }
  };

  // STEP 2: Send 6-Digit Email Verification Code to [NetID]@txstate.edu
  const sendNetIdVerificationCode = async (netIdOrEmail: string) => {
    if (!auth.currentUser) throw new Error('You must be signed in.');
    const result = await generateAndSendNetIdCode({
      currentUser: auth.currentUser,
      netIdOrEmail,
    });

    setUserProfile((prev) => prev ? ({
      ...prev,
      netid: result.netid,
      studentId: result.netid,
      txstateEmail: result.email,
      codeExpiresAt: result.expiresAt,
      isNetIDVerified: false,
    }) : prev);

    return result;
  };

  // STEP 3: Verify 6-Digit Code and Update State
  const verifyNetIdCode = async (enteredCode: string) => {
    if (!auth.currentUser) throw new Error('You must be signed in.');
    const result = await verifyNetIdCodeSubmit({
      currentUser: auth.currentUser,
      enteredCode,
    });

    setUserProfile((prev) => prev ? ({
      ...prev,
      isNetIDVerified: true,
      txstateVerified: true,
      isVerified: true,
      emailVerified: true,
      netIdVerificationCode: undefined,
      codeExpiresAt: undefined,
      netIdVerification: undefined,
    }) : prev);

    return result;
  };

  const submitNetIdVerification = async (netIdInput: string) => {
    return sendNetIdVerificationCode(netIdInput);
  };

  const applyVerificationCode = async (codeOrUrl: string) => {
    if (!auth.currentUser) throw new Error('You must be signed in.');
    const input = codeOrUrl.trim();
    if (!input) throw new Error('Please enter or paste your verification link or action code.');

    let extractedCode = input;
    if (input.includes('oobCode=')) {
      try {
        const urlObj = new URL(input);
        const codeParam = urlObj.searchParams.get('oobCode');
        if (codeParam) extractedCode = codeParam;
      } catch {
        const match = input.match(/[?&]oobCode=([^&#\s]+)/);
        if (match && match[1]) {
          extractedCode = decodeURIComponent(match[1]);
        }
      }
    }

    try {
      await applyActionCode(auth, extractedCode);
    } catch (actionErr: unknown) {
      const err = actionErr as { code?: string; message?: string };
      if (err.code === 'auth/invalid-action-code') {
        throw new Error('This verification link or code is invalid, expired, or has already been used.');
      }
      if (err.code === 'auth/expired-action-code') {
        throw new Error('This verification link or code has expired.');
      }
      throw new Error(err.message || 'Failed to apply verification code.');
    }

    await auth.currentUser.reload();
    setAuthVersion((v) => v + 1);
    const refreshedUser = auth.currentUser;
    setUser(refreshedUser);

    return {
      success: true,
      email: refreshedUser.email || undefined,
      message: `Verification code registered for ${refreshedUser.email || 'Bobcat'}.`,
    };
  };

  const resendVerificationLink = async () => {
    if (!auth.currentUser) throw new Error('You must be signed in.');
    const targetNetId = userProfile?.netid || (userProfile?.txstateEmail ? userProfile.txstateEmail.split('@')[0] : null);
    if (targetNetId) {
      await sendNetIdVerificationCode(targetNetId);
    } else {
      const continueUrl = window.location.origin;
      await sendEmailVerification(auth.currentUser, {
        url: continueUrl,
        handleCodeInApp: false,
      });
    }
  };

  const isAdmin = useMemo(() => {
    return user ? user.email?.toLowerCase() === 'shpetxst@gmail.com' : false;
  }, [user]);

  const isOfficer = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    return userProfile?.role === 'officer';
  }, [user, userProfile, isAdmin]);

  const isMember = useMemo(() => {
    if (!user) return false;
    return userProfile?.role === 'member' || userProfile?.role === 'officer';
  }, [user, userProfile]);

  const isPaidMember = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    return userProfile?.isPaidMember === true || userProfile?.isDuePaying === true;
  }, [user, isAdmin, userProfile]);

  const isDuePaying = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    return userProfile?.isDuePaying === true || userProfile?.isPaidMember === true;
  }, [user, isAdmin, userProfile]);

  const meritPoints = useMemo(() => {
    return Number(userProfile?.meritPoints || 0);
  }, [userProfile]);

  const isNonMember = useMemo(() => {
    if (!user) return true;
    return userProfile?.role === 'non_member';
  }, [user, userProfile]);

  // Enforces that isNetIDVerified MUST be true in Firestore (or user is admin) to unlock dashboard
  const isEmailVerified = useMemo(() => {
    void authVersion;
    if (!user && !auth.currentUser) return false;
    if (isAdmin) return true;
    return userProfile?.isNetIDVerified === true;
  }, [user, isAdmin, authVersion, userProfile]);

  const isTxStateEmail = useMemo(() => {
    void authVersion;
    if (!user && !auth.currentUser) return false;
    if (isAdmin) return true;
    return userProfile?.isNetIDVerified === true;
  }, [user, isAdmin, authVersion, userProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAdmin,
        isOfficer,
        isMember,
        isPaidMember,
        isDuePaying,
        meritPoints,
        isNonMember,
        isTxStateEmail,
        isEmailVerified,
        signInWithGoogle,
        signOut,
        deleteAccount,
        updateUserRole,
        updateProfileInfo,
        verifyUserMembership,
        updateDuePayingStatus,
        awardMeritPoints,
        adminUpdateUserPoints,
        adminVerifyNetId,
        sendNetIdVerificationCode,
        verifyNetIdCode,
        submitNetIdVerification,
        applyVerificationCode,
        resendVerificationLink,
        reloadUserVerification,
        setLeaderboardPrivacy,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
