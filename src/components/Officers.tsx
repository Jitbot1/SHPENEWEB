import React, { useState, useEffect } from "react";
import { 
  PlusCircle, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  X, 
  Check, 
  AlertCircle,
  AlertTriangle,
  Upload
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { 
  subscribeOfficers, 
  saveOfficerProfile, 
  deleteOfficerProfile, 
  seedInitialOfficersIfEmpty,
  FirestoreOfficer 
} from "../services/officersService";
import { ContactEmailButton } from "./ContactEmailButton";

const OfficerCard = ({ 
  officer, 
  isFlipped, 
  onFlip,
  isAdmin,
  onEdit,
  onRequestDelete
}: { 
  officer: FirestoreOfficer;
  isFlipped: boolean;
  onFlip: () => void;
  isAdmin: boolean;
  onEdit?: (officer: FirestoreOfficer) => void;
  onRequestDelete?: (officer: FirestoreOfficer) => void;
}) => {
  return (
    <div className="relative w-full h-80 group">
      {/* Admin Action Badges (Top-right corner) */}
      {isAdmin && (
        <div className="absolute top-2 right-2 z-20 flex space-x-1 opacity-90 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(officer);
            }}
            className="p-1.5 bg-white/95 hover:bg-white text-primary-700 rounded-lg shadow-md border border-gray-200 transition-colors"
            title="Edit Officer Profile"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete?.(officer);
            }}
            className="p-1.5 bg-white/95 hover:bg-white text-red-600 rounded-lg shadow-md border border-gray-200 transition-colors"
            title="Delete Officer Profile"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className="relative w-full h-full cursor-pointer perspective"
        onClick={onFlip}
        tabIndex={0}
        onKeyPress={e => { if (e.key === "Enter") onFlip(); }}
      >
        <div 
          className={`transition-transform duration-500 w-full h-full absolute top-0 left-0 ${isFlipped ? "rotate-y-180" : ""}`} 
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center text-center w-full h-full backface-hidden justify-between border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center">
              <img
                src={officer.image}
                alt={officer.name}
                className="w-32 h-32 rounded-xl object-cover mb-3 shadow-sm border border-gray-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png';
                }}
              />
              <h3 className="text-lg font-bold text-gray-900 leading-snug">{officer.name}</h3>
              <p className="text-primary-600 font-semibold text-sm mt-0.5">{officer.position}</p>
              <p className="text-gray-500 text-xs mt-1">{officer.major} • {officer.gradYear}</p>
            </div>
            <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Click to view bio</p>
          </div>

          {/* Back */}
          <div className="bg-primary-50 rounded-2xl shadow-md p-6 flex flex-col items-center text-center w-full h-full absolute top-0 left-0 rotate-y-180 backface-hidden justify-between border border-primary-100">
            <div className="overflow-y-auto max-h-[200px] w-full scrollbar-thin">
              <h3 className="text-base font-bold mb-2 text-primary-950">{officer.name}</h3>
              <p className="text-gray-700 text-xs italic leading-relaxed mb-3">
                {officer.bio || '"Familia to me means a community that supports and pushes you to achieve your potential."'}
              </p>
            </div>
            <div className="pt-2 w-full border-t border-primary-200/60 flex flex-wrap items-center justify-center gap-2">
              {officer.linkedin ? (
                <a
                  href={officer.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold inline-block"
                >
                  LinkedIn
                </a>
              ) : null}
              <div onClick={(e) => e.stopPropagation()}>
                <ContactEmailButton
                  email="shpetxst@gmail.com"
                  subject={`Inquiry for SHPE Officer ${officer.name} (${officer.position})`}
                  label="Contact Officer"
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Officers = () => {
  const { user, isAdmin } = useAuth();
  const [officersList, setOfficersList] = useState<FirestoreOfficer[]>([]);
  const [flippedOfficer, setFlippedOfficer] = useState<string | null>(null);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingOfficer, setEditingOfficer] = useState<FirestoreOfficer | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formPosition, setFormPosition] = useState<string>('');
  const [formGroup, setFormGroup] = useState<'Executive Board' | 'Board of Directors'>('Executive Board');
  const [formMajor, setFormMajor] = useState<string>('');
  const [formGradYear, setFormGradYear] = useState<string>('');
  const [formImage, setFormImage] = useState<string>('');
  const [formLinkedin, setFormLinkedin] = useState<string>('');
  const [formBio, setFormBio] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // In-App Deletion Confirmation State (Bypasses window.confirm iframe block!)
  const [officerToDelete, setOfficerToDelete] = useState<FirestoreOfficer | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeOfficers((list) => {
      setOfficersList(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isAdmin && user?.email) {
      seedInitialOfficersIfEmpty(user.email);
    }
  }, [isAdmin, user]);

  const executiveBoard = officersList.filter(o => o.group === "Executive Board");
  const boardOfDirectors = officersList.filter(o => o.group === "Board of Directors");

  const handleCardFlip = (officerId: string) => {
    setFlippedOfficer(flippedOfficer === officerId ? null : officerId);
  };

  const handleOpenAdd = () => {
    setEditingOfficer(null);
    setFormName('');
    setFormPosition('');
    setFormGroup('Executive Board');
    setFormMajor('');
    setFormGradYear('');
    setFormImage('/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png');
    setFormLinkedin('');
    setFormBio('');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (officer: FirestoreOfficer) => {
    setEditingOfficer(officer);
    setFormName(officer.name);
    setFormPosition(officer.position);
    setFormGroup(officer.group);
    setFormMajor(officer.major);
    setFormGradYear(officer.gradYear);
    setFormImage(officer.image);
    setFormLinkedin(officer.linkedin || '');
    setFormBio(officer.bio || '');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleRequestDelete = (officer: FirestoreOfficer) => {
    setOfficerToDelete(officer);
  };

  const handleConfirmDelete = async () => {
    if (!officerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOfficerProfile(officerToDelete.id);
      // Immediately filter out locally for fast UI response
      setOfficersList((prev) => prev.filter((o) => o.id !== officerToDelete.id));
      setOfficerToDelete(null);
    } catch (err: unknown) {
      console.error('Delete failed:', err);
      alert('Failed to delete officer profile. Please verify your admin permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPosition.trim()) {
      setFormError('Name and position are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveOfficerProfile(
        {
          id: editingOfficer?.id,
          name: formName.trim(),
          position: formPosition.trim(),
          group: formGroup,
          major: formMajor.trim(),
          gradYear: formGradYear.trim(),
          image: formImage.trim() || '/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png',
          linkedin: formLinkedin.trim(),
          bio: formBio.trim(),
          order: editingOfficer?.order ?? officersList.length,
        },
        user?.email || 'shpetxst@gmail.com'
      );
      setFormSuccess('Officer profile saved successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingOfficer(null);
        setFormSuccess(null);
      }, 1000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save officer profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-gray-50">
      {/* Banner Section */}
      <div className="container mx-auto px-4 mb-16">
        <div className="bg-primary-600 rounded-3xl overflow-hidden flex flex-col md:flex-row h-auto md:h-80 shadow-md">
          <div className="flex-1 flex flex-col justify-center p-8 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Meet the 2026-2027 Officers
            </h1>
            <p className="text-xl opacity-90">
              Committed to leading with purpose and uplifting our SHPE familia.
            </p>

            {/* Admin Badge and Action */}
            {isAdmin && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/30">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Admin Mode (shpetxst@gmail.com)</span>
                </span>
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-white text-primary-700 hover:bg-primary-50 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add New Officer</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center p-8 bg-primary-700/50">
            <img
              src="/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png"
              alt="SHPE Officers"
              className="w-full h-full object-cover rounded-2xl shadow-sm max-h-64"
            />
          </div>
        </div>
      </div>

      {/* Executive Board Section */}
      <div className="container mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Executive Board
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {executiveBoard.map((officer) => (
            <OfficerCard 
              key={officer.id || officer.name} 
              officer={officer} 
              isFlipped={flippedOfficer === (officer.id || officer.name)}
              onFlip={() => handleCardFlip(officer.id || officer.name)}
              isAdmin={isAdmin}
              onEdit={handleOpenEdit}
              onRequestDelete={handleRequestDelete}
            />
          ))}
        </div>
      </div>

      {/* Board of Directors Section */}
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Board of Directors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {boardOfDirectors.map((officer) => (
            <OfficerCard 
              key={officer.id || officer.name} 
              officer={officer} 
              isFlipped={flippedOfficer === (officer.id || officer.name)}
              onFlip={() => handleCardFlip(officer.id || officer.name)}
              isAdmin={isAdmin}
              onEdit={handleOpenEdit}
              onRequestDelete={handleRequestDelete}
            />
          ))}
        </div>
      </div>

      {/* ADMIN EDIT / ADD OFFICER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary-600 px-6 py-4 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-lg">
                  {editingOfficer ? 'Edit Officer Profile' : 'Add New Officer'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOfficer} className="p-6 space-y-4 text-xs">
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

              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Victoria Ramos"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Position *</label>
                  <input
                    type="text"
                    required
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="e.g. President"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Group *</label>
                  <select
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value as 'Executive Board' | 'Board of Directors')}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm bg-white"
                  >
                    <option value="Executive Board">Executive Board</option>
                    <option value="Board of Directors">Board of Directors</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Major</label>
                  <input
                    type="text"
                    value={formMajor}
                    onChange={(e) => setFormMajor(e.target.value)}
                    placeholder="e.g. Civil Engineering"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Graduation Year</label>
                  <input
                    type="text"
                    value={formGradYear}
                    onChange={(e) => setFormGradYear(e.target.value)}
                    placeholder="e.g. 2027"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Profile Photo *</label>
                <div className="flex items-center space-x-3 mb-2">
                  <img
                    src={formImage || '/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png'}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 bg-gray-100 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/Headshots2627/Screenshot 2026-09-07 at 8.53.23 PM.png';
                    }}
                  />
                  <div className="flex-1">
                    <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl cursor-pointer transition-colors border border-gray-300">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Headshot from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                let width = img.width;
                                let height = img.height;
                                const maxDim = 600;
                                if (width > maxDim || height > maxDim) {
                                  if (width > height) {
                                    height = Math.round((height * maxDim) / width);
                                    width = maxDim;
                                  } else {
                                    width = Math.round((width * maxDim) / height);
                                    height = maxDim;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                                setFormImage(dataUrl);
                              };
                              img.src = reader.result as string;
                            };
                            reader.readAsDataURL(file);
                          } catch (uploadErr) {
                            console.error('Photo read error:', uploadErr);
                          }
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, or JPEG up to 5MB</p>
                  </div>
                </div>

                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="Or paste image URL / chapter path"
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={formLinkedin}
                  onChange={(e) => setFormLinkedin(e.target.value)}
                  placeholder="https://www.linkedin.com/in/..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Bio / "What does SHPE mean to you?"</label>
                <textarea
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Enter quote or personal statement..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR OFFICER DELETION (Bypasses window.confirm iframe block!) */}
      {officerToDelete && (
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
                Confirm Officer Removal
              </h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to permanently remove officer <strong>"{officerToDelete.name}"</strong> ({officerToDelete.position})? This will delete their profile from the database and the public website roster immediately.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOfficerToDelete(null)}
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
                {isDeleting ? 'Deleting...' : 'Yes, Delete Officer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Officers;
