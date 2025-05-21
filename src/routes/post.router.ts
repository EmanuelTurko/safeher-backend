import express from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { likePost, createComment, createPost, deletePost, getPosts, getUserPosts, getFavoritePosts, editPost, getPost } from "../controllers/post.controller";

export const postRouter = express.Router();

postRouter.get("/", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`GET posts request for userId: ${authRequest.user.id}`);
  getPosts(authRequest, res);
});

postRouter.post("/", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`POST create-post request for userId: ${authRequest.user.id}`);
  createPost(authRequest, res);
});

postRouter.put("/:postId", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`PUT edit-post request for userId: ${authRequest.user.id}`);
  editPost(authRequest, res);
});

postRouter.delete("/:postId", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`DELETE post request for userId: ${authRequest.user.id}, postId: ${req.params.postId}`);
  deletePost(authRequest, res);
});

postRouter.post("/:postId/like", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`POST like request for userId: ${authRequest.user.id}, postId: ${req.params.postId}`);
  likePost(authRequest, res);
});

postRouter.get("/favorites", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`GET favorite posts request for userId: ${authRequest.user.id}`);
  getFavoritePosts(authRequest, res);
});

postRouter.post("/:postId/comment", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`POST create comment request for userId: ${authRequest.user.id}, postId: ${req.params.postId}`);
  createComment(authRequest, res);
});

postRouter.get("/user/:userId", authMiddleware, (req, res) => {
  console.log(`GET user posts request for userId: ${req.params.userId}`);
  getUserPosts(req as AuthenticatedRequest, res);
});

postRouter.get("/:postId", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  getPost(authRequest, res);
});
