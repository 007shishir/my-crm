"use client";

import { useState, useEffect } from "react";
import { signUp, authClient } from "@/lib/auth-client";

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "employee" });

  // Edit User Permissions State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    await signUp.email({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      assignedBusinesses: [],
      permissions: { canAddLead: false, canEditLead: false, canWriteComment: false, canDelete: false }
    });
    setIsAddModalOpen(false);
    setNewUser({ name: "", email: "", password: "", role: "employee" });
    fetchUsers();
  };

  const openEditModal = (user) => {
    setEditingUser({
      ...user,
      assignedBusinesses: user.assignedBusinesses || [],
      permissions: user.permissions || { canAddLead: false, canEditLead: false, canWriteComment: false, canDelete: false }
    });
    setNewPassword("");
    setIsEditModalOpen(true);
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    
    if (newPassword) {
      const res = await authClient.admin.setUserPassword({
        userId: editingUser.id || editingUser._id,
        newPassword: newPassword,
      });
      if (res.error) {
        alert("Failed to change password: " + res.error.message);
        return;
      }
    }
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingUser),
    });
    setIsEditModalOpen(false);
    fetchUsers();
  };

  const handleDeleteUser = async (user) => {
    if (confirm("Are you sure you want to delete this user?")) {
      const queryParam = user.id ? `id=${user.id}` : `_id=${user._id}`;
      await fetch(`/api/admin/users?${queryParam}`, { method: "DELETE" });
      fetchUsers();
    }
  };

  const toggleBusiness = (biz) => {
    const current = editingUser.assignedBusinesses || [];
    if (current.includes(biz)) {
      setEditingUser({ ...editingUser, assignedBusinesses: current.filter(b => b !== biz) });
    } else {
      setEditingUser({ ...editingUser, assignedBusinesses: [...current, biz] });
    }
  };

  const togglePermission = (perm) => {
    const currentPerms = editingUser.permissions || { canAddLead: false, canEditLead: false, canWriteComment: false, canDelete: false };
    setEditingUser({
      ...editingUser,
      permissions: { ...currentPerms, [perm]: !currentPerms[perm] }
    });
  };

  if (loading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black mb-2">User Management</h1>
          <p className="opacity-60 font-medium text-sm">Add, remove, and manage employee access levels.</p>
        </div>
        <button className="btn btn-primary shadow-lg" onClick={() => setIsAddModalOpen(true)}>+ Add New User</button>
      </div>

      <div className="bg-base-100 rounded-3xl p-6 shadow-sm border border-base-200">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="uppercase text-xs opacity-50">
                <th>Name</th>
                <th>Role</th>
                <th>Assigned Verticals</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id || user._id || index} className="hover">
                  <td>
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs opacity-50">{user.email}</div>
                  </td>
                  <td>
                    <div className={`badge badge-sm uppercase font-bold ${user.role === 'admin' ? 'badge-primary' : user.role === 'employee' ? 'badge-secondary' : 'badge-ghost'}`}>
                      {user.role}
                    </div>
                  </td>
                  <td>
                    {user.assignedBusinesses?.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {user.assignedBusinesses.map(b => (
                          <span key={b} className="badge badge-xs badge-outline">{b.replace("_", " ")}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs opacity-30">None</span>
                    )}
                  </td>
                  <td className="text-right space-x-2">
                    <button className="btn btn-xs btn-outline" onClick={() => openEditModal(user)}>Edit</button>
                    <button className="btn btn-xs btn-error btn-outline" onClick={() => handleDeleteUser(user)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      <dialog className="modal" open={isAddModalOpen}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Add New User</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <input type="text" placeholder="Full Name" className="input input-bordered w-full" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
            <input type="email" placeholder="Email Address" className="input input-bordered w-full" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            <input type="password" placeholder="Password" className="input input-bordered w-full" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
            <select className="select select-bordered w-full" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
              <option value="guest">Guest</option>
            </select>
            <div className="modal-action mt-6">
              <button type="button" className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create User</button>
            </div>
          </form>
        </div>
      </dialog>

      {/* EDIT PERMISSIONS MODAL */}
      <dialog className="modal" open={isEditModalOpen}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-1">Edit User Permissions</h3>
          <p className="text-xs opacity-50 mb-6">{editingUser?.email}</p>
          
          {editingUser && (
            <form onSubmit={handleSavePermissions} className="space-y-6">
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold">Role</span></label>
                <select className="select select-bordered" value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="guest">Guest</option>
                </select>
              </div>

              <div className="form-control w-full mt-4">
                <label className="label"><span className="label-text font-bold">Change Password</span></label>
                <input 
                  type="password" 
                  className="input input-bordered w-full" 
                  placeholder="Enter new password to change..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              {editingUser.role === "employee" && (
                <>
                  <div className="space-y-2">
                    <label className="label pb-0"><span className="label-text font-bold">Assigned Business Verticals</span></label>
                    <div className="flex flex-wrap gap-2">
                      {["nestvibe", "next_impression", "no_chinta", "study_first"].map(biz => (
                        <label key={biz} className="cursor-pointer label justify-start gap-2 bg-base-200 rounded-lg px-3 py-1">
                          <input type="checkbox" className="checkbox checkbox-xs" checked={editingUser.assignedBusinesses?.includes(biz) || false} onChange={() => toggleBusiness(biz)} />
                          <span className="label-text capitalize">{biz.replace("_", " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label pb-0"><span className="label-text font-bold">Granular Permissions</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {["canAddLead", "canEditLead", "canWriteComment", "canDelete"].map(perm => (
                        <label key={perm} className="cursor-pointer label justify-start gap-2 bg-base-200 rounded-lg px-3 py-1">
                          <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={editingUser.permissions?.[perm] || false} onChange={() => togglePermission(perm)} />
                          <span className="label-text text-xs">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="modal-action mt-8 border-t border-base-200 pt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          )}
        </div>
      </dialog>

    </div>
  );
}
