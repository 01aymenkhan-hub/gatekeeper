'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import AdminGuard from '@/components/auth/AdminGuard';
import { UserCog, UserPlus, Shield, Check, X, Building, Key, Pencil, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type ModalMode = 'create' | 'edit';

export default function AccessManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State (reused for Create Member and Edit Member)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [initialFormState, setInitialFormState] = useState<any>(null);

  // Form Fields (Shared single source of truth for both Create & Edit)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OPERATOR' | 'ADMIN'>('OPERATOR');
  const [selectedGates, setSelectedGates] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, gRes] = await Promise.all([fetch('/api/users'), fetch('/api/gates')]);
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }
      if (gRes.ok) {
        const gData = await gRes.json();
        setGates(gData.gates || []);
      }
    } catch (e) {
      console.error('Error loading access data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('OPERATOR');
    setSelectedGates([]);
    setModalError(null);
    setInitialFormState({
      name: '',
      email: '',
      password: '',
      role: 'OPERATOR',
      selectedGates: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (userToEdit: any) => {
    setModalMode('edit');
    setEditingUserId(userToEdit.id);
    const initialGates = userToEdit.gateAccess?.map((ga: any) => ga.gate?.id || ga.gateId) || [];
    setName(userToEdit.name || '');
    setEmail(userToEdit.email || '');
    setPassword(''); // Never expose existing password
    setRole(userToEdit.role || 'OPERATOR');
    setSelectedGates(initialGates);
    setModalError(null);
    setInitialFormState({
      name: userToEdit.name || '',
      email: userToEdit.email || '',
      password: '',
      role: userToEdit.role || 'OPERATOR',
      selectedGates: initialGates,
    });
    setIsModalOpen(true);
  };

  const isFormDirty = () => {
    if (!initialFormState) return false;
    return (
      name !== initialFormState.name ||
      email !== initialFormState.email ||
      password !== initialFormState.password ||
      role !== initialFormState.role ||
      JSON.stringify(selectedGates.slice().sort()) !==
        JSON.stringify(initialFormState.selectedGates.slice().sort())
    );
  };

  const handleCloseModal = () => {
    if (isFormDirty()) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }
    setIsModalOpen(false);
    setModalError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      if (modalMode === 'create') {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Name, email, and password are required.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            role,
            gateIds: role === 'OPERATOR' ? selectedGates : [],
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');

        setIsModalOpen(false);
        showNotification('Member created successfully.');
        loadData();
      } else {
        // Edit Mode
        if (!name.trim() || !email.trim()) {
          throw new Error('Name and email are required.');
        }
        if (password && password.trim().length < 6) {
          throw new Error('New password must be at least 6 characters.');
        }

        const payload: any = {
          id: editingUserId,
          name: name.trim(),
          email: email.trim(),
          role,
          gateIds: role === 'OPERATOR' ? selectedGates : [],
        };
        if (password && password.trim().length >= 6) {
          payload.password = password.trim();
        }

        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update member');

        setIsModalOpen(false);
        showNotification('Member updated successfully.');
        loadData();
      }
    } catch (err: any) {
      setModalError(err?.message || 'Error processing request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, active: !currentActive }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, active: !currentActive } : u))
        );
        showNotification(currentActive ? 'Member deactivated successfully.' : 'Member activated successfully.');
      }
    } catch (e) {
      console.error('Error toggling active status:', e);
    }
  };

  return (
    <AppLayout>
      <AdminGuard>
        <div className="space-y-6">
          {/* Success Banner Notification */}
          {successToast && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold animate-in fade-in slide-in-from-top-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <UserCog className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Manage Access &amp; Operators
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Configure user roles, assigned gate permissions, and security staff credentials
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Operator / Admin</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Assigned Gates</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span>Loading user accounts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 text-xs">
                        No member accounts found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {u.role === 'ADMIN' ? (
                            <span className="text-slate-500 font-medium">All Gates (Full Control)</span>
                          ) : u.gateAccess && u.gateAccess.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.gateAccess.map((ga: any) => (
                                <span
                                  key={ga.gate.id}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  {ga.gate.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No gates assigned</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Action Button */}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Edit Member Information"
                            >
                              <Pencil className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>Edit</span>
                            </button>

                            {/* Deactivate / Activate Action Button */}
                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleToggleActive(u.id, u.active)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                                  u.active
                                    ? 'border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                    : 'border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                              >
                                {u.active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Unified Member Modal (Reused for both Create Member and Edit Member) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white ${modalMode === 'create' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                    {modalMode === 'create' ? <UserPlus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {modalMode === 'create' ? 'Create User Account' : 'Edit Member Account'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {modalMode === 'create'
                        ? 'Set up security officer or admin credentials and gate access'
                        : `Modify profile details and assigned permissions for ${name || 'member'}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-3.5">
                {/* 1. Name */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Officer Tariq"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 2. Email */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tariq@gatekeeper.com"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 3. Password */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {modalMode === 'create' ? (
                      <>
                        Password <span className="text-rose-500">*</span>
                      </>
                    ) : (
                      'Change Password (Optional)'
                    )}
                  </label>
                  <input
                    type="password"
                    required={modalMode === 'create'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === 'create' ? 'Minimum 6 characters' : 'Leave blank to keep existing password'}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {modalMode === 'edit' && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Existing password remains active unless you enter a new one (min 6 chars).
                    </p>
                  )}
                </div>

                {/* 4. Role */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Role &amp; Privilege Level <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="OPERATOR">Operator / Guard</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                {/* 5. Gate Assignments (for Operators) or Admin note */}
                {role === 'OPERATOR' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Assigned Gates
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {selectedGates.length} of {gates.length} selected
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                      {gates.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No gates configured.</p>
                      ) : (
                        gates.map((g) => (
                          <label
                            key={g.id}
                            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-xs cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGates.includes(g.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGates([...selectedGates, g.id]);
                                } else {
                                  setSelectedGates(selectedGates.filter((id) => id !== g.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200">{g.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({g.type})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                    <span>Administrators automatically possess full access to all gates and system management.</span>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{modalMode === 'create' ? 'Create Account' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminGuard>
    </AppLayout>
  );
}
