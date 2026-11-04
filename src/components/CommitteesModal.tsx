import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit2, 
  Save, 
  Check, 
  Clock, 
  User, 
  Shield, 
  AlertCircle
} from 'lucide-react';
import { ContactEmailButton } from './ContactEmailButton';
import { useAuth } from '../context/useAuth';
import { 
  Committee, 
  subscribeCommittees, 
  updateCommittee 
} from '../services/committeeService';

interface CommitteesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommitteesModal: React.FC<CommitteesModalProps> = ({ isOpen, onClose }) => {
  const { user, isOfficer } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Committee>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeCommittees((data) => {
      setCommittees(data);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (comm: Committee) => {
    setEditingId(comm.id);
    setEditFormData({
      name: comm.name,
      description: comm.description,
      meetingInfo: comm.meetingInfo,
      leadOfficer: comm.leadOfficer,
      contactEmail: comm.contactEmail || 'shpetxst@gmail.com',
    });
    setErrorMsg(null);
  };

  const handleSave = async (commId: string) => {
    if (!user) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await updateCommittee(commId, editFormData, user.email || 'officer');
      setSaveSuccess(`Committee updated successfully!`);
      setEditingId(null);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update committee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-primary-700 px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2.5 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">The 6 Official Committees</h3>
              <p className="text-xs text-primary-200">
                {isOfficer ? 'Officer Management, Leader Emails & Meeting Schedules' : 'Official Committees & Meeting Schedules'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Messages */}
        <div className="px-6 pt-4">
          {saveSuccess && (
            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>{saveSuccess}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Committees List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {committees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Loading chapter committees...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {committees.map((comm) => {
                const isEditing = editingId === comm.id;

                return (
                  <div 
                    key={comm.id}
                    className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div>
                      {isEditing ? (
                        /* Editing View */
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Committee Name</label>
                            <input
                              type="text"
                              value={editFormData.name || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                              className="w-full text-sm font-bold p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Lead Officer(s)</label>
                            <input
                              type="text"
                              value={editFormData.leadOfficer || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, leadOfficer: e.target.value })}
                              className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Meeting Time & Location</label>
                            <input
                              type="text"
                              value={editFormData.meetingInfo || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, meetingInfo: e.target.value })}
                              className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Committee Leader Email Address *
                            </label>
                            <input
                              type="email"
                              value={editFormData.contactEmail || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                              placeholder="e.g. shpetxst@gmail.com or lead@txstate.edu"
                              className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white font-mono"
                            />
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              Pre-filled when members click to contact the committee lead.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Mission & Description</label>
                            <textarea
                              rows={3}
                              value={editFormData.description || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                              className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Read-Only View */
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-lg font-bold text-gray-900">{comm.name}</h4>
                            {isOfficer && (
                              <button
                                onClick={() => handleStartEdit(comm)}
                                className="inline-flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg font-medium transition-colors border border-primary-200"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Modify</span>
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                            {comm.description}
                          </p>

                          <div className="space-y-2 pt-2 border-t border-gray-200 text-xs">
                            <div className="flex items-center text-gray-700">
                              <User className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 mr-1">Lead:</span>
                              <span className="truncate">{comm.leadOfficer || 'Executive Board'}</span>
                            </div>

                            <div className="flex items-center text-gray-700">
                              <Clock className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 mr-1">Meetings:</span>
                              <span className="truncate">{comm.meetingInfo || 'Check calendar'}</span>
                            </div>

                            <div className="pt-2">
                              <ContactEmailButton
                                email={comm.contactEmail || 'shpetxst@gmail.com'}
                                label={`Contact ${comm.name}`}
                                subject={`Inquiry - ${comm.name}`}
                                size="sm"
                                variant="outline"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleSave(comm.id)}
                          className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
