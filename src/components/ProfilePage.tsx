import React, { useState, useEffect, useCallback, useRef } from "react";
import { Post } from "@/types/post";
import {
  fetchUser,
  SessionUser,
  updateUserProfile,
  fetchPostsByAuthor,
  fetchUserByEmail,
  updateUserAdminByEmail,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Clock,
  Pencil,
  Check,
  X,
  Newspaper,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  Cake,
} from "lucide-react";

interface ProfilePageProps {
  user: SessionUser;
  onReadMore: (postId: string) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onReadMore }) => {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [memberSince, setMemberSince] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminLookupLoading, setAdminLookupLoading] = useState(false);
  const [adminTarget, setAdminTarget] = useState<{
    email: string;
    name?: string;
    is_admin?: boolean;
  } | null>(null);
  const [adminUpdating, setAdminUpdating] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const calculateAge = (birthdayStr: string): number | null => {
    if (!birthdayStr) return null;
    const today = new Date();
    const birth = new Date(birthdayStr);
    if (isNaN(birth.getTime())) return null;
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  };

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      let profile = null as Awaited<ReturnType<typeof fetchUser>> | null;

      try {
        profile = await fetchUser(user.id);
      } catch (err) {
        if (user.email) {
          try {
            profile = await fetchUserByEmail(user.email);
          } catch (emailErr) {
            profile = null;
          }
        }
      }

      if (profile) {
        setName(profile.name || user.email?.split("@")[0] || "");
        setBirthday(profile.birthday || "");
        setAge(calculateAge(profile.birthday || ""));
        setAvatarUrl(profile.avatar_url || null);
        setIsAdmin(Boolean(profile.is_admin));
        setMemberSince(
          new Date(profile.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        );
        return;
      }

      throw new Error("Profile not found");
    } catch {
      // If user record doesn't exist yet, use auth info
      setName(user.email?.split("@")[0] || "");
      setBirthday("");
      setAge(null);
      setAvatarUrl(null);
      setIsAdmin(false);
      setMemberSince(
        user.created_at
          ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "",
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  const resolveAuthorId = useCallback(async () => {
    let authorId = user.id;
    try {
      await fetchUser(user.id);
    } catch (err) {
      if (user.email) {
        try {
          const existing = await fetchUserByEmail(user.email);
          authorId = existing.id;
        } catch (fetchErr) {
          // Keep auth id as fallback if no public profile exists yet.
        }
      }
    }
    return authorId;
  }, [user]);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const authorId = await resolveAuthorId();
      const data = await fetchPostsByAuthor(authorId);
      setPosts(data);
    } catch (err) {
      console.error("Failed to fetch user posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [resolveAuthorId]);

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, [loadProfile, loadPosts]);

  const startEditing = () => {
    setEditName(name);
    setEditBirthday(birthday);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await updateUserProfile(user.id, {
        name: editName.trim(),
        birthday: editBirthday || null,
        email: user.email || undefined,
      });
      setName(editName.trim());
      setBirthday(editBirthday);
      setAge(calculateAge(editBirthday));
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : (err as { message?: string })?.message ||
              "Failed to update profile. Please try again.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAvatarSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setAdminSuccess("");

    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setAvatarError(`Image must be ${maxSizeMb}MB or less.`);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await updateUserProfile(user.id, {
        avatar_url: dataUrl,
        email: user.email || undefined,
      });
      setAvatarUrl(dataUrl);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : (err as { message?: string })?.message ||
              "Failed to update avatar. Please try again.";
      setAvatarError(message);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError("");
    setUploadingAvatar(true);
    try {
      await updateUserProfile(user.id, {
        avatar_url: null,
        email: user.email || undefined,
      });
      setAvatarUrl(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : (err as { message?: string })?.message ||
              "Failed to remove avatar. Please try again.";
      setAvatarError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAdminLookup = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email) {
      setAdminError("Enter an email to look up.");
      return;
    }
    setAdminError("");
    setAdminSuccess("");
    setAdminLookupLoading(true);
    try {
      const found = await fetchUserByEmail(email);
      setAdminTarget({
        email: found.email,
        name: found.name,
        is_admin: found.is_admin,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : (err as { message?: string })?.message ||
              "Failed to find that user.";
      setAdminError(message);
      setAdminTarget(null);
    } finally {
      setAdminLookupLoading(false);
    }
  };

  const handleAdminToggle = async (nextValue: boolean) => {
    if (!adminTarget) return;
    setAdminError("");
    setAdminSuccess("");
    setAdminUpdating(true);
    try {
      const updated = await updateUserAdminByEmail(
        adminTarget.email,
        nextValue,
      );
      setAdminTarget({
        email: updated.email,
        name: updated.name,
        is_admin: updated.is_admin,
      });
      setAdminSuccess("Admin access updated.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : (err as { message?: string })?.message ||
              "Failed to update admin access.";
      setAdminError(message);
    } finally {
      setAdminUpdating(false);
    }
  };

  const normalizeDateString = (value: string) => {
    const iso = value.includes("T") ? value : value.replace(" ", "T");
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso);
    return hasTimezone ? iso : `${iso}Z`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(normalizeDateString(dateStr));
    const datePart = date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${datePart} • ${timePart}`;
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 pt-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          {/* Banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
          </div>

          {/* Avatar + Info */}
          <div className="px-6 sm:px-10 pb-8 -mt-14 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-8">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-slate-800 shadow-xl overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name || "Profile photo"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  name?.[0]?.toUpperCase() ||
                  user.email?.[0]?.toUpperCase() ||
                  "A"
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                {!editing ? (
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                      {name}
                    </h1>
                    {isAdmin && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Admin
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditing}
                      className="text-slate-400 bg-slate-700  rounded-lg shrink-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white max-w-xs"
                      placeholder="Your name"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveProfile}
                      disabled={saving}
                      className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-slate-400 text-sm mt-1">{user.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {avatarUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-700/30 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider mb-2">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>
                <p className="text-white text-sm font-medium truncate">
                  {user.email}
                </p>
              </div>

              <div className="bg-slate-700/30 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider mb-2">
                  <Cake className="h-3.5 w-3.5" />
                  Birthday
                </div>
                {editing ? (
                  <Input
                    type="date"
                    value={editBirthday}
                    onChange={(e) => setEditBirthday(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                  />
                ) : (
                  <p className="text-white text-sm font-medium">
                    {birthday
                      ? new Date(birthday + "T00:00:00").toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "Not set"}
                  </p>
                )}
              </div>

              <div className="bg-slate-700/30 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider mb-2">
                  <UserIcon className="h-3.5 w-3.5" />
                  Age
                </div>
                <p className="text-white text-sm font-medium">
                  {editing
                    ? editBirthday
                      ? `${calculateAge(editBirthday) ?? "—"} years old`
                      : "—"
                    : age !== null
                      ? `${age} years old`
                      : "—"}
                </p>
              </div>
            </div>

            {/* Editing save bar */}
            {editing && (
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
                <p className="text-blue-300 text-sm flex-1">
                  You are editing your profile. Click save to apply changes.
                </p>
                <Button
                  size="sm"
                  onClick={saveProfile}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1.5" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </Button>
              </div>
            )}

            {saveError && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                {saveError}
              </div>
            )}

            {avatarError && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                {avatarError}
              </div>
            )}

            {isAdmin && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Admin Permissions
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Toggle admin access for a user by email.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="client@email.com"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                  <Button
                    type="button"
                    onClick={handleAdminLookup}
                    disabled={adminLookupLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    {adminLookupLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Find User
                  </Button>
                </div>

                {adminError && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {adminError}
                  </div>
                )}

                {adminSuccess && (
                  <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm">
                    {adminSuccess}
                  </div>
                )}

                {adminTarget && (
                  <div className="mt-5 flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-700/60 rounded-xl p-4">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {adminTarget.name || adminTarget.email}
                      </p>
                      <p className="text-slate-400 text-sm truncate">
                        {adminTarget.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">Admin</span>
                      <Switch
                        checked={Boolean(adminTarget.is_admin)}
                        onCheckedChange={handleAdminToggle}
                        disabled={adminUpdating}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User Posts */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              Your Posts
              {!loadingPosts && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({posts.length})
                </span>
              )}
            </h2>
          </div>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
              <Newspaper className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No posts yet
              </h3>
              <p className="text-slate-400">
                You haven't created any posts. Start writing to see them here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onReadMore(post.id)}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {post.images && post.images.length > 0 ? (
                      <img
                        src={post.images[0]}
                        alt={post.title}
                        className="w-20 h-20 rounded-lg object-cover shrink-0 hidden sm:block"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0 hidden sm:block">
                        <Newspaper className="h-8 w-8 text-slate-600" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            post.type === "news"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {post.type === "news" ? (
                            <Newspaper className="h-2.5 w-2.5" />
                          ) : (
                            <BookOpen className="h-2.5 w-2.5" />
                          )}
                          {post.type}
                        </span>
                        {post.is_hidden && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                            <EyeOff className="h-2.5 w-2.5" />
                            Hidden
                          </span>
                        )}
                      </div>

                      <h3 className="text-white font-semibold text-base group-hover:text-blue-400 transition-colors truncate">
                        {post.title}
                      </h3>

                      <p className="text-slate-400 text-sm mt-1 line-clamp-1">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.created_at)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {post.reading_time} min
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          {post.is_hidden ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          {post.is_hidden ? "Hidden" : "Visible"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
