import React, { useState, useEffect, useCallback } from "react";
import { Post } from "@/types/post";
import {
  deleteCommentById,
  fetchAllComments,
  fetchPostsByAuthor,
  setCommentApproval,
} from "@/lib/db";
import PostManager from "@/components/PostManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PenSquare,
  RefreshCw,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Check,
  X,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Comment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
  is_approved: boolean;
  posts?: { title: string };
}

interface DashboardProps {
  userId: string;
  onNewPost: () => void;
  onEditPost: (postId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  userId,
  onNewPost,
  onEditPost,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");

  // Comment moderation state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentSearch, setCommentSearch] = useState("");
  const [commentFilter, setCommentFilter] = useState<
    "all" | "pending" | "approved"
  >("all");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const resolveAuthorId = useCallback(async () => {
    return userId;
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const authorId = await resolveAuthorId();
      const posts = await fetchPostsByAuthor(authorId);
      setPosts(posts);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [resolveAuthorId]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await fetchAllComments();
      setComments(data || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (activeTab === "comments") fetchComments();
  }, [activeTab, fetchComments]);

  const handleApproveComment = async (id: string, approve: boolean) => {
    setActioningId(id);
    try {
      await setCommentApproval(id, approve);
      fetchComments();
    } catch (err) {
      console.error("Failed to approve comment:", err);
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteComment = async (id: string) => {
    setActioningId(id);
    try {
      await deleteCommentById(id);
      fetchComments();
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setActioningId(null);
    }
  };

  const filteredComments = comments.filter((c) => {
    const matchesSearch =
      !commentSearch ||
      c.author_name.toLowerCase().includes(commentSearch.toLowerCase()) ||
      c.content.toLowerCase().includes(commentSearch.toLowerCase()) ||
      c.author_email.toLowerCase().includes(commentSearch.toLowerCase());
    const matchesFilter =
      commentFilter === "all" ||
      (commentFilter === "pending" && !c.is_approved) ||
      (commentFilter === "approved" && c.is_approved);
    return matchesSearch && matchesFilter;
  });

  const commentStats = {
    total: comments.length,
    pending: comments.filter((c) => !c.is_approved).length,
    approved: comments.filter((c) => c.is_approved).length,
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-slate-900 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            </div>
            <p className="text-slate-400 ml-[52px]">
              Manage your content and moderate comments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                fetchPosts();
                if (activeTab === "comments") fetchComments();
              }}
              disabled={loading || loadingComments}
              className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              {loading || loadingComments ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              onClick={onNewPost}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20"
            >
              <PenSquare className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-slate-800/50 border border-slate-700/50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "posts" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}
          >
            <PenSquare className="h-4 w-4" />
            Posts
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "comments" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}
          >
            <MessageSquare className="h-4 w-4" />
            Comments
            {commentStats.pending > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                {commentStats.pending}
              </span>
            )}
          </button>
        </div>

        {/* Posts Tab */}
        {activeTab === "posts" && (
          <PostManager
            posts={posts}
            loading={loading}
            onRefresh={fetchPosts}
            onEdit={onEditPost}
          />
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div className="space-y-6">
            {/* Comment Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Total Comments",
                  value: commentStats.total,
                  color: "blue",
                },
                {
                  label: "Pending Review",
                  value: commentStats.pending,
                  color: "amber",
                },
                {
                  label: "Approved",
                  value: commentStats.approved,
                  color: "emerald",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <MessageSquare
                      className={`h-5 w-5 text-${stat.color}-400`}
                    />
                    <span className="text-2xl font-bold text-white">
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search comments..."
                  value={commentSearch}
                  onChange={(e) => setCommentSearch(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-1">
                {(["all", "pending", "approved"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCommentFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${commentFilter === f ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment List */}
            {loadingComments ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 animate-pulse"
                  >
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-700 rounded w-1/4" />
                        <div className="h-3 bg-slate-700 rounded w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No comments found
                </h3>
                <p className="text-slate-400 text-sm">
                  {commentSearch
                    ? "Try a different search term"
                    : "No comments have been submitted yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${comment.is_approved ? "border-slate-700/50" : "border-amber-500/20 bg-amber-500/[0.02]"}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {comment.author_name[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {comment.author_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {comment.author_email}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${comment.is_approved ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}
                          >
                            {comment.is_approved ? "Approved" : "Pending"}
                          </span>
                        </div>
                        {comment.posts?.title && (
                          <p className="text-xs text-slate-500 mb-2">
                            on:{" "}
                            <span className="text-slate-400">
                              {comment.posts.title}
                            </span>
                          </p>
                        )}
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!comment.is_approved ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleApproveComment(comment.id, true)
                            }
                            disabled={actioningId === comment.id}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg h-9 w-9"
                            title="Approve"
                          >
                            {actioningId === comment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleApproveComment(comment.id, false)
                            }
                            disabled={actioningId === comment.id}
                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg h-9 w-9"
                            title="Unapprove"
                          >
                            {actioningId === comment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={actioningId === comment.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg h-9 w-9"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
