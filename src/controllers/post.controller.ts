import path from "path";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Response } from "express";
import PostModel from "../models/Post.model";
import CommentsModel from "../models/Comments.model";
import NotificationModel from "../models/Notification.model";
import User from "../models/User.model";

export const getPosts = async (req: AuthenticatedRequest, res: Response) => {
  console.log(`GET post request for userId: ${req.user.id}`);
  const page = parseInt(req.query.page as string) || 1;
  const itemsPerPage = 10;
  const posts = await PostModel.find()
    .skip((page - 1) * itemsPerPage)
    .limit(itemsPerPage)
    .populate("user", "fullName profilePicture")
    .populate({ path: "comments", populate: ["body", { path: "user", select: "fullName profilePicture" }] })
    .sort({ createdAt: -1 });
  res.status(200).json(posts);
};

export const createPost = async (req: AuthenticatedRequest, res: Response) => {
  console.log(`POST create-post request for userId: ${req.user.id}`);
  const newPost = new PostModel({
    user: req.user.id,
    body: req.body.body,
  });
  await newPost.save();

  res.status(200).json({ message: "Post created successfully", id: newPost._id });
};

export const editPost = async (req: AuthenticatedRequest, res: Response) => {
  console.log(`PUT edit-post request for userId: ${req.user.id}`);
  await PostModel.findByIdAndUpdate(req.params.postId, { body: req.body.body }).exec();

  res.status(200).json({ message: "Post edited successfully" });
};

export const createComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // יצירת אובייקט תגובה חדש
    const newComment = new CommentsModel({
      user: req.user.id,
      post: req.params.postId,
      body: req.body.text,
    });

    await newComment.save();

    // הוספת התגובה לפוסט
    await PostModel.findByIdAndUpdate(req.params.postId, {
      $push: { comments: newComment._id }
    }).exec();

    // טעינת נתוני המשתמש של התגובה
    await newComment.populate("user", "fullName profilePicture");

    // הבאת הפוסט כדי לבדוק אם צריך ליצור התראה
    const post = await PostModel.findById(req.params.postId).populate("user", "fullName profilePicture");

    if (post && post.user && (post.user as any)._id) {
      console.log("✅ Creating COMMENT notification for post owner:", (post.user as any)._id.toString());
    }

    // אם המגיב הוא לא בעל הפוסט – צור התראה
    if (post && post.user && (post.user as any)._id.toString() !== req.user.id) {
      const user = await User.findById(req.user.id);

      const payload = {
        userId: (post.user as any)._id.toString(), // בעל הפוסט
        fromUser: {
          id: req.user.id,
          fullName: user?.fullName || "Unknown",
          profilePicture: user?.profilePicture || "",
        },
        type: "comment",
        postId: (post._id as mongoose.Types.ObjectId).toString(), // הבדל חשוב: post.id עלול להיות undefined
        createdAt: new Date(),
        read: false,
      };

      console.log("📦 Notification Payload (comment):", payload);

      try {
        await NotificationModel.create(payload);
        console.log("✅ Notification created successfully (comment)");
      } catch (notifErr) {
        console.error("❌ Failed to create notification (comment):", notifErr);
      }
    }

    res.status(200).json({
      message: "Comment created successfully",
      data: newComment,
    });
  } catch (error) {
    console.error("❌ Error creating comment:", error);
    res.status(500).json({ message: "Failed to create comment" });
  }
};


export const getUserPosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    console.log(`Fetching posts for userId: ${userId}`);

    const posts = await PostModel.find({ user: userId })
      .populate("user", "fullName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ message: "Failed to fetch user posts" });
  }
};

export const likePost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await PostModel.findById(postId).populate("user");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyLiked = post.likes.some((id) => id.toString() === userId);
    if (alreadyLiked) {
      await PostModel.findByIdAndUpdate(postId, {
        $pull: { likes: userId },
      });
      console.log(`👎 User ${userId} removed like from post ${postId}`);
    } else {
      await PostModel.findByIdAndUpdate(postId, {
        $addToSet: { likes: userId },
      });
      console.log(`👍 User ${userId} liked post ${postId}`);

      // ✅ יצירת התראה רק אם זה לא הלייק של בעל הפוסט
      if (post.user && post.user._id.toString() !== userId) {
        const user = await User.findById(userId);
        const payload = {
          userId: post.user._id.toString(),
          fromUser: {
            id: userId,
            fullName: user?.fullName || "Unknown",
            profilePicture: user?.profilePicture || "",
          },
          type: "like",
          postId: (post._id as mongoose.Types.ObjectId | string).toString(),
          createdAt: new Date(),
          read: false,
        };

        console.log("📦 Notification Payload (like):", payload);

        try {
          await NotificationModel.create(payload);
          console.log("✅ Notification created successfully (like)");
        } catch (notifErr) {
          console.error("❌ Failed to create notification (like):", notifErr);
        }
      } else {
        console.log("ℹ️ Skipping notification: user liked their own post");
      }
    }

    const updatedPost = await PostModel.findById(postId).populate("user", "fullName profilePicture");
    res.status(200).json(updatedPost);

  } catch (error) {
    console.error("❌ Error liking/unliking post:", error);
    res.status(500).json({ message: "Failed to like/unlike post" });
  }
};

export const getFavoritePosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;

    // Find posts where the user has liked
    const favoritePosts = await PostModel.find({ likes: userId })
      .populate("user", "fullName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(favoritePosts);
  } catch (error) {
    console.error("Error fetching favorite posts:", error);
    res.status(500).json({ message: "Failed to fetch favorite posts" });
  }
};

export const deletePost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await PostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own posts" });
    }

    await CommentsModel.deleteMany({ post: postId });

    await PostModel.findByIdAndDelete(postId);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

export const getPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.postId;

    const post = await PostModel.findById(postId)
      .populate("user", "fullName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Failed to fetch post" });
  }
};

