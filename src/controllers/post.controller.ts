import path from "path";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Response } from "express";
import PostModel, { IPost } from "../models/Post.model";
import CommentsModel from "../models/Comments.model";
import NotificationModel from "../models/Notification.model";
import User from "../models/User.model";

export const getPosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`GET post request for userId: ${req.user.id}`);
    const page = parseInt(req.query.page as string) || 1;
    const itemsPerPage = 10;

    const posts = await PostModel.find()
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .populate("user", "fullName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      })
      .sort({ createdAt: -1 })
      .exec();

    const postsWithFlags = posts.map(postDoc => {
      const postObj = postDoc.toObject() as IPost & { isLiked: boolean };

      const likedByMe = postDoc.likes.some(uId => uId.toString() === req.user.id);
      postObj.isLiked = likedByMe;
      postObj.isLiked = likedByMe;
      if (postObj.isAnonymous && postObj.user && typeof postObj.user === "object" && "fullName" in postObj.user) {
        (postObj.user as any).fullName = "Anonymous";
        (postObj.user as any).profilePicture = "";
      }
      return postObj;
    });

    return res.status(200).json(postsWithFlags);
  } catch (error) {
    console.error("Error in getPosts:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createPost = async (req: AuthenticatedRequest, res: Response) => {
  console.log(`POST create-post request for userId: ${req.user.id}`);
  const newPost = new PostModel({
    user: req.user.id,
    body: req.body.body,
    isAnonymous: req.body.isAnonymous || false,
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
    const newComment = new CommentsModel({
      user: req.user.id,
      post: req.params.postId,
      body: req.body.text,
    });

    await newComment.save();

    await PostModel.findByIdAndUpdate(req.params.postId, {
      $push: { comments: newComment._id },
    }).exec();

    await newComment.populate("user", "fullName profilePicture");

    const post = await PostModel.findById(req.params.postId).populate("user", "fullName profilePicture");

    if (post && post.user && (post.user as any)._id) {
      console.log("✅ Creating COMMENT notification for post owner:", (post.user as any)._id.toString());
    }

    if (post && post.user && (post.user as any)._id.toString() !== req.user.id) {
      const user = await User.findById(req.user.id);

      const payload = {
        userId: (post.user as any)._id.toString(),
        fromUser: {
          id: req.user.id,
          fullName: user?.fullName || "Unknown",
          profilePicture: user?.profilePicture || "",
        },
        type: "comment",
        postId: (post._id as mongoose.Types.ObjectId).toString(),
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
      .sort({ createdAt: -1 })
      .exec();

  return res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return res.status(500).json({ message: "Failed to fetch user posts" });
  }
}

export const likePost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const postDoc = await PostModel.findById(postId).populate("user");
    if (!postDoc) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyLiked = postDoc.likes.some(id => id.toString() === userId);
    if (alreadyLiked) {
      await PostModel.findByIdAndUpdate(postId, {
        $pull: { likes: userId },
      }).exec();
      console.log(`👎 User ${userId} removed like from post ${postId}`);
    } else {
      await PostModel.findByIdAndUpdate(postId, {
        $addToSet: { likes: userId },
      }).exec();
      console.log(`👍 User ${userId} liked post ${postId}`);

      if (postDoc.user && postDoc.user._id.toString() !== userId) {
        const user = await User.findById(userId);
        const payload = {
          userId: (postDoc.user as any)._id.toString(),
          fromUser: {
            id: userId,
            fullName: user?.fullName || "Unknown",
            profilePicture: user?.profilePicture || "",
          },
          type: "like",
          postId: (postDoc._id as mongoose.Types.ObjectId).toString(),
          createdAt: new Date(),
          read: false,
        };
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

    const updatedPostDoc = await PostModel.findById(postId)
      .populate("user", "fullName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      })
      .exec();

    if (!updatedPostDoc) {
      return res.status(404).json({ message: "Post not found after update" });
    }

    const updatedPostObj = updatedPostDoc.toObject() as IPost & { isLiked: boolean };
    updatedPostObj.isLiked = updatedPostDoc.likes.some(id => id.toString() === userId);

    return res.status(200).json(updatedPostObj);
  } catch (error) {
    console.error("❌ Error liking/unliking post:", error);
    return res.status(500).json({ message: "Failed to like/unlike post" });
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

    const postDoc = await PostModel.findById(postId)
      .populate("user", "fullName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      })
      .exec();

    if (!postDoc) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postObj = postDoc.toObject() as IPost & { isLiked: boolean };
    const likedByMe = postDoc.likes.some(uId => uId.toString() === req.user.id);
    postObj.isLiked = likedByMe;

    return res.status(200).json(postObj);
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({ message: "Failed to fetch post" });
  }
}
