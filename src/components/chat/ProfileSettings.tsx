import { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";

interface ProfileSettingsProps {
  open: boolean;
  onClose: () => void;
}

const ProfileSettings = ({ open, onClose }: ProfileSettingsProps) => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { mode, theme, setMode, setTheme } = useThemeContext();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url || "");
      setMessage("");
    }
  }, [open, profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } else {
      setMessage("Failed to upload image");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const cleanUrl = avatarUrl.split("?t=")[0] || null;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null, username: username.trim(), avatar_url: cleanUrl })
      .eq("id", user.id);
    if (error) {
      setMessage(error.message.includes("unique") ? "Username already taken" : error.message);
    } else {
      await refreshProfile();
      setMessage("Profile updated!");
      setTimeout(() => { setMessage(""); onClose(); }, 1000);
    }
    setSaving(false);
  };

  const initials = (displayName || username || "A")[0].toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border overflow-hidden"
          >
            {/* Scrollable content */}
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-foreground">Settings</h2>
                <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center mb-5">
                <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-card" />
                  ) : (
                    <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card">
                      {initials}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  </div>
                </div>
                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                <p className="text-[11px] text-muted-foreground mt-2">Click to change photo</p>
              </div>

              {/* Profile fields */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Your display name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="username" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                  <input value={user?.email || ""} disabled
                    className="w-full bg-muted/40 text-sm text-muted-foreground rounded-xl px-3 py-2.5 cursor-not-allowed" />
                </div>
              </div>

              {/* Appearance */}
              <div className="mb-5">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Mode</label>
                <div className="flex gap-2 mb-3">
                  {(["dark", "light"] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Theme</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { id: "default", color: "bg-violet-500", label: "Default" },
                    { id: "ocean",   color: "bg-cyan-500",   label: "Ocean" },
                    { id: "forest",  color: "bg-green-500",  label: "Forest" },
                    { id: "rose",    color: "bg-rose-500",   label: "Rose" },
                  ] as const).map((t) => (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-medium transition-all border ${theme === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      <div className={`h-4 w-4 rounded-full ${t.color}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {message && (
                <p className={`text-xs mb-3 text-center font-medium ${message.includes("updated") ? "text-green-500" : "text-destructive"}`}>
                  {message}
                </p>
              )}

              <button onClick={handleSave} disabled={saving || uploading || !username.trim()}
                className="w-full gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity">
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button onClick={signOut}
                className="w-full mt-2 flex items-center justify-center gap-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl py-2.5 transition-colors">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileSettings;
