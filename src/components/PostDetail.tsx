import React, { useState, useEffect, useCallback } from "react";
import { Post } from "@/types/post";
import { fetchComments, submitComment } from "@/lib/db";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Newspaper,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Copy,
  Check,
  Send,
  Loader2,
  MessageSquare,
  User as UserIcon,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Comment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
  is_approved: boolean;
}

interface PostDetailProps {
  post: Post;
  onBack: () => void;
}
const toParagraphBlocks = (raw: string) => {
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/([.!?])(?=[A-Z])/g, "$1\n\n")
    .replace(
      /\s+(Moreover|Furthermore|However|Therefore|Thus|Consequently|Meanwhile|First|Second|Third|Finally|In addition)\b/g,
      "\n\n$1",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
};
const PostDetail: React.FC<PostDetailProps> = ({ post, onBack }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Comment state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState("");
  const [commentError, setCommentError] = useState("");

  const fetchCommentsData = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await fetchComments(post.id);
      setComments(data);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  useEffect(() => {
    fetchCommentsData();
  }, [fetchCommentsData]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentEmail.trim() || !commentContent.trim()) {
      setCommentError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setCommentError("");
    setCommentSuccess("");
    try {
      await submitComment(
        post.id,
        commentName.trim(),
        commentEmail.trim(),
        commentContent.trim(),
      );
      setCommentSuccess("Your comment has been submitted!");
      setCommentName("");
      setCommentEmail("");
      setCommentContent("");
    } catch (err: any) {
      setCommentError(
        "Failed to submit comment: " + (err.message || "Unknown error"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const normalizeDateString = (value: string) => {
    const iso = value.includes("T") ? value : value.replace(" ", "T");
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso);
    return hasTimezone ? iso : `${iso}Z`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(normalizeDateString(dateStr));
    const datePart = date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      weekday: "long",
      month: "long",
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

  const formatCommentDate = (dateStr: string) => {
    const date = new Date(normalizeDateString(dateStr));
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const coverImage =
    post.images && post.images.length > 0
      ? post.images[0]
      : "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=600&fit=crop";

  const publisherName =
    post.users?.name || post.users?.email?.split("@")[0] || "Unknown";
  const publisherAvatar = post.users?.avatar_url || null;

  const renderContent = (content: string) => {
    return toParagraphBlocks(content).map((paragraph, i) => {
      if (!paragraph.trim()) return <br key={i} />;
      if (paragraph.startsWith("# "))
        return (
          <h1 key={i} className="text-3xl font-bold text-white mt-8 mb-4">
            {paragraph.slice(2)}
          </h1>
        );
      if (paragraph.startsWith("## "))
        return (
          <h2 key={i} className="text-2xl font-bold text-white mt-6 mb-3">
            {paragraph.slice(3)}
          </h2>
        );
      if (paragraph.startsWith("### "))
        return (
          <h3 key={i} className="text-xl font-bold text-white mt-5 mb-2">
            {paragraph.slice(4)}
          </h3>
        );
      if (paragraph.startsWith("> "))
        return (
          <blockquote
            key={i}
            className="border-l-4 border-blue-500 pl-4 py-2 my-4 text-slate-300 italic bg-slate-800/30 rounded-r-lg"
          >
            {paragraph.slice(2)}
          </blockquote>
        );
      if (paragraph.startsWith("- ") || paragraph.startsWith("* "))
        return (
          <li key={i} className="text-slate-300 leading-relaxed ml-4 list-disc">
            {paragraph.slice(2)}
          </li>
        );
      return (
        <p key={i} className="text-slate-300 leading-relaxed mb-4">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Lightbox */}
      {lightboxOpen && post.images && post.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          {post.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (i) => (i - 1 + post.images.length) % post.images.length,
                  );
                }}
                className="absolute left-4 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i + 1) % post.images.length);
                }}
                className="absolute right-4 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={post.images[lightboxIndex]}
            alt={`Image ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIndex + 1} / {post.images.length}
          </div>
        </div>
      )}

      {/* Hero image */}
      <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
        <img
          src={coverImage}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <article className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${post.type === "news" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}
            >
              {post.type === "news" ? (
                <Newspaper className="h-3 w-3" />
              ) : (
                <BookOpen className="h-3 w-3" />
              )}
              {post.type}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateTime(post.created_at)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {post.reading_time} min read
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-700/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-1.5 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 mr-1.5" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`,
                  "_blank",
                )
              }
              className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
          </div>

          {post.type === "news" && post.news_link && (
            <div className="mb-6">
              <a
                href={post.news_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
              >
                Read the full story
              </a>
            </div>
          )}
          {post.content?.trim() ? (
            <div className="prose prose-invert max-w-none">
              {renderContent(post.content)}
            </div>
          ) : null}
          <hr />
          <div className="flex items-center gap-3 mt-8 text-sm text-slate-400 mb-6">
            <span className="font-semibold text-xl">Publisher:</span>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center text-slate-300 text-xs">
              {publisherAvatar ? (
                <img
                  src={publisherAvatar}
                  alt={publisherName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <span className="text-base text-slate-200">{publisherName}</span>
          </div>
          {/* Image gallery */}
          {post.images && post.images.length > 1 && (
            <div className="mt-10 pt-10 border-t border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {post.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => openLightbox(index)}
                    className="relative aspect-video rounded-lg overflow-hidden group"
                  >
                    <img
                      src={img}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                        View
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Comments Section */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="h-6 w-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">
              Comments ({comments.length})
            </h2>
          </div>

          {/* Existing Comments */}
          {loadingComments ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-700 rounded w-1/4" />
                    <div className="h-3 bg-slate-700 rounded w-full" />
                    <div className="h-3 bg-slate-700 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            <div className="space-y-6 mb-10">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {comment.author_name[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-700/30 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600/50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-white">
                          {comment.author_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatCommentDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <div className="border-t border-slate-700/50 pt-8">
            <h3 className="text-lg font-semibold text-white mb-6">
              Leave a Comment
            </h3>

            {commentSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                {commentSuccess}
              </div>
            )}
            {commentError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
                {commentError}
              </div>
            )}

            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Email
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <Input
                      type="email"
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Comment
                </label>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  required
                  rows={4}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-sm leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Your email will not be published. Comments are moderated.
                </p>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? "Submitting..." : "Post Comment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
};

export default PostDetail;
