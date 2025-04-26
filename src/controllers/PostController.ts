import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import PostModel from "../models/PostModel";

export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    const newPost = new PostModel({
      title: req.body.title,
      content: req.body.content,
      user: userId,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: "Error creating post" });
  }
};
