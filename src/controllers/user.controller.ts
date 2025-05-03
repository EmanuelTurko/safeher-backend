import { Request, Response } from "express";
import User from "../models/User.model";
import fs from "fs";
import path from "path";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

// Get user profile
export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Returning all relevant fields
    res.status(200).json({
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      birthDate: user.birthDate,
      idPhotoUrl: user.idPhotoUrl,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { fullName, profilePicture, phoneNumber, email } = req.body; // Removed birthDate

    if (req.user.id !== userId) {
      res.status(403).json({ message: "Not authorized to update this profile" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (fullName) user.fullName = fullName;
    if (profilePicture) user.profilePicture = profilePicture;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (email) user.email = email;

    // Check if email is unique
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        res.status(400).json({ message: "Email already in use" });
        return;
      }
    }

    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId) {
      res.status(403).json({ message: "Not authorized to update this profile" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const filePath = req.file.path;
    const fileName = path.basename(filePath);
    const baseUrl = process.env.BASE_URL || "http://localhost:3001";
    const imageUrl = `${baseUrl}/profile-pictures/${fileName}`;

    const user = await User.findById(userId);
    if (!user) {
      fs.unlinkSync(filePath); // Remove the file if user doesn't exist
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Remove old profile picture if exists
    if (user.profilePicture) {
      const oldFilePath = user.profilePicture.replace(`${baseUrl}/`, "");
      const fullOldPath = path.join(__dirname, "..", "..", oldFilePath);

      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
      }
    }

    user.profilePicture = imageUrl;
    await user.save();

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user public profile
export const getUserPublicProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("fullName bio profilePicture");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users - new function
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Exclude password and select only necessary fields for display
    const users = await User.find().select("fullName profilePicture phoneNumber birthDate _id");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Server error" });
  }
};
