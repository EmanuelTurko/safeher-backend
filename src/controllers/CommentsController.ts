import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import CommentsModel from "../models/CommentsModel";

export const createComment = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    const newComment = new CommentsModel({
      postId: req.params.postId,
      body: req.body.body,
      user: userId,
    });

    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Error creating comment" });
  }
};
