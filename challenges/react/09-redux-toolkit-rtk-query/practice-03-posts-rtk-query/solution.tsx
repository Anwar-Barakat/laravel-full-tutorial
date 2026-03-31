// ============================================================
// Practice 03 — Posts Feed (RTK Query)
// ============================================================

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { configureStore } from "@reduxjs/toolkit";
import { useState } from "react";

// ============================================================
// Types
// ============================================================

interface Post {
    id:         number;
    title:      string;
    body:       string;
    author:     string;
    likes:      number;
    created_at: string;
}

interface Comment {
    id:      number;
    post_id: number;
    body:    string;
    author:  string;
}

interface CreatePostData {
    title: string;
    body:  string;
}

interface CreateCommentData {
    post_id: number;
    body:    string;
}

// ============================================================
// createApi
// ============================================================

const postsApiSlice = createApi({
    reducerPath: "postsApi",

    baseQuery: fetchBaseQuery({
        baseUrl: "/api",
        prepareHeaders: (headers) => {
            const token = localStorage.getItem("token");
            if (token) headers.set("Authorization", `Bearer ${token}`);
            headers.set("Accept", "application/json");
            return headers;
        },
    }),

    // Two separate tag types — posts and comments are independent caches
    tagTypes: ["Post", "Comment"],

    endpoints: (builder) => ({

        // ── GET /posts ────────────────────────────────────────
        getPosts: builder.query<Post[], void>({
            query:        () => "/posts",
            providesTags: [{ type: "Post", id: "LIST" }],
        }),

        // ── GET /posts/:id ────────────────────────────────────
        getPostById: builder.query<Post, number>({
            query:        (id) => `/posts/${id}`,
            providesTags: (_result, _error, id) => [{ type: "Post", id }],
        }),

        // ── POST /posts ───────────────────────────────────────
        createPost: builder.mutation<Post, CreatePostData>({
            query:          (body) => ({ url: "/posts", method: "POST", body }),
            invalidatesTags: [{ type: "Post", id: "LIST" }],
            // only invalidates LIST — existing posts don't need to refetch
        }),

        // ── DELETE /posts/:id ─────────────────────────────────
        deletePost: builder.mutation<void, number>({
            query:          (id) => ({ url: `/posts/${id}`, method: "DELETE" }),
            invalidatesTags: (_result, _error, id) => [
                { type: "Post", id },
                { type: "Post", id: "LIST" },
            ],
        }),

        // ── POST /posts/:id/like ──────────────────────────────
        likePost: builder.mutation<Post, number>({
            query:          (id) => ({ url: `/posts/${id}/like`, method: "POST" }),
            // only invalidate the specific post — NOT the LIST
            // avoids refetching the whole feed just for a like count update
            invalidatesTags: (_result, _error, id) => [{ type: "Post", id }],
        }),

        // ── GET /posts/:id/comments ───────────────────────────
        getComments: builder.query<Comment[], number>({
            query:        (postId) => `/posts/${postId}/comments`,
            // uses "Comment" tag — separate cache from "Post"
            providesTags: (_result, _error, postId) => [
                { type: "Comment", id: postId },
            ],
        }),

        // ── POST /posts/:id/comments ──────────────────────────
        addComment: builder.mutation<Comment, CreateCommentData>({
            query: ({ post_id, body }) => ({
                url:    `/posts/${post_id}/comments`,
                method: "POST",
                body:   { body },
            }),
            // invalidates comments for that specific post only
            invalidatesTags: (_result, _error, { post_id }) => [
                { type: "Comment", id: post_id },
            ],
        }),

    }),
});

// Auto-generated hooks
export const {
    useGetPostsQuery,
    useGetPostByIdQuery,
    useCreatePostMutation,
    useDeletePostMutation,
    useLikePostMutation,
    useGetCommentsQuery,
    useAddCommentMutation,
} = postsApiSlice;

// ============================================================
// Store
// ============================================================

export const store = configureStore({
    reducer: {
        [postsApiSlice.reducerPath]: postsApiSlice.reducer,
    },
    middleware: (getDefault) =>
        getDefault().concat(postsApiSlice.middleware),
});

// ============================================================
// Component — PostList
// ============================================================

function PostList() {
    const { data: posts, isLoading, isFetching, isError } =
        useGetPostsQuery(undefined, {
            pollingInterval: 60_000,  // refresh feed every 60s
        });

    const [deletePost]         = useDeletePostMutation();
    const [likePost, { isLoading: isLiking }] = useLikePostMutation();

    if (isLoading) return <div>Loading posts…</div>;
    if (isError)   return <div>Failed to load posts</div>;

    return (
        <div>
            {isFetching && <p className="text-sm text-gray-400">Refreshing…</p>}

            {posts?.map((post) => (
                <div key={post.id} className="border rounded p-4 mb-4">
                    <h2 className="font-bold text-lg">{post.title}</h2>
                    <p className="text-gray-600 text-sm mb-2">by {post.author}</p>
                    <p className="mb-4">{post.body}</p>

                    <div className="flex gap-3">
                        <button
                            onClick={() => likePost(post.id)}
                            disabled={isLiking}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            ♥ {post.likes}
                        </button>
                        <button
                            onClick={() => deletePost(post.id)}
                            className="text-sm text-red-600 hover:underline"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================
// Component — CreatePostForm
// ============================================================

function CreatePostForm() {
    const [createPost, { isLoading, isSuccess, isError }] =
        useCreatePostMutation();

    const [form, setForm] = useState({ title: "", body: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPost(form).unwrap();
            setForm({ title: "", body: "" });  // reset form on success
            // PostList auto-refetches — invalidatesTags LIST triggers it
        } catch (err) {
            console.error("Create failed:", err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mb-8">
            <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    rows={4}
                />
            </div>
            {isError   && <p className="text-red-600 text-sm">Something went wrong.</p>}
            {isSuccess && <p className="text-green-600 text-sm">Post published!</p>}
            <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? "Publishing…" : "Publish Post"}
            </button>
        </form>
    );
}

// ============================================================
// Component — PostDetail (post + comments)
// ============================================================

function PostDetail({ postId }: { postId: number }) {
    const { data: post,     isLoading: loadingPost }     = useGetPostByIdQuery(postId);
    const { data: comments, isLoading: loadingComments } = useGetCommentsQuery(postId);
    const [addComment, { isLoading: isCommenting }]      = useAddCommentMutation();
    const [likePost]                                      = useLikePostMutation();

    const [commentText, setCommentText] = useState("");

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addComment({ post_id: postId, body: commentText }).unwrap();
            setCommentText("");
            // only the comments for this post refetch — not the post list
        } catch (err) {
            console.error("Comment failed:", err);
        }
    };

    if (loadingPost) return <div>Loading…</div>;

    return (
        <div>
            {/* Post */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">{post?.title}</h1>
                <p className="text-gray-600 text-sm mb-4">by {post?.author}</p>
                <p className="mb-4">{post?.body}</p>
                <button
                    onClick={() => likePost(postId)}
                    className="text-blue-600 hover:underline"
                >
                    ♥ {post?.likes} likes
                    {/* only this post refetches — not the whole list */}
                </button>
            </div>

            {/* Comments */}
            <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Comments</h3>

                {loadingComments ? (
                    <p>Loading comments…</p>
                ) : (
                    comments?.map((comment) => (
                        <div key={comment.id} className="mb-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm font-medium">{comment.author}</p>
                            <p className="text-sm">{comment.body}</p>
                        </div>
                    ))
                )}

                {/* Add comment form */}
                <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment…"
                        className="flex-1 border rounded px-3 py-2 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isCommenting || !commentText}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                    >
                        {isCommenting ? "…" : "Post"}
                    </button>
                </form>
            </div>
        </div>
    );
}

/*
================================================================
TIPS
================================================================

TWO TAG TYPES — POST AND COMMENT
-----------------------------------
• Post and Comment are independent — liking a post shouldn't refetch comments
• tagTypes: ["Post", "Comment"] — declare both
• getComments providesTags "Comment" — completely separate from "Post" cache
• addComment invalidatesTags "Comment" for that postId — only that post's comments refetch

LIKEPOST — TARGETED INVALIDATION
-----------------------------------
• invalidates only { type: "Post", id } — NOT the LIST
• only the liked post refetches — not the whole feed
• important for performance: don't refetch 50 posts just for a like count

TWO QUERIES IN ONE COMPONENT
------------------------------
• useGetPostByIdQuery(postId) — fetches the post
• useGetCommentsQuery(postId) — fetches its comments
• both run in parallel — React renders when each resolves
• each has its own cache key — they don't interfere

RESET FORM AFTER SUCCESS
--------------------------
• setForm({ title: "", body: "" }) after .unwrap() succeeds
• isSuccess flag from RTK Query for the success message
• clear the text input after adding a comment

POLLING ON FEED
----------------
• pollingInterval: 60_000 on getPosts — new posts appear automatically
• users see fresh content without refreshing the page

================================================================
*/
