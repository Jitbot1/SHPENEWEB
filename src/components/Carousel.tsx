import React, { useState, useEffect, useRef } from 'react';
// @ts-expect-error - Type declarations issue with @splidejs/react-splide
import { Splide, SplideSlide } from '@splidejs/react-splide';
// @ts-expect-error - no type declarations for css module
import '@splidejs/react-splide/css';
import { 
  PlusCircle, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Upload,
  ExternalLink,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { 
  subscribeSponsors, 
  saveSponsor, 
  deleteSponsor, 
  seedInitialSponsorsIfEmpty,
  compressImageFile,
  FirestoreSponsor 
} from '../services/sponsorsService';

export interface CarouselItem {
  id?: string;
  image?: string;
  title: string;
  subtitle: string;
  alt?: string;
  website: string;
}

interface CarouselProps {
  title?: string;
  description?: string;
}

const Carousel: React.FC<CarouselProps> = ({ 
  title = "Thank you to our sponsors!", 
  description = "We're grateful for the support of our partners who help us achieve our mission" 
}) => {
  const { user, isAdmin } = useAuth();
  const [sponsorsList, setSponsorsList] = useState<FirestoreSponsor[]>([]);
  const defaultImage = '/assets/icons/logo.svg';

  // Inline Admin Editor State (anchored right in the section like the slides!)
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingSponsor, setEditingSponsor] = useState<FirestoreSponsor | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSubtitle, setFormSubtitle] = useState<string>('');
  const [formWebsite, setFormWebsite] = useState<string>('');
  const [formImage, setFormImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // In-App Deletion Confirmation State (Bypasses iframe window.confirm blocking)
  const [sponsorToDelete, setSponsorToDelete] = useState<FirestoreSponsor | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeSponsors((list) => {
      setSponsorsList(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isAdmin && user?.email) {
      seedInitialSponsorsIfEmpty(user.email);
    }
  }, [isAdmin, user]);

  const handleOpenAdd = () => {
    setEditingSponsor(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormWebsite('https://');
    setFormImage('/assets/icons/logo.svg');
    setFormError(null);
    setFormSuccess(null);
    setIsEditorOpen(true);
    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleOpenEdit = (sponsor: FirestoreSponsor) => {
    setEditingSponsor(sponsor);
    setFormTitle(sponsor.title);
    setFormSubtitle(sponsor.subtitle || '');
    setFormWebsite(sponsor.website);
    setFormImage(sponsor.image || '/assets/icons/logo.svg');
    setFormError(null);
    setFormSuccess(null);
    setIsEditorOpen(true);
    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleRequestDelete = (sponsor: FirestoreSponsor) => {
    setSponsorToDelete(sponsor);
  };

  const handleConfirmDelete = async () => {
    if (!sponsorToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSponsor(sponsorToDelete.id);
      // Optimistically update list
      setSponsorsList((prev) => prev.filter((s) => s.id !== sponsorToDelete.id));
      if (editingSponsor?.id === sponsorToDelete.id) {
        setIsEditorOpen(false);
        setEditingSponsor(null);
      }
      setSponsorToDelete(null);
    } catch (err) {
      console.error('Failed to delete sponsor:', err);
      alert('Failed to delete sponsor. Please check your permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 600, 0.85);
      setFormImage(compressedDataUrl);
    } catch (err) {
      console.error('Failed to process sponsor logo:', err);
      setFormError('Failed to process image file. Please try another image.');
    }
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Sponsor company name is required.');
      return;
    }
    if (!formWebsite.trim()) {
      setFormError('Website URL is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveSponsor(
        {
          id: editingSponsor?.id,
          title: formTitle.trim(),
          subtitle: formSubtitle.trim(),
          website: formWebsite.trim(),
          image: formImage.trim() || '/assets/icons/logo.svg',
          alt: `${formTitle.trim()} logo`,
          order: editingSponsor?.order ?? sponsorsList.length,
        },
        user?.email || 'shpetxst@gmail.com'
      );

      setFormSuccess('Sponsor saved successfully!');
      setTimeout(() => {
        setIsEditorOpen(false);
        setEditingSponsor(null);
        setFormSuccess(null);
      }, 1000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save sponsor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="sponsors" className="pt-24 pb-20 md:pt-28 md:pb-24 bg-gray-50 overflow-x-hidden border-t border-gray-100 relative">
      <div className="container mx-auto px-4">
        
        {/* Section Header */}
        <div className="text-center mb-8 relative">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              {description}
            </p>
          )}

          {/* ADMIN CONTROL BAR (Directly inside the section, no scrolling needed!) */}
          {isAdmin && (
            <div className="mt-5 inline-flex items-center space-x-2.5 p-1.5 bg-white rounded-2xl shadow-md border border-gray-200">
              <span className="px-3 py-1 bg-primary-100 text-primary-900 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Admin Sponsor Controls</span>
              </span>

              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Sponsor</span>
              </button>

              <button
                onClick={() => setIsEditorOpen(!isEditorOpen)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditorOpen ? 'Hide Editor' : 'Manage / Edit Sponsors'}</span>
              </button>
            </div>
          )}
        </div>

        {/* INLINE ADMIN SPONSOR EDITOR DRAWER (Positions right within the section) */}
        {isAdmin && isEditorOpen && (
          <div 
            ref={editorRef}
            className="max-w-4xl mx-auto mb-10 bg-white rounded-3xl shadow-xl border-2 border-primary-500 p-6 md:p-8 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 text-primary-900 font-extrabold text-base">
                <Building2 className="w-5 h-5 text-primary-600" />
                <span>{editingSponsor ? `Edit Sponsor: ${editingSponsor.title}` : 'Add New Corporate Sponsor'}</span>
              </div>
              <button 
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingSponsor(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSponsor} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 flex items-center space-x-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Company / Sponsor Name *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Dell Technologies"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Subtitle / Sponsorship Note</label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Supporting SHPE since 2022 or Premier Sponsor"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Website URL *</label>
                <input
                  type="url"
                  required
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://www.dell.com/"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Sponsor Logo / Image *</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
                  <div className="w-24 h-16 bg-gray-100 rounded-xl border border-gray-200 p-2 flex items-center justify-center">
                    <img
                      src={formImage || defaultImage}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-800 text-xs font-bold rounded-xl cursor-pointer border border-primary-200 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Upload New Logo from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <p className="text-[11px] text-gray-400">PNG, SVG, or JPG with transparent background recommended</p>
                  </div>
                </div>

                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="Or enter image URL path (/assets/images/...)"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                {editingSponsor && (
                  <button
                    type="button"
                    onClick={() => handleRequestDelete(editingSponsor)}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete This Sponsor</span>
                  </button>
                )}
                
                <div className="flex items-center space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditorOpen(false);
                      setEditingSponsor(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-xs font-extrabold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition-all"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Sponsor'}
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Sponsors Quick-Management List */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3">
                Current Active Sponsors ({sponsorsList.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sponsorsList.map((sp) => (
                  <div key={sp.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img src={sp.image || defaultImage} alt="" className="w-10 h-7 object-contain bg-white rounded p-0.5 border" />
                      <div className="truncate">
                        <div className="font-bold text-xs text-gray-900 truncate">{sp.title}</div>
                        <div className="text-[10px] text-gray-500 truncate">{sp.subtitle || 'Sponsor'}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleOpenEdit(sp)}
                        className="p-1.5 text-primary-700 hover:bg-primary-100 rounded-lg"
                        title="Edit Sponsor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRequestDelete(sp)}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"
                        title="Delete Sponsor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SPONSORS CAROUSEL DISPLAY */}
        {sponsorsList.length > 0 ? (
          <Splide
            options={{
              type: sponsorsList.length > 2 ? 'loop' : 'slide',
              perPage: 3,
              focus: 'center',
              gap: '2rem',
              padding: '1.5rem',
              breakpoints: {
                1024: {
                  perPage: 2,
                  gap: '1.5rem',
                  padding: '1rem',
                },
                640: {
                  perPage: 1,
                  gap: '1rem',
                  padding: '1rem',
                },
              },
              autoplay: true,
              interval: 3500,
              pauseOnHover: true,
              pauseOnFocus: true,
            }}
            aria-label="Sponsors Carousel"
          >
            {sponsorsList.map((item, index) => (
              <SplideSlide key={item.id || index} className="overflow-visible py-4">
                <div className="relative group h-full">
                  {/* Direct Edit / Delete buttons on the card */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 z-30 flex space-x-1.5 opacity-90 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="p-1.5 bg-white text-primary-700 hover:bg-primary-50 rounded-lg shadow-md border border-gray-200 transition-colors"
                        title="Edit Sponsor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRequestDelete(item);
                        }}
                        className="p-1.5 bg-white text-red-600 hover:bg-red-50 rounded-lg shadow-md border border-gray-200 transition-colors"
                        title="Remove Sponsor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <a
                    href={item.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${item.title} website`}
                    title={`Visit ${item.title}`}
                    className="block h-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-2xl"
                  >
                    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 h-full flex flex-col border border-gray-100">
                      <div className="aspect-[16/9] w-full overflow-hidden bg-gray-50 flex items-center justify-center p-6 border-b border-gray-50">
                        <img
                          src={item.image || defaultImage}
                          alt={item.alt || item.title}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = defaultImage;
                          }}
                        />
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-center text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {item.title}
                        </h3>
                        {item.subtitle && (
                          <p className="text-xs font-medium text-gray-500">
                            {item.subtitle}
                          </p>
                        )}
                        <span className="inline-flex items-center justify-center space-x-1 text-[11px] font-semibold text-primary-600 mt-3 group-hover:underline">
                          <span>Visit Website</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
              </SplideSlide>
            ))}
          </Splide>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 p-8">
            <p className="text-gray-500 text-sm">No sponsors currently listed.</p>
          </div>
        )}
      </div>

      {/* IN-APP CONFIRMATION MODAL FOR SPONSOR DELETION (Bypasses window.confirm iframe block!) */}
      {sponsorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">
                Confirm Sponsor Removal
              </h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete sponsor <strong>"{sponsorToDelete.title}"</strong>? This will remove their logo and link from the database and the public-facing carousel immediately.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSponsorToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Sponsor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Carousel;
