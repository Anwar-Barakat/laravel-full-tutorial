# Practice 03 — Posts Feed (RTK Query)

Real-world social feed using `createApi` with full CRUD + comments.

---

## Scenario

Build a blog/social feed API slice.
Users can read posts, create posts, like posts, and add comments.

---

## Types

```ts
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
```

---

## Requirements

### Endpoints
1. `getPosts` — GET /posts — tag: `{ type: "Post", id: "LIST" }`
2. `getPostById` — GET /posts/:id — tag: `{ type: "Post", id }`
3. `createPost` — POST /posts — invalidates LIST
4. `deletePost` — DELETE /posts/:id — invalidates item + LIST
5. `likePost` — POST /posts/:id/like — invalidates the specific post item
6. `getComments` — GET /posts/:id/comments — tag: `{ type: "Comment", id: postId }`
7. `addComment` — POST /posts/:id/comments — invalidates Comment tag for that post

### Components to write
8. `PostList` — uses `useGetPostsQuery` with polling every 60s
9. `CreatePostForm` — uses `useCreatePostMutation`
10. `PostDetail` — uses `useGetPostByIdQuery` + `useGetCommentsQuery` + like button

---

## Expected Usage

```ts
// PostList
const { data: posts, isLoading } = useGetPostsQuery(undefined, {
    pollingInterval: 60_000,
})

// CreatePost
const [createPost, { isLoading, isSuccess }] = useCreatePostMutation()
await createPost({ title, body }).unwrap()

// Like a post — only refetches that one post, not the whole list
const [likePost] = useLikePostMutation()
await likePost(post.id).unwrap()

// Comments — separate cache from posts
const { data: comments } = useGetCommentsQuery(postId)
const [addComment] = useAddCommentMutation()
await addComment({ post_id: postId, body }).unwrap()
```

---

## Hints

- Use **two** `tagTypes`: `["Post", "Comment"]`
- `likePost` only invalidates `{ type: "Post", id }` — not the LIST (avoids full refetch)
- `getComments` and `addComment` use `"Comment"` tag — separate from `"Post"` tag
- Store setup: add `postsApiSlice.reducer` + `postsApiSlice.middleware` to the store
