import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — JarWise" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
    if (user?.email) setEmail(user.email);
  }, [profile, user?.email]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const trimmed = fullName.trim();
      if (trimmed.length > 100) throw new Error("Name must be under 100 characters");
      const { error } = await supabase.from("profiles").update({ full_name: trimmed, avatar_url: avatarUrl || null }).eq("id", userId);
      if (error) throw error;
      if (email && email !== user?.email) {
        const { error: e2 } = await supabase.auth.updateUser({ email });
        if (e2) throw e2;
        toast.info("Check your inbox to confirm the new email address.");
      }
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile", userId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePass = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
      if (!user?.email) throw new Error("No email on account");
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signErr) throw new Error("Current password is incorrect");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password updated"); setCurrentPassword(""); setNewPassword(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
      if (dbErr) throw dbErr;
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const initials = (fullName || user?.email || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information.</p>
      </div>

      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full border object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">{initials}</div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border bg-background shadow hover:bg-accent"
              aria-label="Change photo"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{user?.email}</div>
            <div className="text-xs text-muted-foreground">PNG, JPG up to 5MB.</div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
          {saveProfile.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="font-medium">Change password</div>
          <p className="text-xs text-muted-foreground">Confirm your current password, then choose a new one.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cp">Current password</Label>
            <Input id="cp" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
          </div>
        </div>
        <Button variant="outline" onClick={() => changePass.mutate()} disabled={changePass.isPending || !newPassword || !currentPassword}>
          {changePass.isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </div>
  );
}