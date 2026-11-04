import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Check, 
  RefreshCw, 
  Camera, 
  Shield, 
  Layers, 
  User, 
  DollarSign, 
  AlertCircle, 
  Sparkles, 
  Image as ImageIcon,
  Loader2,
  Trash2,
  Plus,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { 
  SiteImageRecord, 
  subscribeSiteImages, 
  updateSiteImage, 
  uploadToFirebaseStorage,
  DEFAULT_SITE_IMAGES 
} from '../../services/imageManagementService';
import { 
  Officer, 
  subscribeOfficers, 
  saveOfficerProfile, 
  DEFAULT_OFFICERS 
} from '../../services/officersService';
import { 
  Sponsor, 
  subscribeSponsors, 
  saveSponsor, 
  DEFAULT_SPONSORS 
} from '../../services/sponsorsService';
import {
  WeeklyAnnouncement,
  subscribeWeeklyAnnouncements,
  saveWeeklyAnnouncement,
  uploadAnnouncementImage,
  deleteWeeklyAnnouncement,
  DEFAULT_WEEKLY_ANNOUNCEMENTS
} from '../../services/announcementsService';
import {
  MentorShpePhoto,
  subscribeMentorGallery,
  uploadMentorGalleryPhoto,
  deleteMentorGalleryPhoto,
  DEFAULT_MENTOR_PHOTOS
} from '../../services/mentorshipService';

type TabKey = 'site' | 'officers' | 'sponsors' | 'announcements' | 'mentorshpe';

interface ReplaceTarget {
  type: 'site' | 'officer' | 'sponsor' | 'announcement' | 'mentorshpe';
  id: string;
  title: string;
  currentUrl: string;
  officerData?: Officer;
  sponsorData?: Sponsor;
  announcementData?: WeeklyAnnouncement;
}

export const AdminImageManagement: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('site');
  const [siteImages, setSiteImages] = useState<SiteImageRecord[]>(DEFAULT_SITE_IMAGES);
  const [officers, setOfficers] = useState<Officer[]>(DEFAULT_OFFICERS);
  const [sponsors, setSponsors] = useState<Sponsor[]>(DEFAULT_SPONSORS);
  const [announcements, setAnnouncements] = useState<WeeklyAnnouncement[]>(DEFAULT_WEEKLY_ANNOUNCEMENTS);
  const [mentorPhotos, setMentorPhotos] = useState<MentorShpePhoto[]>(DEFAULT_MENTOR_PHOTOS);

  // Target item for replace modal
  const [targetItem, setTargetItem] = useState<ReplaceTarget | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  
  // Progress and state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Slide modal state
  const [isNewSlideModalOpen, setIsNewSlideModalOpen] = useState(false);
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideWeekLabel, setNewSlideWeekLabel] = useState('');
  const [newSlideDescription, setNewSlideDescription] = useState('');
  const [newSlideFile, setNewSlideFile] = useState<File | null>(null);
  const [newSlidePreview, setNewSlidePreview] = useState('');
  const [slideDeleteConfirmId, setSlideDeleteConfirmId] = useState<string | null>(null);
  const [slideActionMessage, setSlideActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Mentor Photo modal state
  const [isNewMentorModalOpen, setIsNewMentorModalOpen] = useState(false);
  const [newMentorTitle, setNewMentorTitle] = useState('');
  const [newMentorCaption, setNewMentorCaption] = useState('');
  const [newMentorFile, setNewMentorFile] = useState<File | null>(null);
  const [newMentorPreview, setNewMentorPreview] = useState('');
  const [mentorDeleteConfirmId, setMentorDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newSlideFileInputRef = useRef<HTMLInputElement>(null);
  const newMentorFileInputRef = useRef<HTMLInputElement>(null);

  // Real-time subscriptions
  useEffect(() => {
    const unsubSite = subscribeSiteImages((data) => setSiteImages(data));
    const unsubOfficers = subscribeOfficers((data) => setOfficers(data));
    const unsubSponsors = subscribeSponsors((data) => setSponsors(data));
    const unsubAnnouncements = subscribeWeeklyAnnouncements((data) => setAnnouncements(data));
    const unsubMentor = subscribeMentorGallery((data) => setMentorPhotos(data));

    return () => {
      unsubSite();
      unsubOfficers();
      unsubSponsors();
      unsubAnnouncements();
      unsubMentor();
    };
  }, []);

  const handleOpenReplace = (target: ReplaceTarget) => {
    setTargetItem(target);
    setSelectedFile(null);
    setFilePreview('');
    setUrlInput('');
    setFeedback(null);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setFilePreview(objUrl);
      setFeedback(null);
    } catch (err) {
      console.error('File selection error:', err);
      setFeedback({ type: 'error', text: 'Could not preview file. Please try another image.' });
    }
  };

  const handleExecuteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    if (uploadMode === 'file' && !selectedFile && !filePreview) {
      setFeedback({ type: 'error', text: 'Please select an image file to upload.' });
      return;
    }
    if (uploadMode === 'url' && !urlInput.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a valid image URL.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setFeedback(null);

    try {
      let finalUrl = uploadMode === 'url' ? urlInput.trim() : filePreview;
      if (uploadMode === 'file' && selectedFile) {
        finalUrl = await uploadToFirebaseStorage(
          selectedFile, 
          `${targetItem.type}_images`,
          (pct) => setUploadProgress(pct)
        );
      }

      const editorEmail = user?.email || 'shpetxst@gmail.com';

      if (targetItem.type === 'site') {
        await updateSiteImage(targetItem.id, finalUrl, editorEmail);
      } else if (targetItem.type === 'officer' && targetItem.officerData) {
        await saveOfficerProfile(
          {
            ...targetItem.officerData,
            image: finalUrl,
          },
          editorEmail
        );
      } else if (targetItem.type === 'sponsor' && targetItem.sponsorData) {
        await saveSponsor(
          {
            ...targetItem.sponsorData,
            image: finalUrl,
          },
          editorEmail
        );
      }

      setFeedback({ 
        type: 'success', 
        text: 'Image successfully uploaded to Firebase Storage and synced with Firestore!' 
      });

      setTimeout(() => {
        setTargetItem(null);
        setFeedback(null);
        setUploadProgress(0);
      }, 1500);
    } catch (err) {
      console.error('Upload execution error:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to replace image. Please check storage permissions.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Upload New Slide to Announcements Slideshow
  const handleSaveNewSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideFile && !newSlidePreview) {
      setSlideActionMessage({ type: 'error', text: 'Please select an image file to upload.' });
      return;
    }
    if (!newSlideTitle.trim()) {
      setSlideActionMessage({ type: 'error', text: 'Please enter a slide title.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setSlideActionMessage(null);

    try {
      let finalImageUrl = newSlidePreview;
      if (newSlideFile) {
        finalImageUrl = await uploadAnnouncementImage(
          newSlideFile,
          'weekly_slide',
          (pct) => setUploadProgress(pct)
        );
      }

      const newId = await saveWeeklyAnnouncement(
        {
          title: newSlideTitle.trim(),
          weekLabel: newSlideWeekLabel.trim() || `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          description: newSlideDescription.trim(),
          imageUrl: finalImageUrl,
          active: true,
          order: announcements.length,
        },
        user?.email || 'shpetxst@gmail.com'
      );

      // Optimistically add to UI state
      if (newId) {
        const newRecord: WeeklyAnnouncement = {
          id: newId,
          title: newSlideTitle.trim(),
          weekLabel: newSlideWeekLabel.trim() || `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          description: newSlideDescription.trim(),
          imageUrl: finalImageUrl,
          active: true,
          order: announcements.length,
        };
        setAnnouncements((prev) => [newRecord, ...prev.filter((a) => a.id !== newId)]);
      }

      setSlideActionMessage({ type: 'success', text: 'Slide uploaded and published to slideshow!' });
      setTimeout(() => {
        setIsNewSlideModalOpen(false);
        setNewSlideFile(null);
        setNewSlidePreview('');
        setNewSlideTitle('');
        setNewSlideWeekLabel('');
        setNewSlideDescription('');
        setSlideActionMessage(null);
        setUploadProgress(0);
      }, 1400);
    } catch (err) {
      console.error('Save slide error:', err);
      setSlideActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to upload announcement slide.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Immediate Delete Slide from Slideshow (Firebase Storage + Firestore + Immediate UI state update)
  const handleDeleteSlide = async (slide: WeeklyAnnouncement) => {
    try {
      await deleteWeeklyAnnouncement(slide.id, slide.imageUrl);
      // Immediately remove from UI state without hard refresh
      setAnnouncements((prev) => prev.filter((s) => s.id !== slide.id));
      setSlideDeleteConfirmId(null);
      setSlideActionMessage({ type: 'success', text: `Slide "${slide.title}" deleted from Firestore & Storage.` });
      setTimeout(() => setSlideActionMessage(null), 3000);
    } catch (err) {
      console.error('Delete slide error:', err);
      setSlideActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete slide.',
      });
    }
  };

  // Upload New MentorSHPE Photo
  const handleSaveNewMentorPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentorFile) {
      setFeedback({ type: 'error', text: 'Please select a photo file.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setFeedback(null);

    try {
      const addedPhoto = await uploadMentorGalleryPhoto(
        newMentorFile,
        newMentorTitle || 'MentorSHPE Activity',
        newMentorCaption,
        user?.email || 'shpetxst@gmail.com',
        (pct) => setUploadProgress(pct)
      );

      // Immediate UI update
      setMentorPhotos((prev) => [addedPhoto, ...prev.filter((p) => p.id !== addedPhoto.id)]);
      setFeedback({ type: 'success', text: 'MentorSHPE photo uploaded to Storage & gallery!' });
      setTimeout(() => {
        setIsNewMentorModalOpen(false);
        setNewMentorFile(null);
        setNewMentorPreview('');
        setNewMentorTitle('');
        setNewMentorCaption('');
        setFeedback(null);
        setUploadProgress(0);
      }, 1400);
    } catch (err) {
      console.error('Mentor photo upload error:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to upload MentorSHPE photo.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Immediate Delete MentorSHPE Photo
  const handleDeleteMentorPhoto = async (photo: MentorShpePhoto) => {
    try {
      await deleteMentorGalleryPhoto(photo);
      setMentorPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setMentorDeleteConfirmId(null);
      setFeedback({ type: 'success', text: `Photo "${photo.title}" deleted from gallery.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Delete mentor photo error:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete photo from gallery.',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-2 border-[#501214] space-y-4">
          <div className="w-16 h-16 bg-[#501214] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-[#1A1A1A]">Verifying Admin Credentials...</h2>
          <p className="text-xs text-gray-700">
            Checking storage permissions for <strong className="text-[#501214]">shpetxst@gmail.com</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-24 px-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-2 border-[#501214] space-y-4">
          <div className="w-16 h-16 bg-[#501214] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#1A1A1A]">Administrator Access Required</h2>
          <p className="text-xs text-gray-700">
            Image management across the website is strictly authorized for <strong className="text-[#501214]">shpetxst@gmail.com</strong>.
          </p>
          <div className="pt-2">
            <Link
              to="/profile"
              className="inline-block px-5 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              Go to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* TOP COMMAND HEADER */}
        <div className="bg-white rounded-3xl shadow-md border-2 border-gray-200 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#501214] text-white rounded-lg text-xs font-black shadow-xs">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>Admin Authority: shpetxst@gmail.com</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A] tracking-tight">
              Site Image Management & Firebase Storage
            </h1>
            <p className="text-xs sm:text-sm text-gray-700 max-w-2xl leading-relaxed">
              Upload, replace, or manage photos across the chapter site (hero banners, announcements slideshow flyers, officer headshots, sponsor logos, and MentorSHPE gallery). Stored securely in Firebase Storage with instant Firestore sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/analytics"
              className="px-4 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-bold transition-colors"
            >
              Time Logs & Analytics &rarr;
            </Link>
            <Link
              to="/"
              className="px-4 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-black transition-colors shadow-sm"
            >
              View Live Site
            </Link>
          </div>
        </div>

        {/* ACTION FEEDBACK ALERT */}
        {slideActionMessage && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs ${
            slideActionMessage.type === 'success'
              ? 'bg-emerald-700 text-white'
              : 'bg-red-700 text-white'
          }`}>
            <div className="flex items-center space-x-2">
              {slideActionMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{slideActionMessage.text}</span>
            </div>
            <button
              onClick={() => setSlideActionMessage(null)}
              className="px-2 py-0.5 bg-black/20 hover:bg-black/40 rounded text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NAVIGATION TABS - CRISP SOLID COLORS (NO FADED PASTELS) */}
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-gray-300 pb-3">
          <button
            onClick={() => setActiveTab('site')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'site'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Hero & Banners ({siteImages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'announcements'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Announcements Slideshow ({announcements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('officers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'officers'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Officer Headshots ({officers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sponsors')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'sponsors'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Sponsor Logos ({sponsors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('mentorshpe')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
              activeTab === 'mentorshpe'
                ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-md'
                : 'bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>MentorSHPE Gallery ({mentorPhotos.length})</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: SITE BANNERS & HERO                                     */}
        {/* ============================================================== */}
        {activeTab === 'site' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {siteImages.map((img) => (
              <div 
                key={img.id}
                className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="relative aspect-[16/9] bg-gray-950 overflow-hidden">
                    <img 
                      src={img.currentUrl} 
                      alt={img.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = img.defaultUrl;
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-[#501214] px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
                      {img.category}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-sm font-extrabold text-[#1A1A1A]">{img.title}</h3>
                    <p className="text-xs text-gray-700 leading-relaxed">{img.description}</p>
                    <div className="pt-2 text-[10px] font-mono text-gray-500 break-all truncate">
                      Source: {img.currentUrl}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => handleOpenReplace({
                      type: 'site',
                      id: img.id,
                      title: img.title,
                      currentUrl: img.currentUrl
                    })}
                    className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Replace Banner</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ANNOUNCEMENTS SLIDESHOW (COMPLETE SLIDE MANAGER)       */}
        {/* ============================================================== */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border-2 border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#1A1A1A]">
                  Weekly Announcements Slideshow Manager
                </h2>
                <p className="text-xs text-gray-700">
                  Manage all flyers and banners featured in the 30-second automated homepage slideshow. Deleting an item permanently removes the asset from Firebase Storage and Firestore.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsNewSlideModalOpen(true)}
                  className="px-4 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload New Slide Flyer</span>
                </button>
                <a
                  href="/#Announcements"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <span>Preview Slideshow</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((slide) => (
                <div
                  key={slide.id}
                  className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="relative aspect-[16/9] bg-gray-950 overflow-hidden">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-[#501214] text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-xs">
                        {slide.weekLabel}
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="text-sm font-extrabold text-[#1A1A1A] line-clamp-1">{slide.title}</h3>
                      {slide.description && (
                        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{slide.description}</p>
                      )}
                      <div className="pt-1 text-[10px] font-mono text-gray-500 truncate">
                        ID: {slide.id}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-gray-100">
                    <a
                      href={slide.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#501214] font-extrabold hover:underline"
                    >
                      View Original Flyer
                    </a>

                    {slideDeleteConfirmId === slide.id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteSlide(slide)}
                          className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setSlideDeleteConfirmId(null)}
                          className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-[#1A1A1A] rounded-xl text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSlideDeleteConfirmId(slide.id)}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs transition-colors"
                        title="Delete announcement slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Slide</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: OFFICER HEADSHOTS                                       */}
        {/* ============================================================== */}
        {activeTab === 'officers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {officers.map((off) => (
              <div 
                key={off.id}
                className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <img 
                      src={off.image} 
                      alt={off.name} 
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = '/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png';
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-[#501214] px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow-xs">
                      {off.group}
                    </div>
                  </div>

                  <div className="p-4 space-y-1">
                    <h3 className="text-sm font-extrabold text-[#1A1A1A]">{off.name}</h3>
                    <p className="text-xs font-bold text-[#501214]">{off.position}</p>
                    <p className="text-[11px] text-gray-700">{off.major} • {off.gradYear}</p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => handleOpenReplace({
                      type: 'officer',
                      id: off.id,
                      title: `${off.name} (${off.position})`,
                      currentUrl: off.image,
                      officerData: off,
                    })}
                    className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Replace Headshot</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: SPONSOR LOGOS                                           */}
        {/* ============================================================== */}
        {activeTab === 'sponsors' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {sponsors.map((sp) => (
              <div 
                key={sp.id}
                className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow space-y-4"
              >
                <div>
                  <div className="h-28 bg-gray-50 rounded-2xl flex items-center justify-center p-4 border-2 border-gray-200">
                    <img 
                      src={sp.image} 
                      alt={sp.title} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="mt-4 space-y-1 text-center">
                    <h3 className="text-base font-extrabold text-[#1A1A1A]">{sp.title}</h3>
                    <p className="text-xs text-gray-700">{sp.subtitle || 'Chapter Partner'}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenReplace({
                    type: 'sponsor',
                    id: sp.id,
                    title: `${sp.title} Logo`,
                    currentUrl: sp.image,
                    sponsorData: sp,
                  })}
                  className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Replace Sponsor Logo</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: MENTORSHPE GALLERY (DIRECT IMAGE MANAGER)               */}
        {/* ============================================================== */}
        {activeTab === 'mentorshpe' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border-2 border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#1A1A1A]">
                  MentorSHPE Gallery Photo Manager
                </h2>
                <p className="text-xs text-gray-700">
                  Manage photos showcased in the MentorSHPE program section. Uploaded photos are stored in Firebase Storage (`/mentorshpe/`).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsNewMentorModalOpen(true)}
                  className="px-4 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload MentorSHPE Photo</span>
                </button>
                <Link
                  to="/programs/mentorshpe"
                  className="px-3 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <span>View Program Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {mentorPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-3xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="relative aspect-[4/3] bg-gray-950 overflow-hidden">
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-4 space-y-1">
                      <h3 className="text-sm font-extrabold text-[#1A1A1A] line-clamp-1">{photo.title}</h3>
                      <p className="text-xs text-gray-700 line-clamp-2">{photo.caption}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-gray-100">
                    <a
                      href={photo.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#501214] font-extrabold hover:underline"
                    >
                      View Full Photo
                    </a>

                    {mentorDeleteConfirmId === photo.id ? (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleDeleteMentorPhoto(photo)}
                          className="px-2.5 py-1 bg-red-700 text-white rounded-lg text-xs font-bold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setMentorDeleteConfirmId(null)}
                          className="px-2 py-1 bg-gray-200 text-[#1A1A1A] rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMentorDeleteConfirmId(photo.id)}
                        className="text-red-600 hover:text-red-800 p-1.5 rounded-lg transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* MODAL: UPLOAD & REPLACE IMAGE (BANNERS / OFFICERS / SPONSORS)  */}
      {/* ============================================================== */}
      {targetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border-2 border-gray-300 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#501214] text-white rounded-xl shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1A1A]">
                    Replace Image Asset
                  </h3>
                  <p className="text-xs text-gray-700 truncate max-w-xs">{targetItem.title}</p>
                </div>
              </div>
              <button
                onClick={() => setTargetItem(null)}
                className="text-gray-500 hover:text-[#1A1A1A] text-lg font-black p-1"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs ${
                feedback.type === 'success' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-red-700 text-white'
              }`}>
                {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleExecuteUpload} className="space-y-4 text-xs">
              
              {/* Preview Comparison */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-100 rounded-2xl border-2 border-gray-200">
                <div>
                  <span className="block text-[10px] font-black uppercase text-gray-700 mb-1">Current Image</span>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={targetItem.currentUrl} alt="Current" className="w-full h-full object-contain" />
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-[#501214] mb-1">New Image Preview</span>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-[#501214]">
                    {filePreview || urlInput ? (
                      <img src={filePreview || urlInput} alt="New Preview" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-400">Select file below</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Mode Selector */}
              <div className="flex rounded-xl bg-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                    uploadMode === 'file' ? 'bg-[#501214] text-white shadow-xs' : 'text-[#1A1A1A]'
                  }`}
                >
                  Upload File from Device
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                    uploadMode === 'url' ? 'bg-[#501214] text-white shadow-xs' : 'text-[#1A1A1A]'
                  }`}
                >
                  Enter Image URL
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-[#501214] rounded-2xl p-6 text-center cursor-pointer bg-white transition-all space-y-2"
                  >
                    <Upload className="w-8 h-8 text-[#501214] mx-auto" />
                    <p className="font-extrabold text-[#1A1A1A]">
                      {selectedFile ? selectedFile.name : 'Click to browse new image'}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      Uploads directly to Firebase Storage with progress tracking.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-black text-[#1A1A1A] mb-1">Direct Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-mono text-xs"
                  />
                </div>
              )}

              {/* Progress Indicator */}
              {isUploading && (
                <div className="space-y-1.5 py-1">
                  <div className="flex justify-between text-xs font-black text-[#1A1A1A]">
                    <span className="flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#501214]" />
                      <span>Uploading to Firebase Storage...</span>
                    </span>
                    <span className="font-mono text-[#501214]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#501214] h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t-2 border-gray-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setTargetItem(null)}
                  className="px-4 py-2 text-gray-700 hover:text-[#1A1A1A] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl font-black shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Replace Image</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: UPLOAD NEW SLIDE TO WEEKLY ANNOUNCEMENTS                */}
      {/* ============================================================== */}
      {isNewSlideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border-2 border-gray-300 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200">
              <div className="flex items-center space-x-2 text-[#501214] font-black text-base">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Upload Weekly Announcement Slide</span>
              </div>
              <button
                onClick={() => setIsNewSlideModalOpen(false)}
                className="text-gray-500 hover:text-[#1A1A1A] text-lg font-black p-1"
              >
                ✕
              </button>
            </div>

            {slideActionMessage && (
              <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                slideActionMessage.type === 'success'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-red-700 text-white'
              }`}>
                {slideActionMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{slideActionMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewSlide} className="space-y-4 text-xs">
              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">
                  Flyer / Graphic Image File *
                </label>
                <div
                  onClick={() => newSlideFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-[#501214] rounded-2xl p-4 text-center cursor-pointer bg-gray-50 transition-all"
                >
                  {newSlidePreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden max-h-44 mx-auto bg-black">
                      <img src={newSlidePreview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <Upload className="w-8 h-8 text-[#501214] mx-auto" />
                      <p className="font-extrabold text-[#1A1A1A]">Click to select flyer file</p>
                      <p className="text-[10px] text-gray-500">PNG, JPG, WebP (stored in /announcements/)</p>
                    </div>
                  )}
                    <input
                      ref={newSlideFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        try {
                          const f = e.target.files?.[0];
                          if (f) {
                            setNewSlideFile(f);
                            setNewSlidePreview(URL.createObjectURL(f));
                          }
                        } catch (err) {
                          console.warn('File preview error:', err);
                        }
                      }}
                      className="hidden"
                    />
                </div>
              </div>

              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Slide Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GBM #3: Lockheed Martin Tech Talk"
                  value={newSlideTitle}
                  onChange={(e) => setNewSlideTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Week Label / Badge</label>
                <input
                  type="text"
                  placeholder="e.g. Week of Oct 21 - Oct 27"
                  value={newSlideWeekLabel}
                  onChange={(e) => setNewSlideWeekLabel(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214]"
                />
              </div>

              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Meeting details, room location, food info..."
                  value={newSlideDescription}
                  onChange={(e) => setNewSlideDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214]"
                />
              </div>

              {isUploading && (
                <div className="space-y-1 py-1">
                  <div className="flex justify-between text-xs font-black text-[#1A1A1A]">
                    <span>Uploading slide flyer...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#501214] h-full" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t-2 border-gray-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewSlideModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-[#1A1A1A] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl font-black shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? `Uploading (${uploadProgress}%)...` : 'Add to Slideshow'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: UPLOAD NEW PHOTO TO MENTORSHPE GALLERY                  */}
      {/* ============================================================== */}
      {isNewMentorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border-2 border-gray-300 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200">
              <div className="flex items-center space-x-2 text-[#501214] font-black text-base">
                <ImageIcon className="w-5 h-5 text-[#501214]" />
                <span>Upload MentorSHPE Activity Photo</span>
              </div>
              <button
                onClick={() => setIsNewMentorModalOpen(false)}
                className="text-gray-500 hover:text-[#1A1A1A] text-lg font-black p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewMentorPhoto} className="space-y-4 text-xs">
              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Photo File *</label>
                <div
                  onClick={() => newMentorFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-[#501214] rounded-2xl p-4 text-center cursor-pointer bg-gray-50 transition-all"
                >
                  {newMentorPreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden max-h-44 mx-auto bg-black">
                      <img src={newMentorPreview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <Upload className="w-8 h-8 text-[#501214] mx-auto" />
                      <p className="font-extrabold text-[#1A1A1A]">Click to choose photo</p>
                      <p className="text-[10px] text-gray-500">Stored in Firebase Storage (`/mentorshpe/`)</p>
                    </div>
                  )}
                    <input
                      ref={newMentorFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        try {
                          const f = e.target.files?.[0];
                          if (f) {
                            setNewMentorFile(f);
                            setNewMentorPreview(URL.createObjectURL(f));
                          }
                        } catch (err) {
                          console.warn('File preview error:', err);
                        }
                      }}
                      className="hidden"
                    />
                </div>
              </div>

              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Photo Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mentor-Mentee Study Night at Alkek"
                  value={newMentorTitle}
                  onChange={(e) => setNewMentorTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-[#1A1A1A] mb-1">Caption</label>
                <textarea
                  rows={2}
                  placeholder="Describe the activity, mentors involved, or achievements..."
                  value={newMentorCaption}
                  onChange={(e) => setNewMentorCaption(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214]"
                />
              </div>

              {isUploading && (
                <div className="space-y-1 py-1">
                  <div className="flex justify-between text-xs font-black text-[#1A1A1A]">
                    <span>Uploading photo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#501214] h-full" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t-2 border-gray-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewMentorModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-[#1A1A1A] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl font-black shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? `Uploading (${uploadProgress}%)...` : 'Upload Photo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminImageManagement;
