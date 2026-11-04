import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  GraduationCap, 
  Briefcase, 
  Heart, 
  Calendar, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Shield, 
  ArrowRight,
  BookOpen,
  Award,
  AlertCircle,
  Check,
  Edit3,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  X,
  Loader2,
  Maximize2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ContactEmailButton } from '../ContactEmailButton';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  MentorProgramContent,
  DEFAULT_MENTOR_CONTENT,
  MentorShpePhoto,
  subscribeMentorProgramContent,
  updateMentorProgramContent,
  subscribeMentorShpeGallery,
  uploadMentorGalleryPhoto,
  updateMentorGalleryPhoto,
  deleteMentorGalleryPhoto
} from '../../services/mentorshipService';

interface MentorshipApplication {
  id: string;
  type: 'mentor' | 'mentee';
  userId?: string;
  fullName: string;
  email: string;
  netid: string;
  major: string;
  gradYear: string;
  interestsOrExperience: string;
  goalsOrAdvice: string;
  capacity?: number;
  status: 'pending' | 'paired' | 'reviewed';
  createdAt?: unknown;
}

export const MentorSHPE: React.FC = () => {
  const { user, userProfile, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  // Dynamic program content state
  const [programContent, setProgramContent] = useState<MentorProgramContent>(DEFAULT_MENTOR_CONTENT);
  const [galleryPhotos, setGalleryPhotos] = useState<MentorShpePhoto[]>([]);

  // Application form state
  const [activeFormType, setActiveFormType] = useState<'mentee' | 'mentor'>('mentee');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [netid, setNetid] = useState('');
  const [major, setMajor] = useState('Electrical Engineering');
  const [gradYear, setGradYear] = useState('2028');
  const [interestsOrExperience, setInterestsOrExperience] = useState('');
  const [goalsOrAdvice, setGoalsOrAdvice] = useState('');
  const [mentorCapacity, setMentorCapacity] = useState('1');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Roster of Applications
  const [applications, setApplications] = useState<MentorshipApplication[]>([]);
  const [showAdminRoster, setShowAdminRoster] = useState(false);

  // Admin Program Content Editor Modal State
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAcademicGuidance, setEditAcademicGuidance] = useState('');
  const [editCareerGuidance, setEditCareerGuidance] = useState('');
  const [editFamiliaGuidance, setEditFamiliaGuidance] = useState('');
  const [editMentorGuidelinesText, setEditMentorGuidelinesText] = useState('');
  const [editMenteeGuidelinesText, setEditMenteeGuidelinesText] = useState('');
  const [editMentorApplyLink, setEditMentorApplyLink] = useState('');
  const [editMenteeApplyLink, setEditMenteeApplyLink] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [contentSaveMessage, setContentSaveMessage] = useState<string | null>(null);

  // Admin Photo Upload / Management State
  const [isUploadPhotoModalOpen, setIsUploadPhotoModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFilePreview, setUploadFilePreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadPhotoProgress, setUploadPhotoProgress] = useState(0);
  const [uploadPhotoMessage, setUploadPhotoMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo Lightbox modal
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<MentorShpePhoto | null>(null);

  // Photo Edit / Replace state
  const [editingPhoto, setEditingPhoto] = useState<MentorShpePhoto | null>(null);
  const [replacePhotoFile, setReplacePhotoFile] = useState<File | null>(null);
  const [replacePhotoPreview, setReplacePhotoPreview] = useState<string | null>(null);
  const [editPhotoTitle, setEditPhotoTitle] = useState('');
  const [editPhotoCaption, setEditPhotoCaption] = useState('');
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [updatePhotoMessage, setUpdatePhotoMessage] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-open editor if query param adminEdit=true and user is admin
  useEffect(() => {
    if (isAdmin && (searchParams.get('adminEdit') === 'true' || searchParams.get('edit') === 'true')) {
      setIsContentEditorOpen(true);
    }
  }, [isAdmin, searchParams]);

  // Subscribe to Firestore program configuration
  useEffect(() => {
    const unsub = subscribeMentorProgramContent((data) => {
      setProgramContent(data);
    });
    return () => unsub();
  }, []);

  // Subscribe to MentorSHPE Photo Gallery
  useEffect(() => {
    const unsub = subscribeMentorShpeGallery((photos) => {
      setGalleryPhotos(photos);
    });
    return () => unsub();
  }, []);

  // Pre-fill user info if authenticated
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName || userProfile.displayName || '');
      setEmail(userProfile.email || user?.email || '');
      setNetid(userProfile.netid || userProfile.studentId || (userProfile.txstateEmail ? userProfile.txstateEmail.split('@')[0] : ''));
      if (userProfile.major) setMajor(userProfile.major);
      if (userProfile.gradYear) setGradYear(userProfile.gradYear);
    } else if (user) {
      setFullName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user, userProfile]);

  // Admin real-time listener for mentorship applications
  useEffect(() => {
    if (!isAdmin) return;
    const collRef = collection(db, 'mentorshipApplications');
    const unsub = onSnapshot(
      collRef,
      (snapshot) => {
        const list: MentorshipApplication[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as MentorshipApplication);
        });
        setApplications(list);
      },
      (err) => console.warn('Mentorship applications listener:', err)
    );
    return () => unsub();
  }, [isAdmin]);

  // Open Program Editor with current values
  const handleOpenProgramEditor = () => {
    setEditTitle(programContent.programTitle);
    setEditSubtitle(programContent.programSubtitle);
    setEditDescription(programContent.description);
    setEditAcademicGuidance(programContent.academicGuidance);
    setEditCareerGuidance(programContent.careerGuidance);
    setEditFamiliaGuidance(programContent.familiaGuidance);
    setEditMentorGuidelinesText((programContent.mentorGuidelines || []).join('\n'));
    setEditMenteeGuidelinesText((programContent.menteeGuidelines || []).join('\n'));
    setEditMentorApplyLink(programContent.mentorApplyLink || '');
    setEditMenteeApplyLink(programContent.menteeApplyLink || '');
    setEditContactEmail(programContent.contactEmail || 'shpetxst@gmail.com');
    setContentSaveMessage(null);
    setIsContentEditorOpen(true);
  };

  // Save Program Content to Firestore
  const handleSaveProgramContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContent(true);
    setContentSaveMessage(null);

    const parsedMentorGuidelines = editMentorGuidelinesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedMenteeGuidelines = editMenteeGuidelinesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await updateMentorProgramContent({
        programTitle: editTitle.trim() || DEFAULT_MENTOR_CONTENT.programTitle,
        programSubtitle: editSubtitle.trim() || DEFAULT_MENTOR_CONTENT.programSubtitle,
        description: editDescription.trim() || DEFAULT_MENTOR_CONTENT.description,
        academicGuidance: editAcademicGuidance.trim() || DEFAULT_MENTOR_CONTENT.academicGuidance,
        careerGuidance: editCareerGuidance.trim() || DEFAULT_MENTOR_CONTENT.careerGuidance,
        familiaGuidance: editFamiliaGuidance.trim() || DEFAULT_MENTOR_CONTENT.familiaGuidance,
        mentorGuidelines: parsedMentorGuidelines.length > 0 ? parsedMentorGuidelines : DEFAULT_MENTOR_CONTENT.mentorGuidelines,
        menteeGuidelines: parsedMenteeGuidelines.length > 0 ? parsedMenteeGuidelines : DEFAULT_MENTOR_CONTENT.menteeGuidelines,
        mentorApplyLink: editMentorApplyLink.trim(),
        menteeApplyLink: editMenteeApplyLink.trim(),
        contactEmail: editContactEmail.trim() || 'shpetxst@gmail.com',
      }, user?.email || 'shpetxst@gmail.com');

      setContentSaveMessage('MentorSHPE program details successfully saved to Firestore!');
      setTimeout(() => {
        setIsContentEditorOpen(false);
        setContentSaveMessage(null);
      }, 1400);
    } catch (err) {
      setContentSaveMessage(err instanceof Error ? err.message : 'Failed to update program content.');
    } finally {
      setIsSavingContent(false);
    }
  };

  // Handle Photo File selection for Upload
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        setUploadFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadFilePreview(reader.result as string);
        };
        reader.onerror = () => {
          setUploadPhotoMessage('Unable to read selected file.');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('File selection notice:', err);
      setUploadPhotoMessage('Error accessing selected image.');
    }
  };

  // Submit New Photo to Gallery (Firebase Storage + Firestore)
  const handleUploadPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadPhotoMessage('Please select an image file to upload.');
      return;
    }

    setIsUploadingPhoto(true);
    setUploadPhotoProgress(15);
    setUploadPhotoMessage(null);

    try {
      await uploadMentorGalleryPhoto(
        uploadFile,
        uploadTitle || 'MentorSHPE Activity',
        uploadCaption,
        user?.email || 'shpetxst@gmail.com',
        (pct) => setUploadPhotoProgress(pct)
      );

      setUploadPhotoMessage('Photo uploaded to Firebase Storage and added to gallery!');
      setTimeout(() => {
        setIsUploadPhotoModalOpen(false);
        setUploadFile(null);
        setUploadFilePreview(null);
        setUploadTitle('');
        setUploadCaption('');
        setUploadPhotoMessage(null);
        setUploadPhotoProgress(0);
      }, 1200);
    } catch (err) {
      setUploadPhotoMessage(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Open Edit / Replace Photo Modal
  const handleOpenEditPhotoModal = (photo: MentorShpePhoto) => {
    setEditingPhoto(photo);
    setEditPhotoTitle(photo.title);
    setEditPhotoCaption(photo.caption);
    setReplacePhotoFile(null);
    setReplacePhotoPreview(null);
    setUpdatePhotoMessage(null);
  };

  // Handle Replace Photo File selection
  const handleReplacePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        setReplacePhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setReplacePhotoPreview(reader.result as string);
        };
        reader.onerror = () => {
          setUpdatePhotoMessage('Unable to read selected replacement file.');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Replace file error:', err);
      setUpdatePhotoMessage('Error accessing selected replacement image.');
    }
  };

  // Save Photo Edit / Replacement
  const handleUpdatePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    setIsUpdatingPhoto(true);
    setUploadPhotoProgress(15);
    setUpdatePhotoMessage(null);

    try {
      await updateMentorGalleryPhoto(
        editingPhoto.id,
        {
          title: editPhotoTitle.trim() || editingPhoto.title,
          caption: editPhotoCaption.trim(),
        },
        replacePhotoFile || undefined,
        (pct) => setUploadPhotoProgress(pct)
      );

      setUpdatePhotoMessage('Photo updated successfully in gallery!');
      setTimeout(() => {
        setEditingPhoto(null);
        setReplacePhotoFile(null);
        setReplacePhotoPreview(null);
        setUpdatePhotoMessage(null);
        setUploadPhotoProgress(0);
      }, 1200);
    } catch (err) {
      setUpdatePhotoMessage(err instanceof Error ? err.message : 'Failed to update photo.');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const [photoDeleteConfirmId, setPhotoDeleteConfirmId] = useState<string | null>(null);

  // Delete Photo from Gallery (Firebase Storage + Firestore)
  const handleDeletePhoto = async (photo: MentorShpePhoto) => {
    try {
      await deleteMentorGalleryPhoto(photo);
      setPhotoDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete photo error:', err);
    }
  };

  // Submit built-in application form
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setSubmitFeedback({ type: 'error', text: 'Please fill in your name and email.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);

    const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newApp: MentorshipApplication = {
      id: appId,
      type: activeFormType,
      userId: user?.uid || 'guest',
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      netid: netid.trim().toLowerCase(),
      major: major.trim(),
      gradYear: gradYear.trim(),
      interestsOrExperience: interestsOrExperience.trim(),
      goalsOrAdvice: goalsOrAdvice.trim(),
      capacity: activeFormType === 'mentor' ? Number(mentorCapacity) : 1,
      status: 'pending',
    };

    try {
      const docRef = doc(db, 'mentorshipApplications', appId);
      await setDoc(docRef, {
        ...newApp,
        createdAt: serverTimestamp(),
      });

      setSubmitFeedback({
        type: 'success',
        text: `Application received! Thank you for applying to MentorSHPE as a ${activeFormType}. We will review your submission and email you pairing details.`
      });

      setInterestsOrExperience('');
      setGoalsOrAdvice('');
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit application.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20 animate-fade-in">
      
      {/* ADMIN CONTROL BAR (Visible exclusively to shpetxst@gmail.com) */}
      {isAdmin && (
        <div className="bg-emerald-900 text-white px-4 py-3 sticky top-16 z-30 shadow-md border-b border-emerald-700/60">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <Shield className="w-4 h-4 text-emerald-300" />
              <span className="font-bold">Admin Authority:</span>
              <span className="text-emerald-200">Full editing permissions granted for MentorSHPE program & photo gallery</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenProgramEditor}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Program & Guidelines</span>
              </button>

              <button
                onClick={() => setIsUploadPhotoModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-950 rounded-lg text-xs font-black transition-all shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Upload Gallery Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-950 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12">
          <GraduationCap className="w-96 h-96 text-white" />
        </div>

        <div className="max-w-6xl mx-auto space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-primary-200 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-accent-400" />
              <span>Signature Leadership & Familia Program</span>
            </div>

            {isAdmin && (
              <button
                onClick={handleOpenProgramEditor}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-sm transition-all"
                title="Edit program title and description"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Hero Text</span>
              </button>
            )}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            {programContent.programTitle}
          </h1>
          
          <p className="text-sm md:text-lg text-primary-100 max-w-2xl leading-relaxed font-normal">
            {programContent.programSubtitle}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#apply"
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-primary-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <span>Apply for MentorSHPE</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#gallery"
              className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm rounded-xl backdrop-blur-sm transition-all flex items-center space-x-2"
            >
              <Camera className="w-4 h-4 text-amber-300" />
              <span>View Photo Gallery</span>
            </a>

            <ContactEmailButton
              email={programContent.contactEmail || 'shpetxst@gmail.com'}
              label="Contact Mentorship Lead"
              subject="MentorSHPE Program Inquiry"
              variant="outline"
              size="md"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">

        {/* Program Description Callout */}
        {programContent.description && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <span className="text-xs font-extrabold text-primary-600 uppercase tracking-wider">
                About the Initiative
              </span>
              <h2 className="text-xl md:text-2xl font-black text-gray-900">
                Empowering Bobcat Engineers to Excel Together
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed max-w-4xl pt-1">
                {programContent.description}
              </p>
            </div>
          </div>
        )}

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Academic Guidance</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              {programContent.academicGuidance}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Career & Internships</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              {programContent.careerGuidance}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Familia & Community</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              {programContent.familiaGuidance}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DEDICATED MENTORSHPE PHOTO GALLERY SECTION */}
        {/* ========================================================================= */}
        <div id="gallery" className="bg-white rounded-3xl p-8 md:p-10 border border-gray-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-900 rounded-full text-[11px] font-bold border border-amber-200 mb-2">
                <Camera className="w-3.5 h-3.5 text-amber-600" />
                <span>MentorSHPE Photo Gallery ({galleryPhotos.length} Photos)</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Moments & Memories of Mentorship
              </h2>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                Explore pairings, familia cohort study sessions, resume critiques, and national conference gatherings.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsUploadPhotoModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New Photo</span>
              </button>
            )}
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-xs hover:shadow-md transition-all flex flex-col"
              >
                {/* Image Container with Lightbox Click */}
                <div 
                  className="aspect-4/3 w-full bg-gray-200 relative overflow-hidden cursor-pointer"
                  onClick={() => setActiveLightboxPhoto(photo)}
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2 bg-white/90 text-gray-900 rounded-full shadow-md">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Details & Captions */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{photo.title}</h4>
                    {photo.caption && (
                      <p className="text-xs text-gray-500 leading-relaxed mt-1 line-clamp-2">
                        {photo.caption}
                      </p>
                    )}
                  </div>

                  {/* Admin Management Tools for this photo */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleOpenEditPhotoModal(photo)}
                        className="text-primary-700 hover:text-primary-900 font-bold inline-flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit / Replace</span>
                      </button>

                      {photoDeleteConfirmId === photo.id ? (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleDeletePhoto(photo)}
                            className="px-2 py-0.5 bg-red-700 text-white text-[10px] font-bold rounded"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setPhotoDeleteConfirmId(null)}
                            className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[10px] rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPhotoDeleteConfirmId(photo.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {galleryPhotos.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
              <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No photos added yet to the MentorSHPE gallery.</p>
            </div>
          )}
        </div>

        {/* Expectations Grid */}
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-gray-100 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left space-y-1">
              <span className="text-xs font-extrabold text-primary-600 uppercase tracking-wider">
                Mutual Commitment
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Mentor & Mentee Expectations
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                MentorSHPE is built on trust, consistency, and active engagement. Here is what we ask of each participant:
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={handleOpenProgramEditor}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold self-start sm:self-auto transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary-600" />
                <span>Edit Guidelines</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mentor Expectations */}
            <div className="p-6 bg-gradient-to-br from-primary-50/50 to-white rounded-2xl border-2 border-primary-200/60 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-primary-100">
                <div className="p-2.5 bg-primary-600 text-white rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Mentor Expectations</h3>
                  <p className="text-xs text-primary-700 font-medium">For Upperclassmen & Alumni</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-gray-700">
                {(programContent.mentorGuidelines || DEFAULT_MENTOR_CONTENT.mentorGuidelines).map((rule, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>

              {programContent.mentorApplyLink && (
                <div className="pt-2">
                  <a
                    href={programContent.mentorApplyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-primary-700 hover:text-primary-900 underline"
                  >
                    <span>External Mentor Application Form</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Mentee Expectations */}
            <div className="p-6 bg-gradient-to-br from-amber-50/50 to-white rounded-2xl border-2 border-amber-200/60 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-amber-100">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Mentee Expectations</h3>
                  <p className="text-xs text-amber-800 font-medium">For Freshmen, Sophomores & Transfers</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-gray-700">
                {(programContent.menteeGuidelines || DEFAULT_MENTOR_CONTENT.menteeGuidelines).map((rule, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>

              {programContent.menteeApplyLink && (
                <div className="pt-2">
                  <a
                    href={programContent.menteeApplyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 underline"
                  >
                    <span>External Mentee Application Form</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Semester Timeline */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Program Timeline</h3>
              <p className="text-xs text-gray-500">Key milestones for the current academic semester</p>
            </div>
            <Calendar className="w-6 h-6 text-primary-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1">
              <span className="text-[10px] font-bold text-primary-600 uppercase">Phase 1</span>
              <h4 className="text-sm font-extrabold text-gray-900">Applications Open</h4>
              <p className="text-[11px] text-gray-500 leading-snug">Submit interest form online below.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1">
              <span className="text-[10px] font-bold text-primary-600 uppercase">Phase 2</span>
              <h4 className="text-sm font-extrabold text-gray-900">Pairing & Reveal</h4>
              <p className="text-[11px] text-gray-500 leading-snug">Matched based on major, interests, and career ambitions.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1">
              <span className="text-[10px] font-bold text-primary-600 uppercase">Phase 3</span>
              <h4 className="text-sm font-extrabold text-gray-900">Familia Mixers</h4>
              <p className="text-[11px] text-gray-500 leading-snug">Bi-weekly study nights, bowling socials, and resume reviews.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-1">
              <span className="text-[10px] font-bold text-primary-600 uppercase">Phase 4</span>
              <h4 className="text-sm font-extrabold text-gray-900">End-of-Semester Gala</h4>
              <p className="text-[11px] text-gray-500 leading-snug">Celebration and Mentor of the Year awards.</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE APPLICATION FORM */}
        {/* ========================================================================= */}
        <div id="apply" className="bg-white rounded-3xl p-8 md:p-10 border-2 border-primary-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <span className="text-xs font-extrabold text-primary-600 uppercase tracking-wider">
                Get Involved
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                MentorSHPE Application & Interest Form
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Whether you want to learn or guide, join the Bobcat familia mentorship network.
              </p>
            </div>

            {/* Form Mode Selector */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveFormType('mentee')}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  activeFormType === 'mentee'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Apply as Mentee
              </button>
              <button
                type="button"
                onClick={() => setActiveFormType('mentor')}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  activeFormType === 'mentor'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Apply as Mentor
              </button>
            </div>
          </div>

          {submitFeedback && (
            <div className={`p-4 rounded-2xl flex items-center space-x-3 text-xs ${
              submitFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}>
              {submitFeedback.type === 'success' ? (
                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className="font-semibold">{submitFeedback.text}</span>
            </div>
          )}

          {/* External link callout if admin configured custom link */}
          {((activeFormType === 'mentor' && programContent.mentorApplyLink) || 
            (activeFormType === 'mentee' && programContent.menteeApplyLink)) && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="space-y-0.5">
                <span className="font-bold">Official Application Link:</span>
                <p className="text-amber-700">The chapter leadership has also provided a dedicated application link.</p>
              </div>
              <a
                href={activeFormType === 'mentor' ? programContent.mentorApplyLink : programContent.menteeApplyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center space-x-1.5"
              >
                <span>Open Form</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <form onSubmit={handleSubmitApplication} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-800 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Gonzalez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Texas State Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. mg123@txstate.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-800 mb-1">Texas State NetID *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. mg123"
                  value={netid}
                  onChange={(e) => setNetid(e.target.value.toLowerCase())}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Engineering Major *</label>
                <select
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-medium"
                >
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Manufacturing Engineering">Manufacturing Engineering</option>
                  <option value="Industrial Engineering">Industrial Engineering</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Engineering Technology">Engineering Technology</option>
                  <option value="Other STEM">Other STEM</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Anticipated Graduation *</label>
                <select
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-medium"
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                  <option value="Graduate / Alumni">Graduate / Alumni</option>
                </select>
              </div>
            </div>

            {activeFormType === 'mentee' ? (
              <>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    What areas would you like mentorship in? *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Resume building, finding summer internships, study habits for Circuits I..."
                    value={interestsOrExperience}
                    onChange={(e) => setInterestsOrExperience(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    What are your top 2 goals for this academic semester? *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. 1) Land a summer engineering internship, 2) Keep a 3.5+ GPA"
                    value={goalsOrAdvice}
                    onChange={(e) => setGoalsOrAdvice(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Internships, Research, or Campus Leadership Experience *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Summer intern at Dell / Lockheed Martin, undergraduate research in robotics..."
                    value={interestsOrExperience}
                    onChange={(e) => setInterestsOrExperience(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-800 mb-1">
                      What advice or lessons are you most excited to share with your mentee? *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. How to study effectively, navigate career fairs without nervousness..."
                      value={goalsOrAdvice}
                      onChange={(e) => setGoalsOrAdvice(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-800 mb-1">
                      Max Mentees You Can Support *
                    </label>
                    <select
                      value={mentorCapacity}
                      onChange={(e) => setMentorCapacity(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-medium"
                    >
                      <option value="1">1 Mentee</option>
                      <option value="2">2 Mentees</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
              <p className="text-[11px] text-gray-500">
                Participation is free for all Texas State SHPE members. Pairings are dispatched via email.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting Application...' : `Submit as ${activeFormType === 'mentee' ? 'Mentee' : 'Mentor'}`}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* ADMIN APPLICANT ROSTER (Exclusively for shpetxst@gmail.com) */}
        {/* ========================================================================= */}
        {isAdmin && (
          <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-emerald-400 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Admin Roster: MentorSHPE Applicants ({applications.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Authorized exclusively for <strong className="font-mono text-emerald-800">shpetxst@gmail.com</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAdminRoster(!showAdminRoster)}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
              >
                {showAdminRoster ? 'Hide Table' : 'View Applicants'}
              </button>
            </div>

            {showAdminRoster && (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 mt-4">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Applicant Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Texas State Email</th>
                      <th className="px-4 py-3">Major & Grad Year</th>
                      <th className="px-4 py-3">Interests / Experience</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {applications.length > 0 ? (
                      applications.map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-bold text-gray-900">{app.fullName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              app.type === 'mentor' ? 'bg-primary-100 text-primary-900' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {app.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-700">{app.email}</td>
                          <td className="px-4 py-3 text-gray-600">{app.major} ({app.gradYear})</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{app.interestsOrExperience}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No MentorSHPE applications submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* ADMIN MODAL: EDIT PROGRAM CONTENT & GUIDELINES & LINKS */}
      {/* ========================================================================= */}
      {isContentEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 my-8 space-y-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Edit MentorSHPE Program & Guidelines
                  </h3>
                  <p className="text-xs text-gray-500">
                    Changes will dynamically update the live MentorSHPE page for all members.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsContentEditorOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {contentSaveMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-200">
                {contentSaveMessage}
              </div>
            )}

            <form onSubmit={handleSaveProgramContent} className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block font-bold text-gray-800 mb-1">Program Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Hero Subtitle *</label>
                <textarea
                  rows={2}
                  required
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Program Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <span className="font-extrabold text-primary-700 text-xs uppercase block mb-2">
                  Three Core Pillars Guidance Text
                </span>
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">1. Academic Guidance Text</label>
                    <textarea
                      rows={2}
                      value={editAcademicGuidance}
                      onChange={(e) => setEditAcademicGuidance(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">2. Career & Internships Guidance Text</label>
                    <textarea
                      rows={2}
                      value={editCareerGuidance}
                      onChange={(e) => setEditCareerGuidance(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">3. Familia & Community Guidance Text</label>
                    <textarea
                      rows={2}
                      value={editFamiliaGuidance}
                      onChange={(e) => setEditFamiliaGuidance(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <span className="font-extrabold text-primary-700 text-xs uppercase block mb-2">
                  Expectations & Guidelines (Enter one per line)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">Mentor Expectations</label>
                    <textarea
                      rows={5}
                      value={editMentorGuidelinesText}
                      onChange={(e) => setEditMentorGuidelinesText(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">Mentee Expectations</label>
                    <textarea
                      rows={5}
                      value={editMenteeGuidelinesText}
                      onChange={(e) => setEditMenteeGuidelinesText(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <span className="font-extrabold text-primary-700 text-xs uppercase block mb-2">
                  Application Links & Lead Contact
                </span>
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">
                      Mentor Application URL (Optional Google Form or external link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://forms.google.com/... (leave blank to use built-in form)"
                      value={editMentorApplyLink}
                      onChange={(e) => setEditMentorApplyLink(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">
                      Mentee Application URL (Optional Google Form or external link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://forms.google.com/... (leave blank to use built-in form)"
                      value={editMenteeApplyLink}
                      onChange={(e) => setEditMenteeApplyLink(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">
                      Mentorship Lead Contact Email
                    </label>
                    <input
                      type="email"
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsContentEditorOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingContent}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSavingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSavingContent ? 'Saving to Database...' : 'Save All Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN MODAL: UPLOAD NEW PHOTO TO GALLERY (Firebase Storage + Firestore) */}
      {/* ========================================================================= */}
      {isUploadPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-gray-900">
                  Upload to MentorSHPE Gallery
                </h3>
              </div>
              <button
                onClick={() => setIsUploadPhotoModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadPhotoMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-200">
                {uploadPhotoMessage}
              </div>
            )}

            <form onSubmit={handleUploadPhotoSubmit} className="space-y-4 text-xs">
              {/* Image Picker */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">Select Photo File *</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-2xl p-4 text-center bg-gray-50 hover:bg-primary-50/20 transition-all"
                >
                  {uploadFilePreview ? (
                    <div className="space-y-2">
                      <img
                        src={uploadFilePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-xl border border-gray-200"
                      />
                      <span className="text-[11px] text-primary-700 font-bold block">
                        Click to change selected image ({uploadFile?.name})
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-4">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto" />
                      <span className="font-bold text-gray-800 block">Click to select photo</span>
                      <span className="text-[11px] text-gray-400 block">JPEG, PNG, or WEBP up to 10MB</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Photo Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fall 2026 Pairing Mixer"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Caption / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bobcats connecting at Ingram Hall for resume critiques."
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              {/* Progress Indicator */}
              {isUploadingPhoto && (
                <div className="space-y-1.5 py-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                      <span>Uploading to Firebase Storage...</span>
                    </span>
                    <span className="font-mono text-primary-600">{uploadPhotoProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadPhotoProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsUploadPhotoModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPhoto || !uploadFile}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{isUploadingPhoto ? `Uploading (${uploadPhotoProgress}%)...` : 'Upload Photo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN MODAL: EDIT / REPLACE PHOTO IN GALLERY */}
      {/* ========================================================================= */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-primary-600" />
                <h3 className="text-base font-extrabold text-gray-900">
                  Edit or Replace Photo
                </h3>
              </div>
              <button
                onClick={() => setEditingPhoto(null)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updatePhotoMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-200">
                {updatePhotoMessage}
              </div>
            )}

            <form onSubmit={handleUpdatePhotoSubmit} className="space-y-4 text-xs">
              {/* Current or Replaced Image Preview */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">Image Preview / Replace</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={replaceFileInputRef}
                  onChange={handleReplacePhotoFileChange}
                  className="hidden"
                />

                <div className="relative rounded-2xl overflow-hidden border border-gray-200 group">
                  <img
                    src={replacePhotoPreview || editingPhoto.imageUrl}
                    alt={editingPhoto.title}
                    className="w-full h-44 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => replaceFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-white font-bold text-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Click to Replace File</span>
                  </button>
                </div>
                {replacePhotoFile && (
                  <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                    New file staged: {replacePhotoFile.name} (will be uploaded to Firebase Storage)
                  </span>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editPhotoTitle}
                  onChange={(e) => setEditPhotoTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Caption</label>
                <textarea
                  rows={2}
                  value={editPhotoCaption}
                  onChange={(e) => setEditPhotoCaption(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              {/* Progress Indicator */}
              {isUpdatingPhoto && (
                <div className="space-y-1.5 py-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                      <span>Updating in Firebase Storage...</span>
                    </span>
                    <span className="font-mono text-primary-600">{uploadPhotoProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadPhotoProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPhoto}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isUpdatingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isUpdatingPhoto ? `Updating (${uploadPhotoProgress}%)...` : 'Save Photo Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHOTO LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {activeLightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setActiveLightboxPhoto(null)}
        >
          <div 
            className="max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={activeLightboxPhoto.imageUrl}
                alt={activeLightboxPhoto.title}
                className="max-h-[70vh] w-auto object-contain mx-auto"
              />
              <button
                onClick={() => setActiveLightboxPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-1">
              <h3 className="text-lg font-black text-gray-900">{activeLightboxPhoto.title}</h3>
              {activeLightboxPhoto.caption && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {activeLightboxPhoto.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MentorSHPE;
