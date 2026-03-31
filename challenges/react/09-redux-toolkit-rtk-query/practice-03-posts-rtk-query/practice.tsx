// ============================================================
// Practice 03 — Posts Feed (RTK Query)
// Read assignment.md first, then fill in each section below.
// Check solution.tsx when done.
// ============================================================

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { configureStore } from "@reduxjs/toolkit";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────
// Post: id, title, body, author, likes, created_at
// Comment: id, post_id, body, author
// CreatePostData: title, body
// CreateCommentData: post_id, body



// ── 1. createApi ──────────────────────────────────────────────
// reducerPath: "postsApi"
// baseQuery: fetchBaseQuery({ baseUrl: "/api", prepareHeaders: inject token })
// tagTypes: ["Post", "Comment"]   ← two separate tag types
//
// endpoints:
//   getPosts       — GET /posts              — providesTags: LIST
//   getPostById    — GET /posts/:id          — providesTags: item id
//   createPost     — POST /posts             — invalidatesTags: LIST
//   deletePost     — DELETE /posts/:id       — invalidatesTags: item + LIST
//   likePost       — POST /posts/:id/like    — invalidatesTags: item only (NOT LIST)
//   getComments    — GET /posts/:id/comments — providesTags: Comment tag for postId
//   addComment     — POST /posts/:id/comments — invalidatesTags: Comment tag for postId



// ── 2. Export auto-generated hooks ───────────────────────────
// useGetPostsQuery, useGetPostByIdQuery
// useCreatePostMutation, useDeletePostMutation, useLikePostMutation
// useGetCommentsQuery, useAddCommentMutation



// ── 3. Store ──────────────────────────────────────────────────
// add postsApiSlice.reducer + postsApiSlice.middleware



// ── 4. PostList component ─────────────────────────────────────
// useGetPostsQuery(undefined, { pollingInterval: 60_000 })
// useDeletePostMutation + useLikePostMutation
// show isFetching indicator



// ── 5. CreatePostForm component ───────────────────────────────
// useCreatePostMutation
// controlled form with title + body
// reset form after success



// ── 6. PostDetail component ───────────────────────────────────
// useGetPostByIdQuery(postId)   — fetch the post
// useGetCommentsQuery(postId)   — fetch its comments (parallel)
// useLikePostMutation           — like button
// useAddCommentMutation         — comment form
