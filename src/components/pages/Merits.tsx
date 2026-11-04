import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  CreditCard,
  Edit3,
  X,
  Check,
  Calendar,
  Heart,
  Crown,
  Globe,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, UserProfile } from '../../context/useAuth';
import { 
  DEFAULT_MERIT_CATEGORIES, 
  MeritCategory, 
  saveMeritConfig 
} from '../../services/meritConfigService';
import { 
  DEFAULT_SPOTLIGHTS_CONFIG, 
  SpotlightsConfig, 
  saveSpotlightsConfig 
} from '../../services/spotlightsService';

export const Merits: React.FC = () => {
  const { user, isAdmin, isDuePaying, meritPoints, userProfile } = useAuth();
  
  // Public Leaderboard State (Accessible without sign in)
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserProfile[]>([]);
  const [allChapterMembers, setAllChapterMembers] = useState<UserProfile[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Leaderboard Tab Selection ('main' = All Chapter Members, 'shpetinas' = SHPEtinas Members)
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'main' | 'shpetinas'>('main');

  // Dynamic Event Categories & Points
  const [categories, setCategories] = useState<MeritCategory[]>(DEFAULT_MERIT_CATEGORIES);

  // Spotlights State (Member of the Month & SHPEtina of the Month)
  const [spotlightsConfig, setSpotlightsConfig] = useState<SpotlightsConfig>(DEFAULT_SPOTLIGHTS_CONFIG);
  const [isSpotlightModalOpen, setIsSpotlightModalOpen] = useState(false);
  const [spotlightModalTab, setSpotlightModalTab] = useState<'member' | 'shpetina'>('member');
  const [editableSpotlights, setEditableSpotlights] = useState<SpotlightsConfig>(DEFAULT_SPOTLIGHTS_CONFIG);
  const [isSavingSpotlights, setIsSavingSpotlights] = useState(false);
  const [spotlightFeedback, setSpotlightFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Point Categories Admin Controls State
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [editableCategories, setEditableCategories] = useState<MeritCategory[]>(DEFAULT_MERIT_CATEGORIES);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Subscribe to live dynamic merit point categories from Firestore
  useEffect(() => {
    const configDocRef = doc(db, 'settings', 'meritConfig');
    const unsub = onSnapshot(
      configDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories);
            setEditableCategories(data.categories);
            return;
          }
        }
        setCategories(DEFAULT_MERIT_CATEGORIES);
        setEditableCategories(DEFAULT_MERIT_CATEGORIES);
      },
      (err) => {
        console.warn('Could not read meritConfig snapshot:', err);
        setCategories(DEFAULT_MERIT_CATEGORIES);
        setEditableCategories(DEFAULT_MERIT_CATEGORIES);
      }
    );

    return () => unsub();
  }, []);

  // 2. Subscribe to live Spotlights Configuration from Firestore
  useEffect(() => {
    const spotlightsDocRef = doc(db, 'settings', 'meritSpotlights');
    const unsub = onSnapshot(
      spotlightsDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<SpotlightsConfig>;
          const merged: SpotlightsConfig = {
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
          setSpotlightsConfig(merged);
          setEditableSpotlights(merged);
        } else {
          setSpotlightsConfig(DEFAULT_SPOTLIGHTS_CONFIG);
          setEditableSpotlights(DEFAULT_SPOTLIGHTS_CONFIG);
        }
      },
      (err) => {
        console.warn('Could not read spotlights snapshot:', err);
        setSpotlightsConfig(DEFAULT_SPOTLIGHTS_CONFIG);
        setEditableSpotlights(DEFAULT_SPOTLIGHTS_CONFIG);
      }
    );

    return () => unsub();
  }, []);

  // 3. Subscribe to live public leaderboard users from Firestore (No sign-in required)
  useEffect(() => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['officer', 'member', 'non_member']));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const rankedList: UserProfile[] = [];
          const rawMembers: UserProfile[] = [];
          
          snap.forEach((d) => {
            const data = d.data() as UserProfile;
            const userWithId = { ...data, uid: d.id };
            rawMembers.push(userWithId);

            // Strictly exclude members who opted out of leaderboards (showOnLeaderboard === false)
            if (data.showOnLeaderboard === false) {
              return;
            }
            // Only rank due-paying members on the official points board
            if (data.isDuePaying === true || data.isPaidMember === true) {
              rankedList.push(userWithId);
            }
          });

          // Sort descending by merit points
          rankedList.sort((a, b) => Number(b.meritPoints || 0) - Number(a.meritPoints || 0));
          rawMembers.sort((a, b) => (a.fullName || a.displayName || '').localeCompare(b.fullName || b.displayName || ''));
          
          setLeaderboardUsers(rankedList);
          setAllChapterMembers(rawMembers);
          setLoadingLeaderboard(false);
        },
        (err) => {
          console.warn('Leaderboard fetch warning:', err);
          setLoadingLeaderboard(false);
        }
      );
      return () => unsub();
    } catch {
      setLoadingLeaderboard(false);
    }
  }, []);

  // Dynamically filter out any user where showOnLeaderboard === false
  const filteredLeaderboardUsers = useMemo(() => {
    return leaderboardUsers.filter((u) => {
      if (u.showOnLeaderboard === false) return false;
      if (user && u.uid === user.uid && userProfile?.showOnLeaderboard === false) {
        return false;
      }
      return true;
    });
  }, [leaderboardUsers, user, userProfile?.showOnLeaderboard]);

  // Filtered SHPEtinas Leaderboard strictly excluding opted-out members
  const shpetinasUsers = useMemo(() => {
    return filteredLeaderboardUsers.filter((u) => u.isShpetinasMember === true);
  }, [filteredLeaderboardUsers]);

  // Current active list based on selected tab and search query
  const displayedUsers = useMemo(() => {
    const baseList = activeLeaderboardTab === 'main' ? filteredLeaderboardUsers : shpetinasUsers;
    if (!searchTerm.trim()) return baseList;
    const term = searchTerm.toLowerCase().trim();
    return baseList.filter((u) => {
      const name = (u.fullName || u.displayName || '').toLowerCase();
      const netid = (u.netid || u.studentId || '').toLowerCase();
      const major = (u.major || '').toLowerCase();
      return name.includes(term) || netid.includes(term) || major.includes(term);
    });
  }, [activeLeaderboardTab, filteredLeaderboardUsers, shpetinasUsers, searchTerm]);

  // Auto 1st Place of each leaderboard
  const topMemberRank1 = filteredLeaderboardUsers.length > 0 ? filteredLeaderboardUsers[0] : null;
  const topShpetinaRank1 = shpetinasUsers.length > 0 ? shpetinasUsers[0] : null;

  // Resolve Effective Spotlight for Member of the Month
  const resolvedMemberSpotlight = useMemo(() => {
    const config = spotlightsConfig.memberOfTheMonth;
    if (config.mode === 'custom') {
      const matchedUser = config.memberUid ? allChapterMembers.find(u => u.uid === config.memberUid) : null;
      return {
        monthTitle: config.monthTitle || 'Member of the Month Spotlight',
        name: config.customName || matchedUser?.fullName || matchedUser?.displayName || 'Featured Bobcat',
        major: config.customMajor || matchedUser?.major || 'Engineering Student',
        netid: config.customNetId || matchedUser?.netid || matchedUser?.studentId || 'Verified',
        points: config.customPoints !== undefined && config.customPoints !== null 
          ? config.customPoints 
          : (matchedUser?.meritPoints || topMemberRank1?.meritPoints || 0),
        photoURL: config.customPhotoURL || matchedUser?.photoURL || topMemberRank1?.photoURL || null,
        badge: config.customBadge || 'Top Chapter Achiever & Active Bobcat',
        quote: config.customQuote || 'Recognized for outstanding leadership, meeting attendance, and academic excellence!',
        isAuto: false,
      };
    }
    // Auto Mode: 1st place of general merit leaderboard
    return {
      monthTitle: config.monthTitle || 'Member of the Month Spotlight',
      name: topMemberRank1 ? (topMemberRank1.fullName || topMemberRank1.displayName) : 'Season Standings Underway',
      major: topMemberRank1?.major || 'Texas State Engineering Student',
      netid: topMemberRank1?.netid || topMemberRank1?.studentId || 'Active Member',
      points: topMemberRank1?.meritPoints || 0,
      photoURL: topMemberRank1?.photoURL || null,
      badge: config.customBadge || 'Top Chapter Achiever & Active Bobcat',
      quote: topMemberRank1 
        ? 'Rank #1 on the chapter merit board! Leading by example in meeting attendance, workshops, and chapter events.'
        : 'Attend general meetings and chapter events to earn merit points and lead the standings as Member of the Month!',
      isAuto: true,
    };
  }, [spotlightsConfig.memberOfTheMonth, topMemberRank1, allChapterMembers]);

  // Resolve Effective Spotlight for SHPEtina of the Month
  const resolvedShpetinaSpotlight = useMemo(() => {
    const config = spotlightsConfig.shpetinaOfTheMonth;
    if (config.mode === 'custom') {
      const matchedUser = config.memberUid ? allChapterMembers.find(u => u.uid === config.memberUid) : null;
      return {
        monthTitle: config.monthTitle || '🌸 SHPEtina of the Month Spotlight',
        name: config.customName || matchedUser?.fullName || matchedUser?.displayName || 'Featured SHPEtina',
        major: config.customMajor || matchedUser?.major || 'STEM Student',
        netid: config.customNetId || matchedUser?.netid || matchedUser?.studentId || 'Verified',
        points: config.customPoints !== undefined && config.customPoints !== null 
          ? config.customPoints 
          : (matchedUser?.meritPoints || topShpetinaRank1?.meritPoints || 0),
        photoURL: config.customPhotoURL || matchedUser?.photoURL || topShpetinaRank1?.photoURL || null,
        badge: config.customBadge || 'Leading Latina in STEM & Sisterhood Ambassador',
        quote: config.customQuote || 'Honored for exceptional participation, empowerment, and academic commitment in SHPEtinas!',
        isAuto: false,
      };
    }
    // Auto Mode: 1st place of SHPEtinas leaderboard
    return {
      monthTitle: config.monthTitle || '🌸 SHPEtina of the Month Spotlight',
      name: topShpetinaRank1 ? (topShpetinaRank1.fullName || topShpetinaRank1.displayName) : 'SHPEtinas Standings Open',
      major: topShpetinaRank1?.major || 'STEM Student & Sisterhood Member',
      netid: topShpetinaRank1?.netid || topShpetinaRank1?.studentId || 'Active Member',
      points: topShpetinaRank1?.meritPoints || 0,
      photoURL: topShpetinaRank1?.photoURL || null,
      badge: config.customBadge || 'Leading Latina in STEM & Sisterhood Ambassador',
      quote: topShpetinaRank1 
        ? 'Rank #1 on the SHPEtinas leaderboard! Inspiring future Hispanic women in STEM through academic and professional excellence.'
        : 'Join SHPEtinas on your profile and participate in events to earn merit points and lead the standings!',
      isAuto: true,
    };
  }, [spotlightsConfig.shpetinaOfTheMonth, topShpetinaRank1, allChapterMembers]);

  const currentListUserRank = user && userProfile?.showOnLeaderboard !== false
    ? displayedUsers.findIndex((u) => u.uid === user.uid) + 1 
    : 0;

  // Handlers for Admin Spotlight Customization
  const handleOpenSpotlightModal = (tab: 'member' | 'shpetina' = 'member') => {
    setSpotlightModalTab(tab);
    setEditableSpotlights({ ...spotlightsConfig });
    setSpotlightFeedback(null);
    setIsSpotlightModalOpen(true);
  };

  const handleMemberSelectForSpotlight = (target: 'member' | 'shpetina', uid: string) => {
    const selected = allChapterMembers.find(m => m.uid === uid);
    if (!selected) return;

    setEditableSpotlights(prev => {
      const key = target === 'member' ? 'memberOfTheMonth' : 'shpetinaOfTheMonth';
      return {
        ...prev,
        [key]: {
          ...prev[key],
          memberUid: uid,
          customName: selected.fullName || selected.displayName || '',
          customMajor: selected.major || '',
          customNetId: selected.netid || selected.studentId || '',
          customPoints: selected.meritPoints || 0,
          customPhotoURL: selected.photoURL || '',
        }
      };
    });
  };

  const handleSaveSpotlights = async () => {
    if (!user) return;
    setIsSavingSpotlights(true);
    setSpotlightFeedback(null);
    try {
      await saveSpotlightsConfig(editableSpotlights, user.email || 'shpetxst@gmail.com');
      setSpotlightsConfig(editableSpotlights);
      setSpotlightFeedback({
        type: 'success',
        message: 'Spotlights updated successfully! Live changes are now visible to the public.',
      });
      setTimeout(() => {
        setIsSpotlightModalOpen(false);
        setSpotlightFeedback(null);
      }, 1500);
    } catch (err: unknown) {
      console.error('Failed to save spotlights:', err);
      const errorObj = err as { message?: string };
      setSpotlightFeedback({
        type: 'error',
        message: errorObj.message || 'Failed to save spotlights. Ensure you are signed in as shpetxst@gmail.com.',
      });
    } finally {
      setIsSavingSpotlights(false);
    }
  };

  // Handlers for Admin Point Categories
  const handlePointChange = (id: string, newPoints: number) => {
    setEditableCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, points: newPoints } : cat))
    );
  };

  const handleNameChange = (id: string, newName: string) => {
    setEditableCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name: newName } : cat))
    );
  };

  const handleDescriptionChange = (id: string, newDesc: string) => {
    setEditableCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, description: newDesc } : cat))
    );
  };

  const handleAddCategory = () => {
    const newId = `custom-cat-${Date.now()}`;
    const newCat: MeritCategory = {
      id: newId,
      name: 'New Custom Event',
      points: 1,
      description: 'Event description and points allocation details.',
      tag: 'Custom',
    };
    setEditableCategories((prev) => [...prev, newCat]);
  };

  const handleRemoveCategory = (id: string) => {
    setEditableCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const handleResetDefaults = () => {
    setEditableCategories(DEFAULT_MERIT_CATEGORIES);
    setAdminFeedback({
      type: 'success',
      message: 'Reset form to default point values. Click "Save Configuration" to apply.',
    });
  };

  const handleSaveConfig = async () => {
    if (!user) return;
    setIsSavingConfig(true);
    setAdminFeedback(null);
    try {
      await saveMeritConfig(editableCategories, user.email || 'shpetxst@gmail.com');
      setAdminFeedback({
        type: 'success',
        message: 'Category point values saved! All Merit Board point schedules and Scanner options are updated.',
      });
    } catch (err: unknown) {
      console.error('Failed to save merit config:', err);
      const errorObj = err as { message?: string };
      setAdminFeedback({
        type: 'error',
        message: errorObj.message || 'Failed to save configuration. Please ensure you are logged in as shpetxst@gmail.com.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Generate dynamic text for "How can I earn points?" based on current category points
  const pointsSummaryString = categories
    .slice(0, 6)
    .map((c) => `${c.name} (+${c.points} pts)`)
    .join(', ');

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in pt-20">
      
      {/* Hero Header */}
      <div className="bg-[#501214] text-white py-14 px-4 shadow-md border-b-4 border-[#C4A47C]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-black/40 px-3.5 py-1.5 rounded-full text-xs font-black text-[#C4A47C] border border-[#C4A47C]">
              <Globe className="w-3.5 h-3.5 text-[#C4A47C]" />
              <span>Public Chapter Leaderboard &bull; No Sign-In Required</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              SHPE Bobcat Merit Board
            </h1>
            
            <p className="text-sm md:text-base text-gray-100 max-w-xl leading-relaxed font-bold">
              Recognizing chapter excellence and rewarding active Bobcats. Real-time points ranking for all chapter members and SHPEtinas. Attend meetings, technical workshops, and sports to earn subsidized national convention travel stipends!
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {user ? (
                <Link
                  to="/profile"
                  className="px-5 py-2.5 bg-[#C4A47C] hover:bg-[#b09068] text-[#501214] font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  <Award className="w-4 h-4 text-[#501214]" />
                  <span>My Digital Check-In Pass & QR Code &rarr;</span>
                </Link>
              ) : (
                <Link
                  to="/profile"
                  className="px-5 py-2.5 bg-[#C4A47C] hover:bg-[#b09068] text-[#501214] font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  <Award className="w-4 h-4 text-[#501214]" />
                  <span>Sign In for Personal Pass &rarr;</span>
                </Link>
              )}
              
              <Link
                to="/membership"
                className="px-4 py-2.5 bg-white text-[#501214] hover:bg-gray-100 font-black text-xs rounded-xl border-2 border-white transition-all flex items-center space-x-1.5 shadow-md"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#501214]" />
                <span>Chapter Dues ($30 / $40) &rarr;</span>
              </Link>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenSpotlightModal('member')}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#501214] font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 border-2 border-white"
                  >
                    <Crown className="w-4 h-4 text-[#501214]" />
                    <span>Customize Spotlights (Admin)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                    className="px-4 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 border-2 border-gray-300"
                  >
                    <Settings className="w-4 h-4 text-[#501214]" />
                    <span>{isAdminPanelOpen ? 'Close Point Controls' : 'Edit Point Values'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="lg:text-right">
            <div className="inline-block bg-white rounded-3xl p-6 border-4 border-[#C4A47C] shadow-2xl text-left max-w-md w-full text-[#1A1A1A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#501214] block">
                  {user ? 'Your Member Status' : 'Chapter Standings'}
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Public Live Standings</span>
                </span>
              </div>

              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black text-[#1A1A1A] truncate">
                        {userProfile?.fullName || userProfile?.displayName || user.displayName || user.email}
                      </h4>
                      <p className="text-xs text-gray-700 font-mono font-bold">
                        NetID: {userProfile?.netid || userProfile?.studentId || 'Verified'}
                      </p>
                      {userProfile?.isShpetinasMember && (
                        <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-700 text-white shadow-xs">
                          🌸 SHPEtinas Member
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#501214] font-mono">
                        {meritPoints} <span className="text-xs text-[#1A1A1A]">pts</span>
                      </div>
                      {currentListUserRank > 0 && (
                        <span className="text-[10px] bg-[#501214] px-2 py-0.5 rounded-full text-white font-black inline-block mt-0.5 shadow-xs">
                          Rank #{currentListUserRank}
                        </span>
                      )}
                    </div>
                  </div>

                  {isDuePaying ? (
                    <div className="p-3 bg-emerald-700 text-white rounded-xl text-xs flex items-center space-x-2 font-black shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                      <span>Active Due-Paying Member &bull; Points Eligible</span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl text-xs text-[#1A1A1A] space-y-2">
                      <div className="flex items-center space-x-1.5 font-black text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Non-Due-Paying Member</span>
                      </div>
                      <p className="text-[11px] text-gray-800 leading-relaxed font-bold">
                        Points accumulation is reserved for due-paying members (Semester Dues: $30, Full Year Dues: $40).
                      </p>
                      <Link
                        to="/membership"
                        className="inline-flex items-center space-x-1 font-bold text-[11px] text-[#501214] bg-[#C4A47C] hover:bg-[#b09068] px-2.5 py-1 rounded-lg"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Pay Chapter Dues Online &rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-[#C4A47C]" />
                    <h4 className="text-base font-black text-gray-900">Public Access Enabled</h4>
                  </div>
                  <p className="text-xs text-gray-700 font-bold leading-relaxed">
                    Welcome! Anyone can view our chapter leaders and event points schedules below. Texas State engineering students can sign in to access personal QR event passes and track merit history.
                  </p>
                  <div className="pt-1 flex flex-col sm:flex-row gap-2">
                    <Link
                      to="/profile"
                      className="px-4 py-2 bg-[#501214] hover:bg-[#3d0e0f] text-white font-black text-xs rounded-xl shadow-md transition-all text-center"
                    >
                      Sign In with NetID &rarr;
                    </Link>
                    <Link
                      to="/membership"
                      className="px-4 py-2 bg-[#C4A47C] hover:bg-[#b09068] text-[#501214] font-black text-xs rounded-xl shadow-md transition-all text-center"
                    >
                      Join / Pay Dues &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        {/* ========================================================================= */}
        {/* SPOTLIGHTS OF THE MONTH SECTION: MEMBER OF THE MONTH & SHPETINA OF THE MONTH */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center space-x-2 text-[#501214] text-xs font-black uppercase tracking-wider">
                <Crown className="w-4 h-4 text-[#C4A47C]" />
                <span>Chapter Spotlights &bull; 1st Place Achievers</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                Monthly Spotlights
              </h2>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleOpenSpotlightModal('member')}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-[#501214] text-white hover:bg-[#3d0e0f] rounded-xl text-xs font-black shadow-sm flex items-center space-x-1.5 border border-[#C4A47C]"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#C4A47C]" />
                <span>Customize Spotlights (Admin)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. MEMBER OF THE MONTH SPOTLIGHT (1st Place Merit Board or Admin Custom) */}
            <div className="bg-[#501214] text-white rounded-3xl p-6 md:p-7 shadow-xl border-4 border-[#C4A47C] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-36 h-36 bg-[#C4A47C]/15 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#C4A47C] text-[#501214] text-[11px] font-black uppercase tracking-wider shadow-xs">
                    <Crown className="w-3.5 h-3.5 text-[#501214]" />
                    <span>{resolvedMemberSpotlight.monthTitle}</span>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/40 text-[#C4A47C] px-2.5 py-0.5 rounded-full border border-[#C4A47C]">
                    {resolvedMemberSpotlight.isAuto ? '1st Place &bull; Merit Board' : 'Admin Custom Spotlight'}
                  </span>
                </div>

                {/* Profile Details */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-4 pt-1">
                  <div className="relative shrink-0">
                    <div className="p-1 rounded-2xl bg-[#C4A47C] shadow-lg border-2 border-white">
                      {resolvedMemberSpotlight.photoURL ? (
                        <img
                          src={resolvedMemberSpotlight.photoURL}
                          alt={resolvedMemberSpotlight.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white text-[#501214] font-black text-3xl sm:text-4xl flex items-center justify-center">
                          {((resolvedMemberSpotlight.name || 'B')[0]).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute -top-2.5 -left-2.5 bg-[#C4A47C] text-[#501214] p-1.5 rounded-full shadow-lg border-2 border-white" title="Top Chapter Member">
                      <Crown className="w-3.5 h-3.5 fill-[#501214] text-[#501214]" />
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                      {resolvedMemberSpotlight.name}
                    </h3>

                    <p className="text-xs text-gray-200 font-bold">
                      {resolvedMemberSpotlight.major} &bull; <span className="font-mono text-[#C4A47C]">{resolvedMemberSpotlight.netid}</span>
                    </p>

                    <div className="pt-0.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black bg-black text-[#C4A47C] border border-[#C4A47C]">
                        {resolvedMemberSpotlight.badge}
                      </span>
                    </div>

                    <p className="text-xs text-gray-200 font-medium italic pt-1 leading-relaxed">
                      "{resolvedMemberSpotlight.quote}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-5 pt-4 border-t border-[#C4A47C]/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#C4A47C] font-mono">
                    {resolvedMemberSpotlight.points}
                  </span>
                  <span className="text-xs text-gray-300 font-bold">Total Merit Points</span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenSpotlightModal('member')}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[#C4A47C] rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. SHPETINA OF THE MONTH SPOTLIGHT (1st Place SHPEtinas or Admin Custom) */}
            <div className="bg-pink-900 text-white rounded-3xl p-6 md:p-7 shadow-xl border-4 border-pink-400 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-36 h-36 bg-pink-400/20 rounded-full blur-2xl pointer-events-none"></div>

              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pink-300 text-pink-950 text-[11px] font-black uppercase tracking-wider shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-pink-950" />
                    <span>{resolvedShpetinaSpotlight.monthTitle}</span>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/40 text-pink-300 px-2.5 py-0.5 rounded-full border border-pink-400">
                    {resolvedShpetinaSpotlight.isAuto ? '1st Place &bull; SHPEtinas' : 'Admin Custom Spotlight'}
                  </span>
                </div>

                {/* Profile Details */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-4 pt-1">
                  <div className="relative shrink-0">
                    <div className="p-1 rounded-2xl bg-pink-400 shadow-lg border-2 border-white">
                      {resolvedShpetinaSpotlight.photoURL ? (
                        <img
                          src={resolvedShpetinaSpotlight.photoURL}
                          alt={resolvedShpetinaSpotlight.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white text-pink-900 font-black text-3xl sm:text-4xl flex items-center justify-center">
                          {((resolvedShpetinaSpotlight.name || 'S')[0]).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute -top-2.5 -left-2.5 bg-white text-pink-800 p-1.5 rounded-full shadow-lg border-2 border-pink-400" title="Top SHPEtina">
                      <Heart className="w-3.5 h-3.5 fill-pink-600 text-pink-600" />
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                      {resolvedShpetinaSpotlight.name}
                    </h3>

                    <p className="text-xs text-pink-100 font-bold">
                      {resolvedShpetinaSpotlight.major} &bull; <span className="font-mono text-pink-300">{resolvedShpetinaSpotlight.netid}</span>
                    </p>

                    <div className="pt-0.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black bg-black text-pink-300 border border-pink-400">
                        {resolvedShpetinaSpotlight.badge}
                      </span>
                    </div>

                    <p className="text-xs text-pink-100 font-medium italic pt-1 leading-relaxed">
                      "{resolvedShpetinaSpotlight.quote}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-5 pt-4 border-t border-pink-400/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl sm:text-3xl font-black text-pink-300 font-mono">
                    {resolvedShpetinaSpotlight.points}
                  </span>
                  <span className="text-xs text-pink-100 font-bold">SHPEtinas Merit Points</span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenSpotlightModal('shpetina')}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-pink-200 rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADMIN SPOTLIGHT CUSTOMIZATION MODAL (shpetxst@gmail.com only) */}
        {/* ========================================================================= */}
        {isAdmin && isSpotlightModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-[#C4A47C]">
              
              {/* Modal Header */}
              <div className="p-6 bg-[#501214] text-white rounded-t-2xl flex items-center justify-between border-b-2 border-[#C4A47C]">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#C4A47C] text-[#501214] rounded-xl font-bold">
                    <Crown className="w-5 h-5 text-[#501214]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">
                      Customize Monthly Spotlights
                    </h3>
                    <p className="text-xs text-gray-200 font-bold">
                      Admin: shpetxst@gmail.com &bull; Real-time public updates
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpotlightModalOpen(false)}
                  className="p-1.5 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="p-6 space-y-6">
                <div className="flex border-b border-gray-200 gap-2">
                  <button
                    type="button"
                    onClick={() => setSpotlightModalTab('member')}
                    className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center space-x-1.5 ${
                      spotlightModalTab === 'member'
                        ? 'border-[#501214] text-[#501214]'
                        : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-[#C4A47C]" />
                    <span>Member of the Month</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpotlightModalTab('shpetina')}
                    className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center space-x-1.5 ${
                      spotlightModalTab === 'shpetina'
                        ? 'border-pink-600 text-pink-800'
                        : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-pink-600" />
                    <span>SHPEtina of the Month</span>
                  </button>
                </div>

                {spotlightFeedback && (
                  <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                    spotlightFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border border-rose-300'
                  }`}>
                    {spotlightFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{spotlightFeedback.message}</span>
                  </div>
                )}

                {/* Form Body for Current Tab */}
                {spotlightModalTab === 'member' ? (
                  <div className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                      <label className="text-xs font-black text-gray-900 block">Spotlight Selection Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditableSpotlights(prev => ({
                            ...prev,
                            memberOfTheMonth: { ...prev.memberOfTheMonth, mode: 'auto' }
                          }))}
                          className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                            editableSpotlights.memberOfTheMonth.mode === 'auto'
                              ? 'bg-[#501214] text-white border-[#501214] shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Automatic (#1 on Merit Board)
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditableSpotlights(prev => ({
                            ...prev,
                            memberOfTheMonth: { ...prev.memberOfTheMonth, mode: 'custom' }
                          }))}
                          className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                            editableSpotlights.memberOfTheMonth.mode === 'custom'
                              ? 'bg-[#501214] text-white border-[#501214] shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Custom Spotlight Pick
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {editableSpotlights.memberOfTheMonth.mode === 'auto'
                          ? 'Auto-displays whichever student is currently #1 with the highest merit points.'
                          : 'Manually select any member or provide custom spotlight recognition.'}
                      </p>
                    </div>

                    {/* Month Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Spotlight Month / Header Title</label>
                      <input
                        type="text"
                        value={editableSpotlights.memberOfTheMonth.monthTitle || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          memberOfTheMonth: { ...prev.memberOfTheMonth, monthTitle: e.target.value }
                        }))}
                        placeholder="e.g. November 2026 Spotlight"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-[#501214]"
                      />
                    </div>

                    {/* Quick Member Selector */}
                    {editableSpotlights.memberOfTheMonth.mode === 'custom' && (
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Quick Pick from Chapter Roster</label>
                        <select
                          value={editableSpotlights.memberOfTheMonth.memberUid || ''}
                          onChange={(e) => handleMemberSelectForSpotlight('member', e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#501214]"
                        >
                          <option value="">-- Choose a member to auto-fill --</option>
                          {allChapterMembers.map(m => (
                            <option key={m.uid} value={m.uid}>
                              {m.fullName || m.displayName || m.email} ({m.netid || 'No NetID'}) - {m.meritPoints || 0} pts
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Custom Fields (Always editable or overridden) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Member Name</label>
                        <input
                          type="text"
                          value={editableSpotlights.memberOfTheMonth.customName || ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            memberOfTheMonth: { ...prev.memberOfTheMonth, customName: e.target.value }
                          }))}
                          placeholder="e.g. John Doe"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Major</label>
                        <input
                          type="text"
                          value={editableSpotlights.memberOfTheMonth.customMajor || ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            memberOfTheMonth: { ...prev.memberOfTheMonth, customMajor: e.target.value }
                          }))}
                          placeholder="e.g. Computer Science"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Texas State NetID</label>
                        <input
                          type="text"
                          value={editableSpotlights.memberOfTheMonth.customNetId || ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            memberOfTheMonth: { ...prev.memberOfTheMonth, customNetId: e.target.value }
                          }))}
                          placeholder="e.g. abc12"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Merit Points Display</label>
                        <input
                          type="number"
                          value={editableSpotlights.memberOfTheMonth.customPoints ?? ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            memberOfTheMonth: { ...prev.memberOfTheMonth, customPoints: Number(e.target.value) || 0 }
                          }))}
                          placeholder="e.g. 24"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Custom Photo URL</label>
                      <input
                        type="text"
                        value={editableSpotlights.memberOfTheMonth.customPhotoURL || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          memberOfTheMonth: { ...prev.memberOfTheMonth, customPhotoURL: e.target.value }
                        }))}
                        placeholder="https://... or /assets/images/headshots/..."
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Highlight Badge</label>
                      <input
                        type="text"
                        value={editableSpotlights.memberOfTheMonth.customBadge || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          memberOfTheMonth: { ...prev.memberOfTheMonth, customBadge: e.target.value }
                        }))}
                        placeholder="e.g. Top Chapter Achiever & Active Bobcat"
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Spotlight Citation / Shoutout / Bio</label>
                      <textarea
                        rows={3}
                        value={editableSpotlights.memberOfTheMonth.customQuote || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          memberOfTheMonth: { ...prev.memberOfTheMonth, customQuote: e.target.value }
                        }))}
                        placeholder="Why is this member highlighted this month? (e.g. Outstanding attendance and leadership at Boeing event)"
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  /* SHPEtina Spotlight Form */
                  <div className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                      <label className="text-xs font-black text-gray-900 block">SHPEtina Spotlight Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditableSpotlights(prev => ({
                            ...prev,
                            shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, mode: 'auto' }
                          }))}
                          className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                            editableSpotlights.shpetinaOfTheMonth.mode === 'auto'
                              ? 'bg-pink-700 text-white border-pink-700 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Automatic (#1 on SHPEtinas Board)
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditableSpotlights(prev => ({
                            ...prev,
                            shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, mode: 'custom' }
                          }))}
                          className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                            editableSpotlights.shpetinaOfTheMonth.mode === 'custom'
                              ? 'bg-pink-700 text-white border-pink-700 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Custom SHPEtina Pick
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {editableSpotlights.shpetinaOfTheMonth.mode === 'auto'
                          ? 'Auto-displays whichever SHPEtinas member is currently #1 with highest points.'
                          : 'Manually select any SHPEtinas member or provide custom recognition.'}
                      </p>
                    </div>

                    {/* Month Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Spotlight Month / Header Title</label>
                      <input
                        type="text"
                        value={editableSpotlights.shpetinaOfTheMonth.monthTitle || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, monthTitle: e.target.value }
                        }))}
                        placeholder="e.g. 🌸 November 2026 SHPEtina of the Month"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-pink-600"
                      />
                    </div>

                    {/* Quick SHPEtinas Member Selector */}
                    {editableSpotlights.shpetinaOfTheMonth.mode === 'custom' && (
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Quick Pick from SHPEtinas Roster</label>
                        <select
                          value={editableSpotlights.shpetinaOfTheMonth.memberUid || ''}
                          onChange={(e) => handleMemberSelectForSpotlight('shpetina', e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-pink-600"
                        >
                          <option value="">-- Choose a member to auto-fill --</option>
                          {allChapterMembers.filter(m => m.isShpetinasMember === true).map(m => (
                            <option key={m.uid} value={m.uid}>
                              {m.fullName || m.displayName || m.email} ({m.netid || 'No NetID'}) - {m.meritPoints || 0} pts
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">SHPEtina Name</label>
                        <input
                          type="text"
                          value={editableSpotlights.shpetinaOfTheMonth.customName || ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, customName: e.target.value }
                          }))}
                          placeholder="e.g. Jane Doe"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Major</label>
                        <input
                          type="text"
                          value={editableSpotlights.shpetinaOfTheMonth.customMajor || ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, customMajor: e.target.value }
                          }))}
                          placeholder="e.g. Electrical Engineering"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Texas State NetID</label>
                        <input
                          type="text"
                          value={editableSpotlights.shpetinaOfTheMonth.customNetId || ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, customNetId: e.target.value }
                          }))}
                          placeholder="e.g. xyz89"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-800 block">Points Display</label>
                        <input
                          type="number"
                          value={editableSpotlights.shpetinaOfTheMonth.customPoints ?? ''}
                          onChange={(e) => setEditableSpotlights(prev => ({
                            ...prev,
                            shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, customPoints: Number(e.target.value) || 0 }
                          }))}
                          placeholder="e.g. 18"
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Custom Photo URL</label>
                      <input
                        type="text"
                        value={editableSpotlights.shpetinaOfTheMonth.customPhotoURL || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, customPhotoURL: e.target.value }
                        }))}
                        placeholder="https://... or /assets/images/headshots/..."
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Highlight Badge</label>
                      <input
                        type="text"
                        value={editableSpotlights.shpetinaOfTheMonth.customBadge || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, customBadge: e.target.value }
                        }))}
                        placeholder="e.g. Leading Latina in STEM & Sisterhood Ambassador"
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-800 block">Spotlight Citation / Shoutout / Bio</label>
                      <textarea
                        rows={3}
                        value={editableSpotlights.shpetinaOfTheMonth.customQuote || ''}
                        onChange={(e) => setEditableSpotlights(prev => ({
                          ...prev,
                          shpetinaOfTheMonth: { ...prev.shpetinaOfTheMonth, customQuote: e.target.value }
                        }))}
                        placeholder="Why is this SHPEtina highlighted? (e.g. Coordinating study nights and inspiring sisterhood)"
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500 font-medium">
                  Saves to Firebase &bull; Live instantaneously for all visitors
                </span>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsSpotlightModalOpen(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSpotlights}
                    disabled={isSavingSpotlights}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#501214] hover:bg-[#3d0e0f] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4 text-[#C4A47C]" />
                    <span>{isSavingSpotlights ? 'Saving...' : 'Save & Publish Spotlights'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADMIN CATEGORY CONTROLS PANEL (shpetxst@gmail.com only) */}
        {/* ========================================================================= */}
        {isAdmin && isAdminPanelOpen && (
          <div className="bg-white rounded-3xl shadow-md border-2 border-[#501214] p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#501214]/10 text-[#501214] rounded-2xl">
                  <Settings className="w-6 h-6 text-[#501214]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-extrabold text-gray-900">
                      Merit Board Point Schedule Controls
                    </h2>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      shpetxst@gmail.com
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    Customize event categories and default point values dynamically. Changes apply immediately to the website and Admin Scanner.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5"
                  title="Reset to default chapter categories and points"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-700" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3.5 py-2 bg-[#501214]/10 hover:bg-[#501214]/20 text-[#501214] font-bold text-xs rounded-xl transition-colors border border-[#501214]/30 flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#501214]" />
                  <span>Add Category</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdminPanelOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-900 rounded-xl"
                  title="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {adminFeedback && (
              <div className={`p-4 rounded-2xl text-xs flex items-center space-x-2.5 ${
                adminFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 font-medium' 
                  : 'bg-rose-50 text-rose-950 border border-rose-300 font-medium'
              }`}>
                {adminFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{adminFeedback.message}</span>
              </div>
            )}

            {/* Editable Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editableCategories.map((cat, idx) => (
                <div 
                  key={cat.id || idx} 
                  className="p-4 bg-gray-50/90 rounded-2xl border border-gray-300 space-y-3 relative hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#501214] bg-[#501214]/10 px-2 py-0.5 rounded-md border border-[#501214]/20">
                      Category #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat.id)}
                      className="p-1 text-gray-500 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-gray-800 block">Category Name</label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => handleNameChange(cat.id, e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#501214] font-bold text-gray-900"
                        placeholder="e.g. General Meetings"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-800 block">Points Value</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={100}
                          value={cat.points}
                          onChange={(e) => handlePointChange(cat.id, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-mono font-black px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#501214] text-[#501214] text-center"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-gray-500 pointer-events-none">
                          pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-800 block">Description / Qualification Rule</label>
                    <input
                      type="text"
                      value={cat.description}
                      onChange={(e) => handleDescriptionChange(cat.id, e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#501214] text-gray-800 font-medium"
                      placeholder="Short description of this event"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-600 font-medium">
                Saving updates the point schedule on this page and the preset point dropdown in the QR Scanner.
              </span>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="w-full sm:w-auto px-6 py-3 bg-[#501214] hover:bg-[#3d0e0f] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4 text-[#C4A47C]" />
                <span>{isSavingConfig ? 'Saving Point Settings...' : 'Save & Publish Point Values'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LIVE LEADERBOARDS SECTION (PUBLIC & NO SIGN-IN REQUIRED) */}
        {/* ========================================================================= */}
        <div className="space-y-6">

          {/* Navigation Tab Switcher and Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border-2 border-gray-300">
            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveLeaderboardTab('main')}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
                  activeLeaderboardTab === 'main'
                    ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-sm'
                    : 'bg-white text-[#1A1A1A] border-2 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Trophy className={`w-4 h-4 ${activeLeaderboardTab === 'main' ? 'text-[#C4A47C]' : 'text-[#501214]'}`} />
                <span>Main Merit Board</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeLeaderboardTab === 'main' ? 'bg-[#C4A47C] text-[#501214]' : 'bg-gray-200 text-[#1A1A1A]'
                }`}>
                  {filteredLeaderboardUsers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLeaderboardTab('shpetinas')}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
                  activeLeaderboardTab === 'shpetinas'
                    ? 'bg-pink-700 text-white border-2 border-pink-700 shadow-sm'
                    : 'bg-white text-[#1A1A1A] border-2 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${activeLeaderboardTab === 'shpetinas' ? 'text-pink-200' : 'text-pink-700'}`} />
                <span>SHPEtinas Leaderboard</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeLeaderboardTab === 'shpetinas' ? 'bg-pink-900 text-pink-100' : 'bg-gray-200 text-[#1A1A1A]'
                }`}>
                  {shpetinasUsers.length}
                </span>
              </button>
            </div>

            {/* Search Input Filter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search member or NetID..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#501214] font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs font-black text-[#1A1A1A] px-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Live Standings</span>
              </div>
            </div>
          </div>

          {/* Live Chapter Merit Leaderboard Table Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-2xl ${activeLeaderboardTab === 'main' ? 'bg-[#501214]/10 text-[#501214]' : 'bg-pink-100 text-pink-900'}`}>
                  {activeLeaderboardTab === 'main' ? (
                    <Trophy className="w-6 h-6 text-[#501214]" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-pink-700" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    {activeLeaderboardTab === 'main' 
                      ? 'Live Chapter Merit Leaderboard' 
                      : 'SHPEtinas Dedicated Leaderboard'}
                  </h2>
                  <p className="text-xs text-gray-600 font-medium">
                    {activeLeaderboardTab === 'main'
                      ? 'Real-time points ranking for all active due-paying Bobcat members.'
                      : 'Exclusive ranking of active due-paying students enrolled in the SHPEtinas program.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`text-[11px] font-bold px-3 py-1 rounded-xl border ${
                  activeLeaderboardTab === 'main'
                    ? 'bg-[#501214]/10 text-[#501214] border-[#501214]/30'
                    : 'bg-pink-50 text-pink-900 border-pink-300'
                }`}>
                  {activeLeaderboardTab === 'main' ? 'All Chapter Members' : 'SHPEtinas Members Only'}
                </span>
              </div>
            </div>

            {/* Dues Policy Notice */}
            <div className="p-4 bg-[#501214]/5 rounded-2xl border border-[#501214]/20 text-xs text-gray-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-4 h-4 text-[#501214] flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-[#501214]">Official Chapter Merit Eligibility:</span>
                  <p className="text-gray-700 text-[11px] leading-relaxed font-medium">
                    By chapter constitution, only active due-paying members accumulate points and rank on this public leaderboard. Non-due-paying members are notified at event check-in to complete chapter dues (<strong>Semester Dues: $30</strong> &bull; <strong>Full Year Dues: $40</strong>).
                  </p>
                </div>
              </div>

              <Link
                to="/membership"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#501214] hover:bg-[#3d0e0f] text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs transition-colors self-start sm:self-auto"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Dues Form</span>
              </Link>
            </div>

            {/* Leaderboard Table with Full Name & Points */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Member Full Name (First &amp; Last Name)</th>
                    <th className="px-4 py-3">NetID / Major</th>
                    <th className="px-4 py-3">Dues &amp; Program</th>
                    <th className="px-4 py-3 text-right">Merit Points</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 font-medium">
                  {loadingLeaderboard ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 font-semibold">
                        Loading chapter leaderboard...
                      </td>
                    </tr>
                  ) : displayedUsers.length > 0 ? (
                    displayedUsers.map((member, index) => {
                      const isCurrentUser = user && user.uid === member.uid;
                      const memberFullName = member.fullName || member.displayName || 'Bobcat Member';
                      return (
                        <tr 
                          key={member.uid} 
                          className={`transition-colors ${
                            isCurrentUser ? 'bg-[#501214]/10 font-bold' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {index === 0 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs inline-flex items-center justify-center shadow-xs">
                                1
                              </span>
                            ) : index === 1 ? (
                              <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs inline-flex items-center justify-center">
                                2
                              </span>
                            ) : index === 2 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs inline-flex items-center justify-center">
                                3
                              </span>
                            ) : (
                              <span className="text-gray-600 font-mono text-xs pl-1.5 font-bold">
                                #{index + 1}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-extrabold text-gray-900 flex items-center space-x-1.5">
                              <span>{memberFullName}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-[#501214] text-white px-1.5 py-0.2 rounded font-bold">
                                  You
                                </span>
                              )}
                              {member.isShpetinasMember && (
                                <span className="text-[10px] bg-pink-100 text-pink-900 px-1.5 py-0.2 rounded font-bold border border-pink-200" title="SHPEtinas Member">
                                  SHPEtinas
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-600 font-mono">{member.email}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                            <div className="font-semibold text-gray-800">{member.major || 'Engineering'}</div>
                            <div className="text-[11px] text-gray-600 font-mono">
                              {member.netid || member.studentId || 'Member'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Due-Paying</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-base font-black text-[#501214] font-mono">
                              {member.meritPoints || 0}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold ml-1">pts</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-600 font-medium">
                        {searchTerm ? (
                          `No members matched "${searchTerm}". Try another search.`
                        ) : activeLeaderboardTab === 'main' ? (
                          'No due-paying members registered on the leaderboard yet. Be the first to attend a meeting and earn points!'
                        ) : (
                          'No SHPEtinas members registered on the board yet. Opt-in on your profile to join SHPEtinas and start earning points!'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Dynamic Points Schedule Grid */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-[#501214]/10 text-[#501214] text-[11px] font-bold px-3 py-1 rounded-full border border-[#501214]/20 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#501214]" />
                <span>Chapter Point Schedule</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center space-x-2">
                <span>Event Attendance &amp; Activity Point Values</span>
              </h3>
              <p className="text-xs text-gray-600 font-medium">
                Points awarded upon QR code scan by chapter officers at the door or via media verification.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 self-start sm:self-auto border border-gray-300"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#501214]" />
                <span>Customize Point Values</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {categories.map((cat, idx) => (
              <div 
                key={cat.id || idx} 
                className="p-5 bg-gradient-to-b from-[#501214]/5 to-white rounded-2xl border border-gray-200 space-y-2 hover:border-[#501214]/30 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#501214] bg-[#501214]/10 px-2 py-0.5 rounded-md border border-[#501214]/20">
                      {cat.tag || 'Chapter Event'}
                    </span>
                    <span className="text-xl font-black text-[#501214] font-mono">
                      +{cat.points} pts
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-gray-900 leading-snug">
                    {cat.name}
                  </h4>
                  <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                    {cat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Categories */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-2xl font-extrabold text-gray-900">
              How the Merit System Works
            </h2>
            <p className="text-xs text-gray-600 font-medium">
              Simple, transparent, and rewarding involvement for all Texas State engineering students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <h3 className="text-sm font-extrabold text-[#501214] flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#501214]" />
                <span>What is the Merit Board?</span>
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                The SHPE Merit Leaderboard is our way of recognizing and rewarding active members who contribute to our chapter's success. Points are accumulated through regular event attendance, workshops, volunteering, and chapter leadership.
              </p>
            </div>

            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <h3 className="text-sm font-extrabold text-[#501214] flex items-center space-x-2">
                <Award className="w-4 h-4 text-[#501214]" />
                <span>What rewards can I win?</span>
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                Top members earn subsidized travel grants for the SHPE National Convention and Regional Leadership Conference, exclusive chapter merchandise, corporate dinner invites, and end-of-semester gift raffles.
              </p>
            </div>

            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <h3 className="text-sm font-extrabold text-[#501214] flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-[#501214]" />
                <span>How can I earn points?</span>
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                Points are awarded at events via your personal QR code pass: {pointsSummaryString}.
              </p>
            </div>

            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <h3 className="text-sm font-extrabold text-[#501214] flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-[#501214]" />
                <span>Who is eligible to earn points?</span>
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                <strong>RESTRICTION:</strong> Only due-paying members are eligible to earn and accumulate merit points. Non-due-paying members must pay chapter dues (<strong>Semester Dues: $30</strong> &bull; <strong>Full Year Dues: $40</strong>) to participate.{' '}
                <Link to="/membership" className="text-[#501214] underline font-bold hover:text-[#3d0e0f]">
                  Pay Dues Online &rarr;
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Merits;
