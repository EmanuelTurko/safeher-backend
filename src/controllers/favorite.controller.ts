import { Response } from "express";
import Favorite from "../models/Favorite.model";
import User from "../models/User.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import mongoose from "mongoose";

// Add user to favorites
export const addToFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { favoriteUserId } = req.body;
    const currentUserId = req.user.id;

    console.log("=== ADD TO FAVORITES DEBUG ===");
    console.log("Current user ID:", currentUserId);
    console.log("Favorite user ID:", favoriteUserId);

    // Check if user is trying to add themselves
    if (currentUserId === favoriteUserId) {
      console.log("❌ User cannot add themselves to favorites");
      res.status(400).json({
        success: false,
        message: "Cannot add yourself to favorites",
        error: "self_favorite_not_allowed",
      });
      return;
    }

    // Verify the favorite user exists
    const favoriteUser = await User.findById(favoriteUserId);
    if (!favoriteUser) {
      console.log("❌ Favorite user not found:", favoriteUserId);
      res.status(404).json({
        success: false,
        message: "User not found",
        error: "user_not_found",
      });
      return;
    }

    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({
      userId: currentUserId,
      favoriteUserId: favoriteUserId,
    });

    if (existingFavorite) {
      console.log("❌ User already in favorites");
      res.status(409).json({
        success: false,
        message: "User already in favorites",
        error: "already_in_favorites",
      });
      return;
    }

    // Create new favorite
    const favorite = new Favorite({
      userId: currentUserId,
      favoriteUserId: favoriteUserId,
    });

    await favorite.save();
    console.log("✅ User added to favorites successfully");

    res.status(200).json({
      success: true,
      message: "User added to favorites",
      data: {
        favorite: {
          _id: favorite._id,
          userId: currentUserId,
          favoriteUserId: favoriteUserId,
          createdAt: favorite.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error adding to favorites:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
};

// Remove user from favorites
export const removeFromFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { favoriteUserId } = req.params;
    const currentUserId = req.user.id;

    console.log("=== REMOVE FROM FAVORITES DEBUG ===");
    console.log("Current user ID:", currentUserId);
    console.log("Favorite user ID to remove:", favoriteUserId);

    const favorite = await Favorite.findOneAndDelete({
      userId: currentUserId,
      favoriteUserId: favoriteUserId,
    });

    if (!favorite) {
      console.log("❌ Favorite not found");
      res.status(404).json({
        success: false,
        message: "User not found in favorites",
        error: "favorite_not_found",
      });
      return;
    }

    console.log("✅ User removed from favorites successfully");

    res.status(200).json({
      success: true,
      message: "User removed from favorites",
    });
  } catch (error) {
    console.error("❌ Error removing from favorites:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
};

// Get user's favorites list
export const getFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user.id;

    console.log("=== GET FAVORITES DEBUG ===");
    console.log("User ID:", currentUserId);

    const favorites = await Favorite.find({ userId: currentUserId }).populate("favoriteUserId", "fullName profilePicture").sort({ createdAt: -1 });

    console.log("Found favorites:", favorites.length);

    const favoritesData = favorites.map(favorite => ({
      _id: favorite._id,
      favoriteUserId: favorite.favoriteUserId,
      favoriteUser: {
        _id: (favorite.favoriteUserId as any)._id,
        fullName: (favorite.favoriteUserId as any).fullName,
        profilePicture: (favorite.favoriteUserId as any).profilePicture,
      },
      createdAt: favorite.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: favoritesData,
    });
  } catch (error) {
    console.error("❌ Error getting favorites:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
};

// Check if user is in favorites
export const checkFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    console.log("=== CHECK FAVORITE DEBUG ===");
    console.log("Current user ID:", currentUserId);
    console.log("User ID to check:", userId);

    const favorite = await Favorite.findOne({
      userId: currentUserId,
      favoriteUserId: userId,
    });

    const isFavorite = !!favorite;

    console.log("Is favorite:", isFavorite);

    res.status(200).json({
      success: true,
      data: {
        isFavorite,
      },
    });
  } catch (error) {
    console.error("❌ Error checking favorite:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
};
