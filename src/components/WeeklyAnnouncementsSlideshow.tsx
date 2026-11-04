import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Trash2, 
  Plus, 
  Clock, 
  Sparkles, 
  Maximize2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { 
  WeeklyAnnouncement, 
  subscribeWeeklyAnnouncements, 
  saveWeeklyAnnouncement, 
  deleteWeeklyAnnouncement,
  uploadAnnouncementImage,
  DEFAULT_WEEKLY_ANNOUNCEMENTS 
} from '../services/announcementsService';

const AUTOPLAY_INTERVAL_SEC = 30;

export const WeeklyAnnouncementsSlideshow: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [announcements, setAnnouncements] = useState<WeeklyAnnouncement[]>(DEFAULT_WEEKLY_ANNOUNCEMENTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(AUTOPLAY_INTERVAL_SEC);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Admin Modal: 'upload' or 'manage'
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminModalTab, setAdminModalTab] = useState<'upload' | 'manage'>('upload');

  // New announcement form fields
  const [newTitle, setNewTitle] = useState('');
  const [newWeekLabel, setNewWeekLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inline delete confirm IDs (no window.confirm in iframes!)
  const [quickDeleteConfirm, setQuickDeleteConfirm] = useState(false);
  const [modalDeleteConfirmId, setModalDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Firestore collection
  useEffect(() => {
    const unsub = subscribeWeeklyAnnouncements((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setAnnouncements(data);
      }
    });
    return () => unsub();
  }, []);

  const totalSlides = announcements.length;
  const currentSlide = totalSlides > 0 ? announcements[currentIndex % totalSlides] : null;

  // Manual next/prev
  const goToNextSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setSecondsLeft(AUTOPLAY_INTERVAL_SEC);
    setQuickDeleteConfirm(false);
  }, [totalSlides]);

  const goToPrevSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setSecondsLeft(AUTOPLAY_INTERVAL_SEC);
    setQuickDeleteConfirm(false);
  }, [totalSlides]);

  const handleSelectSlide = (index: number) => {
    setCurrentIndex(index);
    setSecondsLeft(AUTOPLAY_INTERVAL_SEC);
    setQuickDeleteConfirm(false);
  };

  // 30-Second Autoplay Loop
  useEffect(() => {
    if (!isPlaying || totalSlides <= 1 || isLightboxOpen || isAdminModalOpen) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          goToNextSlide();
          return AUTOPLAY_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, totalSlides, isLightboxOpen, isAdminModalOpen, goToNextSlide]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setFeedback(null);
    } catch (err) {
      console.error('File select error:', err);
      setFeedback({ type: 'error', text: 'Could not preview image. Please choose another file.' });
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !previewUrl) {
      setFeedback({ type: 'error', text: 'Please select an image file to upload.' });
      return;
    }
    if (!newTitle.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a title for this announcement.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setFeedback(null);

    try {
      let finalImageUrl = previewUrl;
      if (selectedFile) {
        finalImageUrl = await uploadAnnouncementImage(
          selectedFile, 
          'weekly_slide',
          (pct) => setUploadProgress(pct)
        );
      }

      const newId = await saveWeeklyAnnouncement(
        {
          title: newTitle.trim(),
          weekLabel: newWeekLabel.trim() || `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          description: newDescription.trim(),
          imageUrl: finalImageUrl,
          active: true,
          order: announcements.length,
        },
        user?.email || 'shpetxst@gmail.com'
      );

      // Optimistically update local announcements array so admin sees it instantly
      if (newId) {
        const addedSlide: WeeklyAnnouncement = {
          id: newId,
          title: newTitle.trim(),
          weekLabel: newWeekLabel.trim() || `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          description: newDescription.trim(),
          imageUrl: finalImageUrl,
          active: true,
          order: announcements.length,
        };
        setAnnouncements((prev) => [addedSlide, ...prev.filter((a) => a.id !== newId)]);
      }

      setFeedback({ type: 'success', text: 'Weekly announcement uploaded to Firebase Storage and added to the slideshow!' });
      setTimeout(() => {
        setIsAdminModalOpen(false);
        setFeedback(null);
        setUploadProgress(0);
        setNewTitle('');
        setNewWeekLabel('');
        setNewDescription('');
        setSelectedFile(null);
        setPreviewUrl('');
      }, 1400);
    } catch (err) {
      console.error('Save announcement error:', err);
      setFeedback({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to upload announcement. Please check permissions.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Immediate Delete Slide from Current Display
  const handleDeleteCurrentSlide = async () => {
    if (!currentSlide || !isAdmin) return;

    if (!quickDeleteConfirm) {
      setQuickDeleteConfirm(true);
      setTimeout(() => setQuickDeleteConfirm(false), 4000);
      return;
    }

    try {
      await deleteWeeklyAnnouncement(currentSlide.id, currentSlide.imageUrl);
      // Immediately remove from state
      setAnnouncements((prev) => prev.filter((a) => a.id !== currentSlide.id));
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      setSecondsLeft(AUTOPLAY_INTERVAL_SEC);
      setQuickDeleteConfirm(false);
    } catch (err) {
      console.error('Delete slide error:', err);
    }
  };

  // Immediate Delete Slide from Management Modal Table
  const handleDeleteSlideFromModal = async (slide: WeeklyAnnouncement) => {
    try {
      await deleteWeeklyAnnouncement(slide.id, slide.imageUrl);
      setAnnouncements((prev) => prev.filter((a) => a.id !== slide.id));
      setModalDeleteConfirmId(null);
      if (currentIndex >= announcements.length - 1) {
        setCurrentIndex(Math.max(0, announcements.length - 2));
      }
      setFeedback({ type: 'success', text: `Slide "${slide.title}" deleted from Storage & Firestore.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Delete slide error:', err);
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete slide.' });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNextSlide();
      if (e.key === 'ArrowLeft') goToPrevSlide();
      if (e.key === 'Escape' && isLightboxOpen) setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSlide, goToPrevSlide, isLightboxOpen]);

  // Compute percentage of 30-sec countdown elapsed
  const progressPercent = ((AUTOPLAY_INTERVAL_SEC - secondsLeft) / AUTOPLAY_INTERVAL_SEC) * 100;

  return (
    <section id="Announcements" className="py-16 bg-white border-b-2 border-gray-200 relative">
      <div className="container mx-auto px-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-black bg-[#501214] text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Chapter Updates</span>
              </span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs font-mono font-bold text-[#1A1A1A] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#501214]" />
                <span>Weekly Highlights</span>
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1A1A] tracking-tight">
              Announcements & Weekly Gallery
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 max-w-xl leading-relaxed">
              Stay up-to-date with general body meetings, upcoming workshops, sports tournaments, and chapter deadlines.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-black transition-colors"
              title={isPlaying ? 'Pause 30-second autoplay' : 'Resume 30-second autoplay'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pause (30s)</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Autoplay</span>
                </>
              )}
            </button>

            {/* Lightbox / Zoom Button */}
            <button
              onClick={() => setIsLightboxOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 text-xs font-bold rounded-xl transition-colors"
              title="View full-size flyer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#501214]" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>

            {/* Admin Upload & Manage Button */}
            {isAdmin && (
              <button
                onClick={() => {
                  setAdminModalTab('upload');
                  setIsAdminModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-black shadow-md transition-all"
                title="Upload or manage weekly announcements"
              >
                <Plus className="w-4 h-4" />
                <span>Upload & Manage Slides ({announcements.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* NATIVE IMAGE SLIDESHOW DISPLAY */}
        <div className="relative bg-black rounded-3xl shadow-2xl overflow-hidden border-2 border-[#1A1A1A] group">
          
          {/* Top Info Overlay Bar */}
          <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4 sm:p-6 flex items-center justify-between text-white pointer-events-none">
            <div className="flex items-center space-x-2 pointer-events-auto">
              <span className="px-3 py-1 bg-[#501214] text-white text-[11px] sm:text-xs font-black uppercase rounded-lg shadow-sm border border-white/20">
                {currentSlide?.weekLabel || 'Weekly Announcement'}
              </span>
              <span className="text-[11px] font-mono font-bold text-white bg-black/60 px-2.5 py-0.5 rounded-md border border-white/20">
                Slide {currentIndex + 1} of {totalSlides}
              </span>
            </div>

            {/* Admin Quick Delete Action (No window.confirm!) */}
            {isAdmin && currentSlide && (
              <div className="pointer-events-auto flex items-center space-x-2">
                {quickDeleteConfirm ? (
                  <div className="flex items-center space-x-1.5 animate-scale-up">
                    <button
                      type="button"
                      onClick={handleDeleteCurrentSlide}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-lg shadow-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete?</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeleteConfirm(false)}
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentSlide}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg transition-colors shadow-sm"
                    title="Delete this slide from the weekly gallery"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Slide</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main Slide Image Display */}
          <div 
            className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[600px] min-h-[320px] flex items-center justify-center bg-black overflow-hidden cursor-pointer"
            onClick={() => setIsLightboxOpen(true)}
          >
            {currentSlide ? (
              <img
                key={currentSlide.id}
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                className="w-full h-full object-contain md:object-cover transition-opacity duration-700 animate-fade-in"
                loading="lazy"
              />
            ) : (
              <div className="text-gray-400 text-center p-8">
                No announcement images uploaded yet.
              </div>
            )}

            {/* Gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Bottom Caption & 30-Second Autoplay Progress Bar */}
          <div className="absolute bottom-0 inset-x-0 z-20">
            {/* Progress Bar (Runs over 30 seconds) */}
            <div className="w-full h-2 bg-white/20">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-[#8b2529] to-[#501214] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="p-4 sm:p-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto bg-black/60 backdrop-blur-xs">
              <div className="space-y-1 max-w-2xl">
                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {currentSlide?.title}
                </h3>
                {currentSlide?.description && (
                  <p className="text-xs sm:text-sm text-gray-100 line-clamp-2 drop-shadow-xs font-medium">
                    {currentSlide.description}
                  </p>
                )}
              </div>

              {/* Autoplay status badge & manual switchers */}
              <div className="flex items-center space-x-3 self-end md:self-auto">
                <span className="text-[11px] font-mono text-amber-300 font-extrabold bg-black/80 px-3 py-1 rounded-full border border-white/20 shadow-xs">
                  {isPlaying ? `Next in ${secondsLeft}s` : 'Paused'}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPrevSlide}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all active:scale-95"
                    title="Previous announcement (Left Arrow)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextSlide}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all active:scale-95"
                    title="Next announcement (Right Arrow)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Left / Right Chevron Overlays */}
          <button
            onClick={goToPrevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:block shadow-lg border border-white/20"
            title="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:block shadow-lg border border-white/20"
            title="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Slide Indicator Bar */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-5">
            {announcements.map((ann, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={ann.id}
                  onClick={() => handleSelectSlide(idx)}
                  className={`h-3 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'w-10 bg-[#501214] shadow-sm'
                      : 'w-3 bg-gray-300 hover:bg-gray-400'
                  }`}
                  title={`Go to slide ${idx + 1}: ${ann.title}`}
                />
              );
            })}
          </div>
        )}

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {isLightboxOpen && currentSlide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            title="Close Fullscreen (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div 
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-4 text-center text-white space-y-1">
              <span className="text-xs uppercase font-black text-amber-400 bg-black/60 px-3 py-1 rounded-md">
                {currentSlide.weekLabel}
              </span>
              <h3 className="text-xl font-black mt-2">{currentSlide.title}</h3>
              {currentSlide.description && (
                <p className="text-xs text-gray-300 max-w-xl mx-auto">{currentSlide.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN UPLOAD & MANAGE MODAL */}
      {isAdmin && isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border-2 border-gray-300 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200">
              <div className="flex items-center space-x-2 text-[#501214] font-black text-base">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Weekly Announcements Slideshow Manager</span>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1.5 text-gray-500 hover:text-[#1A1A1A] font-black text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs: Upload vs Manage */}
            <div className="flex items-center space-x-2 border-b-2 border-gray-200 pb-2">
              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('upload');
                  setFeedback(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                  adminModalTab === 'upload'
                    ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-sm'
                    : 'bg-white text-[#1A1A1A] border-2 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Upload New Slide Flyer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('manage');
                  setFeedback(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                  adminModalTab === 'manage'
                    ? 'bg-[#501214] text-white border-2 border-[#501214] shadow-sm'
                    : 'bg-white text-[#1A1A1A] border-2 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Manage Existing Slides ({announcements.length})</span>
              </button>
            </div>

            {feedback && (
              <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs ${
                feedback.type === 'success' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-red-700 text-white'
              }`}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* TAB 1: UPLOAD NEW SLIDE */}
            {adminModalTab === 'upload' && (
              <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs">
                {/* File Dropzone */}
                <div>
                  <label className="block font-black text-[#1A1A1A] mb-1">
                    Announcement Graphic / Flyer File *
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-[#501214] rounded-2xl p-4 text-center cursor-pointer bg-gray-50 transition-all"
                  >
                    {previewUrl ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden max-h-48 mx-auto bg-black">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <Upload className="w-8 h-8 text-[#501214] mx-auto" />
                        <p className="font-black text-[#1A1A1A]">Click to browse flyer image from device</p>
                        <p className="text-[11px] text-gray-500">PNG, JPG, WebP (stores securely in Firebase Storage)</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
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
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214] font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-black text-[#1A1A1A] mb-1">Week Label / Badge</label>
                    <input
                      type="text"
                      placeholder="e.g. Week of Oct 21 - Oct 27"
                      value={newWeekLabel}
                      onChange={(e) => setNewWeekLabel(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214]"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-[#1A1A1A] mb-1">Slide Duration</label>
                    <input
                      type="text"
                      disabled
                      value="30 seconds (Auto-loop)"
                      className="w-full p-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-black text-[#1A1A1A] mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Meeting in session at Ingram Hall 4101. Free food provided!"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#501214]"
                  />
                </div>

                {/* Progress Indicator */}
                {isUploading && (
                  <div className="space-y-1.5 py-1">
                    <div className="flex justify-between text-xs font-black text-[#1A1A1A]">
                      <span className="flex items-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#501214]" />
                        <span>Uploading flyer to Firebase Storage...</span>
                      </span>
                      <span className="font-mono text-[#501214]">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
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
                    onClick={() => setIsAdminModalOpen(false)}
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
            )}

            {/* TAB 2: MANAGE ALL SLIDES WITH DIRECT DELETE BUTTON */}
            {adminModalTab === 'manage' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-700">
                  Click the red Delete button on any slide to remove it from the slideshow. The deletion takes effect immediately in Firestore and removes the underlying flyer from Firebase Storage.
                </p>

                <div className="divide-y-2 divide-gray-200 border-2 border-gray-200 rounded-2xl overflow-hidden bg-white">
                  {announcements.map((slide, idx) => (
                    <div 
                      key={slide.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-20 h-14 bg-black rounded-xl overflow-hidden shrink-0 border border-gray-200">
                          <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#501214] text-white rounded">
                              {slide.weekLabel}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">Slide #{idx + 1}</span>
                          </div>
                          <h4 className="text-xs font-black text-[#1A1A1A] line-clamp-1">{slide.title}</h4>
                          {slide.description && (
                            <p className="text-[11px] text-gray-600 line-clamp-1">{slide.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        {modalDeleteConfirmId === slide.id ? (
                          <div className="flex items-center space-x-1.5 animate-scale-up">
                            <button
                              type="button"
                              onClick={() => handleDeleteSlideFromModal(slide)}
                              className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-lg shadow-sm"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalDeleteConfirmId(null)}
                              className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-[#1A1A1A] text-xs font-bold rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setModalDeleteConfirmId(slide.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black flex items-center space-x-1 shadow-xs transition-colors"
                            title="Delete this announcement slide"
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

          </div>
        </div>
      )}

    </section>
  );
};

export default WeeklyAnnouncementsSlideshow;
