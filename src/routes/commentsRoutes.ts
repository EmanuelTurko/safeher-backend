import { authMiddleware } from "../middleware/auth.middleware";
import express from "express";
import { Response } from "express";
import CommentsModel from "../models/CommentsModel";
import PostModel from "../models/PostModel";

export const commentRouter = express.Router();

commentRouter.put("/:commentId", authMiddleware, async (req: express.Request, res: Response): Promise<void> => {
  try {
    const commentId = req.params.commentId;
    const userId = (req as any).user.id;
    const { body } = req.body;

    if (!body || body.trim() === "") {
      res.status(400).json({ message: "Comment text cannot be empty" });
      return;
    }

    const comment = await CommentsModel.findById(commentId);

    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    // Verify the user is the owner of the comment
    if (comment.user.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You can only edit your own comments" });
    }

    comment.body = body;
    await comment.save();

    res.status(200).json({ message: "Comment edited successfully" });
  } catch (error) {
    console.error("Error editing comment:", error);
    res.status(500).json({ message: "Failed to edit comment" });
  }
});

commentRouter.delete("/:commentId", authMiddleware, async (req: express.Request, res: Response): Promise<void> => {
  try {
    const commentId = req.params.commentId;
    const userId = (req as any).user.id;

    const comment = await CommentsModel.findById(commentId);

    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    // Verify the user is the owner of the comment
    if (comment.user.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You can only delete your own comments" });
      return;
    }

    // Remove the comment reference from the post
    await PostModel.findByIdAndUpdate(comment.postId, {
      $pull: { comments: commentId },
    });

    // Delete the comment
    await CommentsModel.findByIdAndDelete(commentId);

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

export default commentRouter;
