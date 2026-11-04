import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit3, 
  ExternalLink, 
  Check, 
  X, 
  AlertCircle,
  Presentation,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { 
  subscribeEventsGoogleSlideUrl, 
  updateEventsGoogleSlideUrl,
  formatGoogleSlidesEmbedUrl 
} from '../services/slidesSettingsService';

export const EventsGoogleSlidesSection: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [slideEmbedUrl, setSlideEmbedUrl] = useState<string>('');
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editPanelRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time Google Slides setting from Firestore
  useEffect(() => {
    const unsub = subscribeEventsGoogleSlideUrl((url) => {
      setSlideEmbedUrl(url);
    });
    return () => unsub();
  }, []);

  const handleToggleEdit = () => {
    if (!isEditOpen) {
      setInputUrl(slideEmbedUrl);
      setSaveError(null);
      setSaveSuccess(null);
      setIsEditOpen(true);
      setTimeout(() => {
        editPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } else {
      setIsEditOpen(false);
    }
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      setSaveError('Please enter a Google Slides URL.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const formatted = await updateEventsGoogleSlideUrl(
        inputUrl,
        user?.email || 'shpetxst@gmail.com'
      );
      if (formatted) {
        setSlideEmbedUrl(formatted);
      }
      setSaveSuccess('Google Slides presentation updated successfully!');
      setTimeout(() => {
        setSaveSuccess(null);
        setIsEditOpen(false);
      }, 1200);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update Google Slides link.');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute external link to open presentation in new tab
  const presentationExternalUrl = slideEmbedUrl
    ? slideEmbedUrl.replace('/embed', '/pub').split('?')[0]
    : '';

  return (
    <section id="Announcements" className="py-16 bg-white border-b border-gray-100 relative">
      <div className="container mx-auto px-4">
        {/* Section Header - Strictly 'Events' only */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Announcements
            </h2>
          </div>

          {/* Action Controls */}
          <div className="flex items-center space-x-3">
            {presentationExternalUrl && (
              <a
                href={presentationExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
                title="Open in Google Slides"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Slides</span>
              </a>
            )}

            {/* Admin Direct Edit Trigger */}
            {isAdmin && (
              <button
                onClick={handleToggleEdit}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isEditOpen 
                    ? 'bg-gray-800 text-white hover:bg-gray-700' 
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditOpen ? 'Close Editor' : (slideEmbedUrl ? 'Edit Google Slide Link' : 'Set Google Slide Link')}</span>
              </button>
            )}
          </div>
        </div>

        {/* INLINE ADMIN EDIT PANEL: Positioned directly above the slide */}
        {isAdmin && isEditOpen && (
          <div 
            ref={editPanelRef}
            className="mb-6 bg-gradient-to-br from-primary-50 via-white to-gray-50 border-2 border-primary-500 rounded-2xl shadow-xl p-5 md:p-6 animate-fade-in"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2 text-primary-800 font-bold text-sm">
                <Presentation className="w-4 h-4 text-primary-600" />
                <span>Edit Events Presentation Embed</span>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUrl} className="space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200 flex items-center space-x-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Google Slides Link or Embed URL *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="https://docs.google.com/presentation/d/.../edit or /pub"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full text-sm pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Paste any Google Slides link (Share link, Edit link, or File &gt; Share &gt; Publish to the web URL).
                </p>
              </div>

              {inputUrl.trim() && (
                <div className="p-3 bg-white rounded-xl border border-gray-200 text-[11px] text-gray-600 break-all font-mono">
                  <span className="font-bold text-primary-700 font-sans">Embedded Target URL:</span>
                  <br />
                  {formatGoogleSlidesEmbedUrl(inputUrl)}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Presentation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Google Slide Presentation Frame */}
        {slideEmbedUrl ? (
          <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-800 relative">
            {/* Direct Admin Control Bar attached to slide */}
            {isAdmin && (
              <div className="bg-primary-950 text-white px-4 py-2.5 flex items-center justify-between border-b border-primary-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-gray-200">
                    Google Slide Presentation Control
                  </span>
                </div>
                <button
                  onClick={handleToggleEdit}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditOpen ? 'Close Editor' : 'Edit Slide Presentation'}</span>
                </button>
              </div>
            )}

            <div className="relative aspect-video w-full max-h-[640px] bg-black">
              <iframe
                src={slideEmbedUrl}
                title="Announcements Google Slides Presentation"
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          /* Empty / Unset State */
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-gray-50 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
              <Presentation className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-gray-900">Events Presentation</h3>
              <p className="text-xs text-gray-500 mt-1">
                {isAdmin
                  ? 'Click below to connect your Google Slides presentation.'
                  : 'Event presentation will appear here once loaded by chapter administration.'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={handleToggleEdit}
                className="inline-flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Edit3 className="w-4 h-4" />
                <span>Connect Google Slides Presentation</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
