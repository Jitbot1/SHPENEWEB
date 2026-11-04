import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  Upload, 
  Trash2, 
  Shield, 
  Image as ImageIcon, 
  X, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { 
  Slideshow, 
  SlideshowPhoto, 
  subscribeSlideshows, 
  subscribeSlideshowPhotos, 
  createSlideshow, 
  deleteSlideshow, 
  uploadPhotoToSlideshow, 
  deletePhoto, 
  compressImageFile 
} from '../services/slideshowService';

export const OfficerSlideshowSection: React.FC = () => {
  const { user, isOfficer } = useAuth();
  
  const [slideshows, setSlideshows] = useState<Slideshow[]>([]);
  const [activeSlideshowId, setActiveSlideshowId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState<number>(0);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Create slideshow form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCommittee, setNewCommittee] = useState('Events');
  const [designatedEmail, setDesignatedEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Upload photo form state
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Subscribe to all slideshows
  useEffect(() => {
    const unsub = subscribeSlideshows((list) => {
      setSlideshows(list);
      if (list.length > 0 && !activeSlideshowId) {
        setActiveSlideshowId(list[0].id);
      }
    });
    return () => unsub();
  }, [activeSlideshowId]);

  // Subscribe to photos of active slideshow
  useEffect(() => {
    if (!activeSlideshowId) {
      setPhotos([]);
      return;
    }
    const unsub = subscribeSlideshowPhotos(activeSlideshowId, (photoList) => {
      setPhotos(photoList);
      setCurrentPhotoIdx(0);
    });
    return () => unsub();
  }, [activeSlideshowId]);

  const activeSlideshow = useMemo(() => {
    return slideshows.find((s) => s.id === activeSlideshowId) || slideshows[0] || null;
  }, [slideshows, activeSlideshowId]);

  // Determine if active user is authorized to upload to the currently selected slideshow
  const canUploadToActiveSlideshow = useMemo(() => {
    if (!user || !activeSlideshow) return false;
    if (isOfficer) return true;
    if (user.uid === activeSlideshow.createdById) return true;
    if (user.email && user.email.toLowerCase() === activeSlideshow.designatedUploaderEmail.toLowerCase()) {
      return true;
    }
    return false;
  }, [user, isOfficer, activeSlideshow]);

  // Autoplay slideshow every 6 seconds if photos exist
  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhotoIdx((prev) => (prev + 1) % photos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [photos.length]);

  const handleNextPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIdx((prev) => (prev + 1) % photos.length);
    }
  };

  const handlePrevPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  const handleCreateSlideshow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOfficer) return;
    if (!newTitle.trim()) {
      setCreateError('Please provide a title for the slideshow.');
      return;
    }
    if (!designatedEmail.trim()) {
      setCreateError('Please provide a designated user account email.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const createdId = await createSlideshow({
        title: newTitle,
        description: newDescription,
        committee: newCommittee,
        createdById: user.uid,
        createdByEmail: user.email || '',
        designatedUploaderEmail: designatedEmail,
      });

      if (createdId) {
        setActiveSlideshowId(createdId);
      }

      setNewTitle('');
      setNewDescription('');
      setDesignatedEmail('');
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create slideshow.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressImageFile(file, 1200, 0.85);
        setPreviewDataUrl(compressed);
      } catch (err) {
        console.error('Failed to preview image:', err);
      }
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeSlideshow || !canUploadToActiveSlideshow) {
      setUploadError('You are not authorized to upload to this slideshow.');
      return;
    }

    if (!previewDataUrl) {
      setUploadError('Please choose an image file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await uploadPhotoToSlideshow({
        slideshowId: activeSlideshow.id,
        imageUrl: previewDataUrl,
        caption: photoCaption,
        uploadedById: user.uid,
        uploadedByEmail: user.email || '',
      });

      setUploadSuccess('Event photo successfully uploaded to slideshow!');
      setPreviewDataUrl('');
      setPhotoCaption('');
      setTimeout(() => {
        setUploadSuccess(null);
        setIsUploadModalOpen(false);
      }, 1500);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!activeSlideshow) return;
    if (!window.confirm('Are you sure you want to remove this photo?')) return;
    try {
      await deletePhoto(activeSlideshow.id, photoId);
    } catch (err) {
      console.error('Delete photo failed:', err);
    }
  };

  const handleDeleteSlideshow = async (slideshowId: string) => {
    if (!isOfficer) return;
    if (!window.confirm('Delete this entire slideshow and all its photos?')) return;
    try {
      await deleteSlideshow(slideshowId);
      if (activeSlideshowId === slideshowId) {
        const remaining = slideshows.filter((s) => s.id !== slideshowId);
        setActiveSlideshowId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Delete slideshow failed:', err);
    }
  };

  const currentPhoto = photos[currentPhotoIdx] || null;

  return (
    <section className="py-16 bg-white border-b border-gray-100">
      <div className="container mx-auto px-4">
        {/* Section Header - Only 'Events' and nothing else */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Events
            </h2>
          </div>

          {/* Action Bar */}
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            {/* Create Slideshow Button (Officers Only) */}
            {isOfficer && (
              <button
                onClick={() => {
                  setDesignatedEmail(user?.email || '');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all hover:shadow"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Slideshow</span>
              </button>
            )}

            {/* Upload Photo Button (Designated Account or Officer) */}
            {activeSlideshow && canUploadToActiveSlideshow && (
              <button
                onClick={() => {
                  setUploadError(null);
                  setUploadSuccess(null);
                  setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all hover:shadow"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photos</span>
              </button>
            )}
          </div>
        </div>

        {/* Slideshow Selector Tabs */}
        {slideshows.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
            {slideshows.map((s) => {
              const isActive = s.id === activeSlideshow?.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSlideshowId(s.id)}
                  className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Active Slideshow Viewer */}
        {activeSlideshow ? (
          <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden text-white border border-gray-800">
            {/* Optional Clean Bar for Multiple Slideshows / Officer Delete */}
            {(slideshows.length > 1 || isOfficer) && (
              <div className="bg-gray-900/90 px-6 py-3 flex justify-between items-center border-b border-gray-800 text-xs">
                <span className="font-bold text-sm text-gray-200">{activeSlideshow.title}</span>
                {isOfficer && (
                  <button
                    onClick={() => handleDeleteSlideshow(activeSlideshow.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-gray-800"
                    title="Delete Slideshow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Main Stage / Image Frame */}
            <div className="relative aspect-video md:aspect-[21/9] max-h-[580px] w-full bg-black flex items-center justify-center overflow-hidden group">
              {currentPhoto ? (
                <>
                  <img
                    src={currentPhoto.imageUrl}
                    alt={currentPhoto.caption || activeSlideshow.title}
                    className="w-full h-full object-contain transition-transform duration-700"
                  />

                  {/* Caption & Metadata Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                    <div className="max-w-2xl">
                      {currentPhoto.caption && (
                        <p className="text-white text-base md:text-lg font-medium drop-shadow-md">
                          {currentPhoto.caption}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      <span className="text-xs font-mono bg-black/60 px-3 py-1 rounded-full text-gray-300 border border-white/10">
                        {currentPhotoIdx + 1} / {photos.length}
                      </span>

                      {(isOfficer || (user && user.uid === currentPhoto.uploadedById)) && (
                        <button
                          onClick={() => handleDeletePhoto(currentPhoto.id)}
                          className="bg-black/60 hover:bg-red-600 text-gray-300 hover:text-white p-2 rounded-full transition-colors border border-white/10"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Navigation Arrows */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevPhoto}
                        aria-label="Previous photo"
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={handleNextPhoto}
                        aria-label="Next photo"
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                /* Empty state for slideshow */
                <div className="text-center p-8 space-y-4 max-w-md">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl mx-auto flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-200">No Photos Yet</h4>
                  </div>
                  {canUploadToActiveSlideshow && (
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload First Photo</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {photos.length > 1 && (
              <div className="p-4 bg-gray-950 flex space-x-3 overflow-x-auto border-t border-gray-800">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentPhotoIdx(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-all border-2 ${
                      idx === currentPhotoIdx ? 'border-primary-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-gray-500 text-sm">No active slideshows found.</p>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Slideshow (Officer Only) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary-600 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <h3 className="font-bold text-lg">Create Homepage Slideshow</h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlideshow} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Slideshow Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lonestar Athletics Championship 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Committee
                </label>
                <select
                  value={newCommittee}
                  onChange={(e) => setNewCommittee(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="Athletics">Athletics</option>
                  <option value="Events">Events</option>
                  <option value="Fundraising">Fundraising</option>
                  <option value="Media">Media</option>
                  <option value="SHPEtinas">SHPEtinas</option>
                  <option value="Technology">Technology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Designated Uploader Account Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. member@txstate.edu or officer@gmail.com"
                  value={designatedEmail}
                  onChange={(e) => setDesignatedEmail(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Photos can only be uploaded from this designated Google user account (plus officers).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description / Event Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of the event or highlights"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm transition-all"
                >
                  {isCreating ? 'Creating...' : 'Create Slideshow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Upload Photo to Slideshow (Designated Account Only) */}
      {isUploadModalOpen && activeSlideshow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <h3 className="font-bold text-lg">Upload Event Photo</h3>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadPhoto} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                Uploading to: <strong>{activeSlideshow.title}</strong>
                <br />
                Signed in as: <strong>{user?.email}</strong>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Choose Photo File (JPEG, PNG, WebP)
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Preview */}
              {previewDataUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-300 bg-black flex items-center justify-center">
                  <img src={previewDataUrl} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Photo Caption
                </label>
                <input
                  type="text"
                  placeholder="e.g. Members networking at the Boeing dinner table"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !previewDataUrl}
                  className={`px-5 py-2 text-sm rounded-xl font-bold text-white shadow-sm transition-all ${
                    isUploading || !previewDataUrl
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Publish Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
