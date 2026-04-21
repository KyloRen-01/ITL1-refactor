import React, { useState, useRef, useEffect } from "react";

import { Post } from "@/types/post";
import { createPost, updatePost } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  BookOpen,
  Newspaper,
  Eye,
  EyeOff,
} from "lucide-react";

interface PostEditorProps {
  userId: string;
  editPost?: Post | null;
  isAdmin?: boolean;
  onBack: () => void;
  onSaved: () => void;
}

const PostEditor: React.FC<PostEditorProps> = ({
  userId,
  editPost,
  isAdmin = false,
  onBack,
  onSaved,
}) => {
  const [title, setTitle] = useState(editPost?.title || "");
  const [content, setContent] = useState(editPost?.content || "");
  const [type, setType] = useState<"article" | "news">(
    editPost?.type || "article",
  );
  const [newsLink, setNewsLink] = useState(editPost?.news_link || "");
  const [images, setImages] = useState<string[]>(editPost?.images || []);
  const [excerpt, setExcerpt] = useState(editPost?.excerpt || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [publishAtLocal, setPublishAtLocal] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readingTime =
    type === "news"
      ? 1
      : Math.max(
          1,
          Math.ceil(content.split(/\s+/).filter(Boolean).length / 200),
        );

  useEffect(() => {
    if (type === "news" && images.length > 1) {
      setImages([images[0]]);
    }
  }, [type, images]);

  const toDateTimeLocal = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (editPost?.created_at) {
      setPublishAtLocal(toDateTimeLocal(new Date(editPost.created_at)));
    } else {
      setPublishAtLocal(toDateTimeLocal(new Date()));
    }
  }, [editPost?.created_at, isAdmin]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      const selectedFiles = type === "news" ? [files[0]] : Array.from(files);
      const uploadPromises = selectedFiles.map(async (file) => {
        // For now, convert images to base64 data URLs
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const urls = await Promise.all(uploadPromises);
      setImages((prev) =>
        type === "news" ? urls.slice(0, 1) : [...prev, ...urls],
      );
    } catch (err: any) {
      setError("Failed to upload images: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const isNews = type === "news";
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (isNews) {
      if (!newsLink.trim()) {
        setError("News link is required");
        return;
      }
      if (images.length === 0) {
        setError("Cover photo is required for news");
        return;
      }
    } else if (!content.trim()) {
      setError("Content is required for articles");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const postData = {
        title: title.trim(),
        content: isNews ? "" : content.trim(),
        news_link: isNews ? newsLink.trim() : null,
        type,
        images: isNews ? images.slice(0, 1) : images,
        excerpt: isNews
          ? excerpt.trim()
          : excerpt.trim() || content.trim().substring(0, 160),
        reading_time: readingTime,
        slug,
        is_hidden: false,
        author_id: userId,
        ...(isAdmin && publishAtLocal
          ? { created_at: new Date(publishAtLocal).toISOString() }
          : {}),
      };

      if (editPost) {
        await updatePost(editPost.id, postData);
      } else {
        await createPost(postData);
      }

      onSaved();
    } catch (err: any) {
      setError("Failed to save: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">
              {editPost ? "Edit Post" : "Create New Post"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setPreview(!preview)}
              className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              {preview ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {preview ? "Edit" : "Preview"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !title.trim() ||
                (type === "article" && !content.trim()) ||
                (type === "news" && (!newsLink.trim() || images.length === 0))
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving..." : "Publish"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main editor */}
          <div className="lg:col-span-2 space-y-6">
            {preview ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                      type === "news"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {type}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {readingTime} min read
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-6">
                  {title || "Untitled"}
                </h2>
                {type === "news" ? (
                  <div className="space-y-4">
                    {images[0] && (
                      <img
                        src={images[0]}
                        alt=""
                        className="rounded-lg w-full h-56 object-cover"
                      />
                    )}
                    <a
                      href={newsLink || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                    >
                      Open source link
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-invert max-w-none">
                      {content.split("\n").map((p, i) => {
                        if (!p.trim()) return <br key={i} />;
                        if (p.startsWith("# "))
                          return (
                            <h1
                              key={i}
                              className="text-2xl font-bold text-white mt-6 mb-3"
                            >
                              {p.slice(2)}
                            </h1>
                          );
                        if (p.startsWith("## "))
                          return (
                            <h2
                              key={i}
                              className="text-xl font-bold text-white mt-4 mb-2"
                            >
                              {p.slice(3)}
                            </h2>
                          );
                        if (p.startsWith("> "))
                          return (
                            <blockquote
                              key={i}
                              className="border-l-4 border-blue-500 pl-4 py-2 my-4 text-slate-300 italic"
                            >
                              {p.slice(2)}
                            </blockquote>
                          );
                        return (
                          <p
                            key={i}
                            className="text-slate-300 leading-relaxed mb-3"
                          >
                            {p}
                          </p>
                        );
                      })}
                    </div>
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mt-6">
                        {images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="rounded-lg w-full h-40 object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    {type === "news" ? "News Title" : "Title"}
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a compelling title..."
                    className="bg-slate-800/50 border-slate-700/50 text-white text-lg h-14 rounded-xl placeholder:text-slate-500 focus-visible:ring-blue-500"
                  />
                </div>

                {type === "news" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        News Link
                      </label>
                      <Input
                        value={newsLink}
                        onChange={(e) => setNewsLink(e.target.value)}
                        placeholder="Paste the source URL..."
                        className="bg-slate-800/50 border-slate-700/50 text-white rounded-xl placeholder:text-slate-500 focus-visible:ring-amber-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Excerpt (optional)
                      </label>
                      <Input
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder="Brief description for cards and previews..."
                        className="bg-slate-800/50 border-slate-700/50 text-white rounded-xl placeholder:text-slate-500 focus-visible:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300">
                          Content
                        </label>
                        <span className="text-xs text-slate-500">
                          {"Supports basic markdown (# ## > - *)"}
                        </span>
                      </div>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your post content here...&#10;&#10;Use markdown for formatting:&#10;# Heading 1&#10;## Heading 2&#10;> Blockquote&#10;- List item"
                        rows={18}
                        className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm leading-relaxed"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Post type */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Post Type
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setType("article")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    type === "article"
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "border-slate-700/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <BookOpen className="h-6 w-6" />
                  <span className="text-sm font-medium">Article</span>
                </button>
                <button
                  onClick={() => setType("news")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    type === "news"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "border-slate-700/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <Newspaper className="h-6 w-6" />
                  <span className="text-sm font-medium">News</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            {type === "article" && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                  Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Words</span>
                    <span className="text-white font-medium">
                      {content.split(/\s+/).filter(Boolean).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Reading time</span>
                    <span className="text-white font-medium">
                      {readingTime} min
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Images</span>
                    <span className="text-white font-medium">
                      {images.length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Publish details */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Publish Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date Created</span>
                  <span className="text-white font-medium">
                    {editPost?.created_at
                      ? new Date(editPost.created_at).toLocaleDateString(
                          "en-US",
                          {
                            timeZone: "Asia/Manila",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "On publish"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time Created</span>
                  <span className="text-white font-medium">
                    {editPost?.created_at
                      ? new Date(editPost.created_at).toLocaleTimeString(
                          "en-US",
                          {
                            timeZone: "Asia/Manila",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )
                      : "On publish"}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-slate-700/60">
                  <label className="text-xs uppercase tracking-wider text-slate-400">
                    Admin publish time
                  </label>
                  <Input
                    type="datetime-local"
                    value={publishAtLocal}
                    onChange={(e) => setPublishAtLocal(e.target.value)}
                    className="mt-2 bg-slate-700/50 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Admins can override the post timestamp.
                  </p>
                </div>
              )}
            </div>

            {/* Images / Cover Photo */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                {type === "news" ? "Cover Photo" : "Images"}
              </h3>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={type !== "news"}
                onChange={handleImageUpload}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700/50 hover:border-slate-500 rounded-xl h-20 flex-col gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">
                      {type === "news"
                        ? "Click to upload cover photo"
                        : "Click to upload images"}
                    </span>
                  </>
                )}
              </Button>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="relative group rounded-lg overflow-hidden aspect-video"
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostEditor;
