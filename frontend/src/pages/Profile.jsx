import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { fetchMe } from "../redux/slices/authSlice.js";
import api from "../services/api.js";

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put("/auth/profile", { name, phone });
      await dispatch(fetchMe());
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.put("/auth/change-password", { currentPassword, newPassword });
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-ink-800 font-display font-bold text-2xl">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-display font-semibold text-slate-100">{user?.name}</p>
            <p className="text-sm text-muted capitalize">{user?.role?.replace("admin", " admin")}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Full name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Email</label>
            <input className="input-field opacity-60" value={user?.email} disabled />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Phone</label>
            <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">Save changes</button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-slate-100 mb-4">Change password</h3>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Current password</label>
            <input type="password" className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">New password</label>
            <input type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">Update password</button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
