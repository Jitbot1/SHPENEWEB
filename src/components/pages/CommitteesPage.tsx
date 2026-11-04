import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  ShieldCheck, 
  DollarSign, 
  Camera, 
  Heart, 
  Code2, 
  Clock, 
  MapPin, 
  UserCheck, 
  Sparkles, 
  Edit3, 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Mail
} from 'lucide-react';
import { ContactEmailButton } from '../ContactEmailButton';
import { useAuth } from '../../context/useAuth';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useSearchParams } from 'react-router-dom';

export interface CommitteeData {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  description: string;
  benefits: string[];
  meetingTime: string;
  meetingLocation: string;
  leadOfficer: string;
  leadOfficerRole: string;
  contactEmail: string;
  photos: string[];
  initiatives: string[];
  updatedAt?: unknown;
  updatedBy?: string;
}

const DEFAULT_COMMITTEES: CommitteeData[] = [
  {
    id: 'athletics',
    name: 'Athletics Committee',
    tagline: 'Fostering wellness, camaraderie, and friendly competition.',
    icon: 'trophy',
    description: 'The Athletics Committee coordinates intramural sports leagues, campus tournaments, fitness challenges, and outdoor recreational events. We believe a healthy body supports a sharp mind, helping Hispanic STEM students build lifelong friendships beyond the classroom.',
    benefits: [
      'Represent SHPE in official Texas State campus intramural leagues (Soccer, Volleyball, Basketball, Flag Football)',
      'Build physical wellness, relieve engineering study stress, and maintain a balanced student life',
      'Develop teamwork, communication, and sportsmanship skills highly valued by corporate recruiters',
      'Compete in regional SHPE sports tournaments with Texas chapters'
    ],
    initiatives: [
      'Intramural Spring Soccer & Volleyball Championship',
      'Annual Bobcat 5K Fun Run & Wellness Walk',
      'Weekly Pick-up Sports Days at the Student Rec Center',
      'Joint Field Day with neighboring university SHPE chapters'
    ],
    meetingTime: 'Fridays @ 4:00 PM',
    meetingLocation: 'Student Rec Center (Field 2)',
    leadOfficer: 'Joaquín Valeriano & Kiana Monsivais',
    leadOfficerRole: 'Co-Directors of Athletics',
    contactEmail: 'shpetxst@gmail.com',
    photos: [
      '/assets/images/athletics_images/volleyball.JPG',
      '/assets/images/athletics_images/jerseys.JPG',
      '/assets/images/athletics_images/running.JPG',
      '/assets/images/Athletics_gallery/IMG_2969.jpg',
      '/assets/images/Athletics_gallery/IMG_2972.jpg',
      '/assets/images/Athletics_gallery/IMG_7292.jpg'
    ]
  },
  {
    id: 'events',
    name: 'Events & Logistics Committee',
    tagline: 'Bringing world-class meetings, guest speakers, and banquets to life.',
    icon: 'calendar',
    description: 'The Events & Logistics Committee is responsible for planning, booking, and orchestrating every major gathering for SHPE Texas State. From booking corporate technical talks and reserving auditorium venues to setting up our annual Spring Banquet, we ensure each event runs flawlessly.',
    benefits: [
      'Gain hands-on event planning, budgeting, catering, and operational project management skills',
      'Directly introduce and coordinate with Fortune 500 guest engineers and keynote presenters',
      'Learn university reservation systems and budget allocation protocols',
      'Be the public face greeting members, guests, and alumni at check-in'
    ],
    initiatives: [
      'Bi-Weekly General Body Meetings & Company Spotlights',
      'Annual SHPE Texas State End-of-Year Banquet & Awards',
      'Resume Roast & Industry Mock Interview Night',
      'Welcome Week Bobcat Carnival & Chapter Tailgates'
    ],
    meetingTime: 'Wednesdays @ 5:00 PM',
    meetingLocation: 'Ingram Hall 3105',
    leadOfficer: 'Diego Perez & Sebastian Hernandez',
    leadOfficerRole: 'Co-Directors of Events & Logistics',
    contactEmail: 'shpetxst@gmail.com',
    photos: [
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 'fundraising',
    name: 'Fundraising & Sponsorship Committee',
    tagline: 'Securing corporate partnerships, grants, and travel stipends.',
    icon: 'dollar',
    description: 'The Fundraising & Sponsorship Committee powers our financial independence. We pitch corporate sponsor packages to engineering firms, write grant proposals, coordinate restaurant profit shares, and manage chapter merchandise sales to fund national conference attendance for our members.',
    benefits: [
      'Real-world business development, corporate pitching, and professional sales experience',
      'Directly negotiate with recruiters from top defense, tech, civil, and manufacturing corporations',
      'Learn non-profit budgeting, financial forecasting, and fiscal stewardship',
      'Help ensure no student misses out on the national convention due to financial need'
    ],
    initiatives: [
      'Corporate Sponsorship Packet & Annual Industry Mixer',
      'Local Restaurant Profit Shares (Chipotle, Panda Express, Raising Cane\'s)',
      'Official Chapter Merch Design, Production, and Sales',
      'Student Conference Travel Scholarship Endowment'
    ],
    meetingTime: 'Thursdays @ 5:00 PM',
    meetingLocation: 'Ingram Hall 3204',
    leadOfficer: 'Cristian Vizcaya & Eladio Gonzalez',
    leadOfficerRole: 'Co-Directors of Fundraising & Sponsorship',
    contactEmail: 'shpetxst@gmail.com',
    photos: [
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 'media',
    name: 'Media & Marketing Committee',
    tagline: 'Amplifying the Bobcat Familia through creative digital storytelling.',
    icon: 'camera',
    description: 'The Media & Marketing Committee is the creative studio of SHPE Texas State. We manage our public brand identity, curate vibrant social media feeds, design promotional flyers, capture professional event photography, and produce video recaps that highlight Hispanic excellence in STEM.',
    benefits: [
      'Build a standout digital marketing and graphic design portfolio (Figma, Canva, Adobe Suite)',
      'Professional event photography, portrait shooting, and video editing experience',
      'Master social media growth strategies, engagement analytics, and digital brand voice',
      'Network with chapter alumni and corporate marketing liaisons'
    ],
    initiatives: [
      'Weekly Instagram & LinkedIn Spotlight Series (Member Monday & Officer Highlights)',
      'Event Flyer Design & Campus Digital Signage campaigns',
      'Event Photography & Official Chapter Photo Archives',
      'Semester Video Recaps & TikTok/Reels Engagement'
    ],
    meetingTime: 'Thursdays @ 6:30 PM',
    meetingLocation: 'Virtual & Ingram Hall 2101',
    leadOfficer: 'James Tanner & Vicente Chavez',
    leadOfficerRole: 'Co-Directors of Media & Marketing',
    contactEmail: 'shpetxst@gmail.com',
    photos: [
      'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 'shpetinas',
    name: 'SHPEtinas Committee',
    tagline: 'Empowering Hispanic women in STEM to lead, innovate, and thrive.',
    icon: 'heart',
    description: 'SHPEtinas is a signature program dedicated to accelerating the advancement of Hispanic women in engineering, computing, and applied sciences. We provide a supportive community, professional mentorship from Latina engineers, leadership summits, and personal wellness discussions.',
    benefits: [
      'Belong to a tight-knit sisterhood of high-achieving women engineers and technologists',
      'Connect directly with female engineering directors, researchers, and tech pioneers',
      'Access specialized career panels addressing workplace diversity, negotiation, and imposter syndrome',
      'Attend the National SHPEtinas Leadership Conference track'
    ],
    initiatives: [
      'Empowerment Panel: Latinas Breaking Barriers in Aerospace & Tech',
      'Annual Galentine\'s Day Networking Social & Wellness Night',
      'High School Girls in STEM Mentorship Days at Texas State',
      'Professional Headshot & Elevator Pitch Workshop'
    ],
    meetingTime: 'Alternate Tuesdays @ 6:30 PM',
    meetingLocation: 'Ingram Hall 2201',
    leadOfficer: 'Alexsandra Luna Gonzalez',
    leadOfficerRole: 'Director of SHPEtinas',
    contactEmail: 'shpetxst@gmail.com',
    photos: [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 'technology',
    name: 'Technology Committee',
    tagline: 'Architecting digital infrastructure, hackathons, and technical projects.',
    icon: 'code',
    description: 'The Technology Committee builds and deploys practical digital solutions for SHPE Texas State. We maintain our official chapter website, design student project portfolios, host hands-on coding and hardware workshops, and lead student teams to hackathon victories.',
    benefits: [
      'Real-world software engineering experience with React, TypeScript, Tailwind CSS, and Firebase',
      'Add substantial full-stack projects to your resume that stand out to technical interviewers',
      'Learn modern software development workflows: Git version control, CI/CD, and Cloud hosting',
      'Form hackathon teams to compete at BobcatHacks, TAMUhack, and HackTX'
    ],
    initiatives: [
      'Official Chapter Web Platform & Member Portal Development',
      'Intro to Full-Stack Web Development Workshop Series',
      'Technical Interview Prep: LeetCode & Data Structures Study Circles',
      'Hardware IoT & Robotics project showcase'
    ],
    meetingTime: 'Mondays @ 5:30 PM',
    meetingLocation: 'Ingram Hall Tech Lab (Room 3302)',
    leadOfficer: 'Adrian Hackett',
    leadOfficerRole: 'Director of Technology',
    contactEmail: 'shpetxst@gmail.com',
    photos: [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80'
    ]
  }
];

const COMMITTEE_IMAGE_FALLBACKS: Record<string, string> = {
  athletics: '/assets/images/athletics_images/volleyball.JPG',
  'chapter-dev': '/assets/images/SHPEOFRENDA.jpg',
  'executive-board': '/assets/images/SHPENATIONALCONV.jpg',
  shpetinas: '/assets/images/SHPEtinas_events/IMG_2970.jpg',
  events: '/images/hero/hero1.JPG',
  fundraising: '/assets/images/sponsors/dell.png',
  media: '/assets/images/SHPEACCENTURE.jpg',
  technology: '/assets/images/IMG_2770.jpg',
};

export const CommitteesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  
  const [committees, setCommittees] = useState<CommitteeData[]>(DEFAULT_COMMITTEES);
  const activeTabId = searchParams.get('tab') || 'athletics';
  const activeCommittee = committees.find((c) => c.id === activeTabId) || committees[0];

  // Admin CMS Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CommitteeData>(activeCommittee);
  const [newBenefitInput, setNewBenefitInput] = useState('');
  const [newInitiativeInput, setNewInitiativeInput] = useState('');
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cmsFeedback, setCmsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync edit form data when switching committees
  useEffect(() => {
    setEditFormData(activeCommittee);
    setIsEditing(false);
    setCmsFeedback(null);
  }, [activeCommittee]);

  // Subscribe to real-time committee data in Firestore
  useEffect(() => {
    const unsubscribes = DEFAULT_COMMITTEES.map((defComm) => {
      const docRef = doc(db, 'committees', defComm.id);
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<CommitteeData>;
          const rawPhotos = Array.isArray(data.photos) ? data.photos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0) : [];
          const effectivePhotos = rawPhotos.length > 0 ? rawPhotos : defComm.photos;
          setCommittees((prev) => 
            prev.map((c) => (c.id === defComm.id ? { 
              ...c, 
              ...data,
              photos: effectivePhotos
            } : c))
          );
        }
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  const handleSelectTab = (id: string) => {
    setSearchParams({ tab: id });
  };

  const handleSaveCommitteeCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsSaving(true);
    setCmsFeedback(null);
    try {
      const docRef = doc(db, 'committees', editFormData.id);
      const payload = {
        id: editFormData.id,
        name: editFormData.name,
        tagline: editFormData.tagline,
        description: editFormData.description,
        benefits: editFormData.benefits,
        initiatives: editFormData.initiatives,
        meetingTime: editFormData.meetingTime,
        meetingLocation: editFormData.meetingLocation,
        leadOfficer: editFormData.leadOfficer,
        leadOfficerRole: editFormData.leadOfficerRole,
        contactEmail: editFormData.contactEmail,
        photos: editFormData.photos,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || 'shpetxst@gmail.com',
      };

      await setDoc(docRef, payload, { merge: true });
      setCmsFeedback({ type: 'success', text: `Changes saved for ${editFormData.name}!` });
      setIsEditing(false);
    } catch (err) {
      setCmsFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save committee changes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Photo to Firebase Storage with base64 fallback
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setCmsFeedback(null);

    try {
      let downloadUrl = '';
      try {
        const fileRef = ref(storage, `committees/${activeCommittee.id}/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        downloadUrl = await getDownloadURL(snapshot.ref);
      } catch (storageErr) {
        console.warn('Firebase Storage upload warning, falling back to data URL:', storageErr);
        downloadUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const updatedPhotos = [...(editFormData.photos || []), downloadUrl];
      setEditFormData((prev) => ({ ...prev, photos: updatedPhotos }));

      // Also auto-save to Firestore if currently editing
      const docRef = doc(db, 'committees', activeCommittee.id);
      await setDoc(docRef, { photos: updatedPhotos, updatedAt: serverTimestamp() }, { merge: true });

      setCmsFeedback({ type: 'success', text: 'Photo uploaded and saved to committee gallery!' });
    } catch (uploadErr) {
      setCmsFeedback({
        type: 'error',
        text: uploadErr instanceof Error ? uploadErr.message : 'Failed to upload photo.',
      });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAddPhotoUrl = () => {
    if (!newPhotoUrlInput.trim()) return;
    const updated = [...(editFormData.photos || []), newPhotoUrlInput.trim()];
    setEditFormData((prev) => ({ ...prev, photos: updated }));
    setNewPhotoUrlInput('');
  };

  const handleRemovePhoto = (idxToRemove: number) => {
    const updated = editFormData.photos.filter((_, idx) => idx !== idxToRemove);
    setEditFormData((prev) => ({ ...prev, photos: updated }));
  };

  const handleAddBenefit = () => {
    if (!newBenefitInput.trim()) return;
    setEditFormData((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), newBenefitInput.trim()]
    }));
    setNewBenefitInput('');
  };

  const handleRemoveBenefit = (idx: number) => {
    setEditFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== idx)
    }));
  };

  const handleAddInitiative = () => {
    if (!newInitiativeInput.trim()) return;
    setEditFormData((prev) => ({
      ...prev,
      initiatives: [...(prev.initiatives || []), newInitiativeInput.trim()]
    }));
    setNewInitiativeInput('');
  };

  const handleRemoveInitiative = (idx: number) => {
    setEditFormData((prev) => ({
      ...prev,
      initiatives: prev.initiatives.filter((_, i) => i !== idx)
    }));
  };

  const getCommitteeIcon = (id: string, className = 'w-5 h-5') => {
    switch (id) {
      case 'athletics': return <Trophy className={className} />;
      case 'chapter-dev': return <Users className={className} />;
      case 'events': return <Calendar className={className} />;
      case 'executive-board': return <ShieldCheck className={className} />;
      case 'fundraising': return <DollarSign className={className} />;
      case 'media': return <Camera className={className} />;
      case 'shpetinas': return <Heart className={className} />;
      case 'technology': return <Code2 className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20 animate-fade-in">
      
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-900 text-white py-14 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto space-y-4 text-center md:text-left">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-primary-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>SHPE Texas State Leadership & Involvement</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Our 6 Official Committees
          </h1>
          <p className="text-sm md:text-base text-primary-100 max-w-3xl leading-relaxed">
            Every breakthrough at SHPE Texas State happens through our committees. Whether you want to build cutting-edge tech, coordinate athletics, plan signature events, design creative media, empower SHPEtinas, or secure fundraising sponsors, there is a place for you to lead.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6">
        
        {/* Navigation Tabs for All 6 Committees */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-2 overflow-x-auto scrollbar-none">
          <div className="flex space-x-1.5 min-w-max">
            {committees.map((comm) => {
              const isActive = comm.id === activeCommittee.id;
              return (
                <button
                  key={comm.id}
                  onClick={() => handleSelectTab(comm.id)}
                  className={`flex items-center space-x-2 py-3 px-4 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {getCommitteeIcon(comm.id, 'w-4 h-4')}
                  <span>{comm.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin CMS Floating Controls */}
        {isAdmin && (
          <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-2.5 text-xs text-amber-950 font-medium">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg">
                <Edit3 className="w-4 h-4" />
              </span>
              <div>
                <p className="font-bold">Admin Content Management System (CMS)</p>
                <p className="text-[11px] text-amber-800">
                  Logged in as <strong>{user?.email}</strong>. You can edit text, manage benefits, and upload photos to Firebase Storage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditFormData(activeCommittee);
                  setIsEditing(!isEditing);
                  setCmsFeedback(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {isEditing ? 'Cancel Editing' : `Edit ${activeCommittee.name}`}
              </button>
            </div>
          </div>
        )}

        {/* CMS Notification Feedback */}
        {cmsFeedback && (
          <div className={`mt-4 p-4 rounded-2xl text-xs flex items-center space-x-2 border ${
            cmsFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}>
            {cmsFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            )}
            <span className="font-semibold">{cmsFeedback.text}</span>
          </div>
        )}

        {/* Main Content View (or Admin CMS Edit Form) */}
        {isEditing && isAdmin ? (
          /* ================= ADMIN CMS EDIT FORM ================= */
          <form onSubmit={handleSaveCommitteeCMS} className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6">
            <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">
                  Editing: {activeCommittee.name}
                </h2>
                <p className="text-xs text-gray-500">
                  Update text content, upload new committee photos, and modify benefits.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save to Firestore'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Committee Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Tagline</label>
                <input
                  type="text"
                  value={editFormData.tagline}
                  onChange={(e) => setEditFormData({ ...editFormData, tagline: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">What We Do (Description)</label>
              <textarea
                rows={4}
                required
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full text-xs p-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 leading-relaxed"
              />
            </div>

            {/* Meeting & Leadership Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Meeting Time</label>
                <input
                  type="text"
                  value={editFormData.meetingTime}
                  onChange={(e) => setEditFormData({ ...editFormData, meetingTime: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Meeting Location</label>
                <input
                  type="text"
                  value={editFormData.meetingLocation}
                  onChange={(e) => setEditFormData({ ...editFormData, meetingLocation: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Lead Officer(s)</label>
                <input
                  type="text"
                  value={editFormData.leadOfficer}
                  onChange={(e) => setEditFormData({ ...editFormData, leadOfficer: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Leadership Role Title</label>
                <input
                  type="text"
                  value={editFormData.leadOfficerRole}
                  onChange={(e) => setEditFormData({ ...editFormData, leadOfficerRole: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium"
                />
              </div>
            </div>

            {/* Committee Leader Email Input */}
            <div className="bg-primary-50/70 p-4 rounded-2xl border border-primary-200 space-y-1.5">
              <label className="text-xs font-bold text-primary-950 flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-primary-700" />
                <span>Committee Leader Email Address (For Interactive Contact Inquiries) *</span>
              </label>
              <input
                type="email"
                value={editFormData.contactEmail || ''}
                onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                placeholder="e.g. shpetxst@gmail.com or committee.lead@txstate.edu"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-primary-300 rounded-xl font-mono text-gray-900 focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-[11px] text-gray-500">
                Admin can specify the leader's email here. When members click the Contact button, Gmail and Outlook web compose will pre-fill this address.
              </p>
            </div>

            {/* Benefits of Joining Management */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-800">Benefits of Joining (Bullet Points)</label>
              <div className="space-y-2">
                {editFormData.benefits?.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => {
                        const updated = [...editFormData.benefits];
                        updated[idx] = e.target.value;
                        setEditFormData({ ...editFormData, benefits: updated });
                      }}
                      className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(idx)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a new benefit point..."
                    value={newBenefitInput}
                    onChange={(e) => setNewBenefitInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Benefit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Key Initiatives Management */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-800">Signature Initiatives & Events</label>
              <div className="space-y-2">
                {editFormData.initiatives?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const updated = [...editFormData.initiatives];
                        updated[idx] = e.target.value;
                        setEditFormData({ ...editFormData, initiatives: updated });
                      }}
                      className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInitiative(idx)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a signature event or project..."
                    value={newInitiativeInput}
                    onChange={(e) => setNewInitiativeInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddInitiative}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Initiative</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Gallery & Firebase Storage Upload */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">
                    Committee Photo Showcase (Firebase Storage)
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Upload photos directly to Firebase Storage or add external URLs.
                  </p>
                </div>

                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Photo Previews */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {editFormData.photos?.map((photoUrl, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                    <img src={photoUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="url"
                  placeholder="Or enter image URL (https://...)"
                  value={newPhotoUrlInput}
                  onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold"
                >
                  Add URL
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ================= COMMITTEE PUBLIC VIEW ================= */
          <div className="mt-8 space-y-8">
            
            {/* Committee Header Profile */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3.5 bg-primary-50 text-primary-600 rounded-2xl shadow-xs">
                    {getCommitteeIcon(activeCommittee.id, 'w-8 h-8')}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {activeCommittee.name}
                    </h2>
                    <p className="text-sm font-medium text-primary-700 mt-1">
                      {activeCommittee.tagline}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Open to All Members</span>
                  </span>
                </div>
              </div>

              {/* What We Do Section */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span>What We Do</span>
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-normal">
                  {activeCommittee.description}
                </p>
              </div>

              {/* Quick Details Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span>Meeting Time</span>
                  </div>
                  <p className="text-xs font-extrabold text-gray-900">
                    {activeCommittee.meetingTime}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    <span>Location</span>
                  </div>
                  <p className="text-xs font-extrabold text-gray-900">
                    {activeCommittee.meetingLocation}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
                    <UserCheck className="w-4 h-4 text-primary-600" />
                    <span>Leadership</span>
                  </div>
                  <p className="text-xs font-extrabold text-gray-900 truncate">
                    {activeCommittee.leadOfficer}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {activeCommittee.leadOfficerRole}
                  </p>
                </div>
              </div>
            </div>

            {/* Grid: Benefits of Joining & Signature Initiatives */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Benefits Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">Benefits of Joining</h3>
                    <p className="text-xs text-gray-500">Why join {activeCommittee.name}?</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {activeCommittee.benefits?.map((benefit, idx) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-emerald-50/40 rounded-2xl border border-emerald-100/60">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature Initiatives Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">Key Initiatives & Events</h3>
                    <p className="text-xs text-gray-500">What our members accomplish together</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {activeCommittee.initiatives?.map((init, idx) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-primary-50/40 rounded-2xl border border-primary-100/60">
                      <ChevronRight className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-800 leading-relaxed font-medium">
                        {init}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Photo Gallery Showcase */}
            {activeCommittee.photos && activeCommittee.photos.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900 flex items-center space-x-2">
                      <ImageIcon className="w-5 h-5 text-primary-600" />
                      <span>{activeCommittee.name} in Action</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Snapshots from recent projects, competitions, and committee socials.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {activeCommittee.photos.map((photoUrl, idx) => (
                    <div key={idx} className="group relative rounded-2xl overflow-hidden aspect-video bg-gray-100 border border-gray-200/60 shadow-xs">
                      <img
                        src={photoUrl}
                        alt={`${activeCommittee.name} photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          const fallback = COMMITTEE_IMAGE_FALLBACKS[activeCommittee.id] || '/assets/images/SHPENATIONALCONV.jpg';
                          target.src = fallback;
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Join This Committee Call-to-Action */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-black tracking-tight">
                  Interested in joining {activeCommittee.name}?
                </h3>
                <p className="text-xs md:text-sm text-primary-100 max-w-xl leading-relaxed">
                  Join our weekly meetings at {activeCommittee.meetingLocation} or connect with {activeCommittee.leadOfficer} to get involved right away!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <ContactEmailButton
                  email={activeCommittee.contactEmail || 'shpetxst@gmail.com'}
                  label={`Contact ${activeCommittee.leadOfficer || 'Committee Lead'}`}
                  subject={`Joining ${activeCommittee.name} - SHPE Texas State`}
                  body={`Hello ${activeCommittee.leadOfficer || 'Committee Lead'},\n\nI am interested in joining the ${activeCommittee.name} at SHPE Texas State!\n\nBest regards,\n`}
                  variant="outline"
                  size="md"
                />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default CommitteesPage;
