import { Post } from "@/types/post";
const STORAGE_KEYS = {
  posts: "itl1_posts",
  users: "itl1_users",
  comments: "itl1_comments",
  authAccounts: "itl1_auth_accounts",
  session: "itl1_auth_session",
  seedFingerprint: "itl1_seed_fingerprint",
} as const;

export interface LocalUserProfile {
  id: string;
  email: string;
  name?: string;
  birthday?: string;
  created_at: string;
  is_admin?: boolean;
  avatar_url?: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  created_at: string;
}

interface AuthAccount {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
  is_approved: boolean;
}

type SeedPostInput = Partial<Post> & {
  title?: string;
};

type SeedLoadResult = {
  posts: Post[];
  fingerprint: string | null;
};

const isBrowser = typeof window !== "undefined";
let seedInitializationPromise: Promise<void> | null = null;

const sortByNewest = <T extends { created_at: string }>(items: T[]) =>
  [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

const nowIso = () => new Date().toISOString();

const normalizeAssetPath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Keep absolute URLs and data/blob URIs unchanged.
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^data:/i.test(trimmed) ||
    /^blob:/i.test(trimmed)
  ) {
    return trimmed;
  }

  // Treat relative paths as assets inside /public.
  return trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed.replace(/^\.?\//, "")}`;
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const estimateReadingTime = (content: string, type: Post["type"]) => {
  if (type === "news") return 1;
  return Math.max(
    1,
    Math.ceil(content.split(/\s+/).filter(Boolean).length / 200),
  );
};

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

async function loadSeedPosts(): Promise<SeedLoadResult> {
  if (!isBrowser) return { posts: [], fingerprint: null };

  try {
    const urls = ["/seed-posts.json", "./seed-posts.json"];
    let data: unknown = [];
    let rawSeed = "";

    for (const url of urls) {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;

      rawSeed = await response.text();
      data = JSON.parse(rawSeed);
      break;
    }

    if (!Array.isArray(data)) {
      return { posts: [], fingerprint: rawSeed.trim() || null };
    }

    const posts = data
      .filter((entry): entry is SeedPostInput => {
        return (
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as SeedPostInput).title === "string"
        );
      })
      .map((entry) => {
        const title = entry.title?.trim() || "Untitled Post";
        const type: Post["type"] = entry.type === "news" ? "news" : "article";
        const content = typeof entry.content === "string" ? entry.content : "";
        const slug =
          typeof entry.slug === "string" && entry.slug.trim()
            ? entry.slug
            : toSlug(title);

        return {
          id:
            typeof entry.id === "string" && entry.id.trim()
              ? entry.id
              : generateId(),
          created_at:
            typeof entry.created_at === "string" && entry.created_at
              ? entry.created_at
              : nowIso(),
          updated_at:
            typeof entry.updated_at === "string" && entry.updated_at
              ? entry.updated_at
              : nowIso(),
          title,
          content,
          news_link:
            typeof entry.news_link === "string" ? entry.news_link : null,
          type,
          images: Array.isArray(entry.images)
            ? entry.images
                .filter((image): image is string => typeof image === "string")
                .map(normalizeAssetPath)
            : [],
          is_hidden: Boolean(entry.is_hidden),
          author_id:
            typeof entry.author_id === "string" ? entry.author_id : null,
          users:
            entry.users && typeof entry.users === "object"
              ? {
                  name:
                    typeof entry.users.name === "string"
                      ? entry.users.name
                      : null,
                  email:
                    typeof entry.users.email === "string"
                      ? entry.users.email
                      : null,
                  avatar_url:
                    typeof entry.users.avatar_url === "string"
                      ? normalizeAssetPath(entry.users.avatar_url)
                      : null,
                }
              : null,
          slug,
          reading_time:
            typeof entry.reading_time === "number" && entry.reading_time > 0
              ? entry.reading_time
              : estimateReadingTime(content, type),
          excerpt:
            typeof entry.excerpt === "string" && entry.excerpt.trim()
              ? entry.excerpt
              : (type === "news"
                  ? (typeof entry.news_link === "string" && entry.news_link) ||
                    "External news link"
                  : content.slice(0, 160)) || "No excerpt available.",
        };
      });

    return { posts, fingerprint: rawSeed.trim() || null };
  } catch {
    return { posts: [], fingerprint: null };
  }
}

async function ensurePostsInitialized() {
  if (!isBrowser) return;

  let existingPosts: Post[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.posts);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existingPosts = parsed as Post[];
    }
  } catch {
    existingPosts = [];
  }

  const existingFingerprint = localStorage.getItem(
    STORAGE_KEYS.seedFingerprint,
  );

  if (!seedInitializationPromise) {
    seedInitializationPromise = (async () => {
      const { posts: seedPosts, fingerprint } = await loadSeedPosts();

      if (seedPosts.length === 0) {
        if (existingPosts.length === 0) {
          writeStorage(STORAGE_KEYS.posts, []);
        }
        return;
      }

      const shouldSync =
        existingPosts.length === 0 ||
        !existingFingerprint ||
        existingFingerprint !== fingerprint;

      if (!shouldSync) return;

      const seedIds = new Set(seedPosts.map((p) => p.id));
      const localOnlyPosts = existingPosts.filter((p) => !seedIds.has(p.id));

      savePosts([...seedPosts, ...localOnlyPosts]);

      if (fingerprint) {
        localStorage.setItem(STORAGE_KEYS.seedFingerprint, fingerprint);
      } else {
        localStorage.removeItem(STORAGE_KEYS.seedFingerprint);
      }
    })().finally(() => {
      seedInitializationPromise = null;
    });
  }

  await seedInitializationPromise;
}

function getUsers(): LocalUserProfile[] {
  return readStorage<LocalUserProfile[]>(STORAGE_KEYS.users, []);
}

function saveUsers(users: LocalUserProfile[]) {
  writeStorage(STORAGE_KEYS.users, users);
}

async function getPosts(): Promise<Post[]> {
  await ensurePostsInitialized();
  return readStorage<Post[]>(STORAGE_KEYS.posts, []);
}

function savePosts(posts: Post[]) {
  writeStorage(STORAGE_KEYS.posts, sortByNewest(posts));
}

function getComments(): Comment[] {
  return readStorage<Comment[]>(STORAGE_KEYS.comments, []);
}

function saveComments(comments: Comment[]) {
  writeStorage(STORAGE_KEYS.comments, sortByNewest(comments));
}

function hydratePost(post: Post): Post {
  const users = getUsers();
  const author = post.author_id
    ? users.find((u) => u.id === post.author_id)
    : undefined;

  return {
    ...post,
    users: author
      ? {
          name: author.name || null,
          email: author.email,
          avatar_url: author.avatar_url ?? null,
        }
      : post.users || null,
  };
}

export function getCurrentSessionUser(): SessionUser | null {
  return readStorage<SessionUser | null>(STORAGE_KEYS.session, null);
}

function setCurrentSessionUser(user: SessionUser | null) {
  if (!isBrowser) return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.session);
    return;
  }
  writeStorage(STORAGE_KEYS.session, user);
}

export async function signInLocal(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readStorage<AuthAccount[]>(STORAGE_KEYS.authAccounts, []);
  const account = accounts.find(
    (a) => a.email === normalizedEmail && a.password === password,
  );

  if (!account) {
    throw new Error("Invalid email or password.");
  }

  const session: SessionUser = {
    id: account.id,
    email: account.email,
    created_at: account.created_at,
  };
  setCurrentSessionUser(session);
  return session;
}

export async function signUpLocal(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readStorage<AuthAccount[]>(STORAGE_KEYS.authAccounts, []);
  const existing = accounts.find((a) => a.email === normalizedEmail);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const createdAt = nowIso();
  const account: AuthAccount = {
    id: generateId(),
    email: normalizedEmail,
    password,
    created_at: createdAt,
  };

  writeStorage(STORAGE_KEYS.authAccounts, [account, ...accounts]);
  await createUser(account.id, account.email);

  const session: SessionUser = {
    id: account.id,
    email: account.email,
    created_at: account.created_at,
  };
  setCurrentSessionUser(session);
  return session;
}

export async function signInWithMagicLocal(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readStorage<AuthAccount[]>(STORAGE_KEYS.authAccounts, []);
  let account = accounts.find((a) => a.email === normalizedEmail);

  if (!account) {
    account = {
      id: generateId(),
      email: normalizedEmail,
      password: "",
      created_at: nowIso(),
    };
    writeStorage(STORAGE_KEYS.authAccounts, [account, ...accounts]);
    await createUser(account.id, account.email);
  }

  const session: SessionUser = {
    id: account.id,
    email: account.email,
    created_at: account.created_at,
  };
  setCurrentSessionUser(session);
  return session;
}

export async function signOutLocal() {
  setCurrentSessionUser(null);
}

export async function fetchPosts() {
  const posts = await getPosts();
  return sortByNewest(posts.filter((p) => !p.is_hidden)).map(hydratePost);
}

export async function fetchPostById(id: string) {
  const posts = await getPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) throw new Error("Post not found");
  return hydratePost(post);
}

export async function fetchPostBySlug(slug: string) {
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug && !p.is_hidden);
  if (!post) throw new Error("Post not found");
  return hydratePost(post);
}

export async function createPost(
  post: Omit<Post, "id" | "updated_at" | "created_at"> & {
    created_at?: string;
  },
) {
  const posts = await getPosts();
  const timestamp = post.created_at ?? nowIso();
  const created: Post = {
    ...post,
    id: generateId(),
    created_at: timestamp,
    updated_at: nowIso(),
  };
  savePosts([created, ...posts]);
  return hydratePost(created);
}

export async function updatePost(id: string, updates: Partial<Post>) {
  const posts = await getPosts();
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Post not found");

  const updated: Post = {
    ...posts[index],
    ...updates,
    id,
    updated_at: nowIso(),
  };
  posts[index] = updated;
  savePosts(posts);
  return hydratePost(updated);
}

export async function deletePost(id: string) {
  const posts = await getPosts();
  const next = posts.filter((p) => p.id !== id);
  savePosts(next);
}

export async function togglePostVisibility(id: string, isHidden: boolean) {
  return updatePost(id, { is_hidden: isHidden });
}

export async function fetchAllPosts() {
  const posts = await getPosts();
  return sortByNewest(posts).map(hydratePost);
}

export async function searchPosts(query: string) {
  const q = query.trim().toLowerCase();
  const posts = await getPosts();
  return sortByNewest(
    posts.filter(
      (p) =>
        !p.is_hidden &&
        (p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q)),
    ),
  ).map(hydratePost);
}

export async function createUser(id: string, email: string, name?: string) {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const byId = users.find((u) => u.id === id);
  if (byId) return byId;

  const byEmail = users.find((u) => u.email === normalizedEmail);
  if (byEmail) return byEmail;

  const created: LocalUserProfile = {
    id,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    created_at: nowIso(),
    is_admin: false,
    avatar_url: null,
  };

  saveUsers([created, ...users]);
  return created;
}

export async function fetchUser(id: string) {
  const user = getUsers().find((u) => u.id === id);
  if (!user) throw new Error("User not found");
  return user;
}

export async function fetchUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUsers().find((u) => u.email === normalizedEmail);
  if (!user) throw new Error("User not found");
  return user;
}

export async function deleteUserAccount(id: string) {
  const users = getUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return;

  saveUsers(users.filter((u) => u.id !== id));

  const accounts = readStorage<AuthAccount[]>(STORAGE_KEYS.authAccounts, []);
  writeStorage(
    STORAGE_KEYS.authAccounts,
    accounts.filter((a) => a.id !== id),
  );

  const posts = await getPosts();
  savePosts(posts.filter((p) => p.author_id !== id));

  const comments = getComments();
  saveComments(comments.filter((c) => c.author_email !== target.email));

  const session = getCurrentSessionUser();
  if (session?.id === id) {
    setCurrentSessionUser(null);
  }
}

export async function updateUserProfile(
  id: string,
  updates: {
    name?: string;
    birthday?: string | null;
    email?: string;
    avatar_url?: string | null;
  },
) {
  const users = getUsers();
  let index = users.findIndex((u) => u.id === id);

  if (index === -1 && updates.email) {
    const normalizedEmail = updates.email.trim().toLowerCase();
    index = users.findIndex((u) => u.email === normalizedEmail);
  }

  if (index === -1) {
    const created = await createUser(
      id,
      updates.email || `user-${id}@local`,
      updates.name,
    );
    return updateUserProfile(created.id, updates);
  }

  const current = users[index];
  const updated: LocalUserProfile = {
    ...current,
    name: updates.name !== undefined ? updates.name : current.name,
    birthday:
      updates.birthday !== undefined
        ? updates.birthday || undefined
        : current.birthday,
    email: updates.email ? updates.email.trim().toLowerCase() : current.email,
    avatar_url:
      updates.avatar_url !== undefined
        ? updates.avatar_url
        : current.avatar_url,
  };

  users[index] = updated;
  saveUsers(users);

  const session = getCurrentSessionUser();
  if (session?.id === updated.id) {
    setCurrentSessionUser({ ...session, email: updated.email });
  }

  return updated;
}

export async function updateUserAdminByEmail(email: string, isAdmin: boolean) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getUsers();
  const index = users.findIndex((u) => u.email === normalizedEmail);
  if (index === -1) throw new Error("User not found");

  users[index] = { ...users[index], is_admin: isAdmin };
  saveUsers(users);
  return users[index];
}

export async function fetchPostsByAuthor(authorId: string) {
  const posts = await getPosts();
  return sortByNewest(posts.filter((p) => p.author_id === authorId)).map(
    hydratePost,
  );
}

export async function deleteCurrentUserAuth() {
  setCurrentSessionUser(null);
  return {
    success: true,
    message: "User signed out.",
  };
}

export async function fetchComments(postId: string) {
  const comments = getComments();
  return sortByNewest(comments.filter((c) => c.post_id === postId));
}

export async function fetchAllComments() {
  const comments = sortByNewest(getComments());
  const posts = await getPosts();
  return comments.map((comment) => {
    const post = posts.find((p) => p.id === comment.post_id);
    return {
      ...comment,
      posts: post ? { title: post.title } : undefined,
    };
  });
}

export async function submitComment(
  postId: string,
  authorName: string,
  authorEmail: string,
  content: string,
) {
  const comments = getComments();
  const created: Comment = {
    id: generateId(),
    post_id: postId,
    author_name: authorName,
    author_email: authorEmail.trim().toLowerCase(),
    content,
    created_at: nowIso(),
    is_approved: false,
  };
  saveComments([created, ...comments]);
  return created;
}

export async function setCommentApproval(id: string, isApproved: boolean) {
  const comments = getComments();
  const index = comments.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Comment not found");
  comments[index] = { ...comments[index], is_approved: isApproved };
  saveComments(comments);
  return comments[index];
}

export async function deleteCommentById(id: string) {
  const comments = getComments();
  saveComments(comments.filter((c) => c.id !== id));
}
