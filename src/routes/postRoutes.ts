
import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { createPost } from "../controllers/PostController";
import { createComment } from "../controllers/CommentsController";

export const postRouter = express.Router();

// Create a new post
postRouter.post("/", authMiddleware, createPost);

// Add a comment to a post
postRouter.post("/:postId/comment", authMiddleware, createComment);

export default postRouter;
