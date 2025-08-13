import { Request, Response } from "express";
import User from "../models/User.model";
import fs from "fs";
import path from "path";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { sendSafeCircleTemplateMessage } from "../twilio/twilioTemplateMessage";
// import {sendWhatsAppMessage} from "../services/whatsapp";

// Update Safe Circle
export const updateUserSafeCircle = async (req: Request, res: Response): Promise<void> => {
  console.log("✅ updateUserSafeCircle called");

  try {
    const { safeCircle } = req.body;

    if (!Array.isArray(safeCircle) || !safeCircle.every((contact: any) => typeof contact.name === "string" && typeof contact.phoneNumber === "string")) {
      res.status(400).json({ message: "Invalid contacts format" });
      return;
    }

    const userId = (req as any).user?.id || req.body.userId;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existingContacts = user.safeCircleContacts || [];

    // ממפה את המספרים החדשים לצורך השוואה
    const newNumbers = new Set(safeCircle.map(c => normalizePhone(c.phoneNumber)));

    // סינון אנשי קשר קיימים שלא נמחקו
    const preserved = existingContacts.filter(c => newNumbers.has(normalizePhone(c.phoneNumber)));

    // סינון אנשי קשר שהתווספו חדשים
    const toAdd = safeCircle.filter(c => !preserved.some(p => normalizePhone(p.phoneNumber) === normalizePhone(c.phoneNumber)));

    for (const contact of toAdd) {
      try {
        await sendSafeCircleTemplateMessage(contact.phoneNumber, user.fullName);
        console.log(`Template message sent at ${contact.phoneNumber}`);
      } catch (error) {
        console.error(`Failed to send template message at ${contact.phoneNumber}:`, error);
      }
    }
    // שילוב – מה שכבר היה ונשאר + מה שהתווסף
    user.safeCircleContacts = [...preserved, ...toAdd];

    await user.save();

    console.log("Updated safeCircleContacts:", user.safeCircleContacts);
    res.status(200).json({ message: "Safe circle updated successfully" });
  } catch (error) {
    console.error("Error updating safe circle:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// פונקציה שמנרמלת מספר טלפון (מסירה רווחים וסוגריים, הופכת 0 ל־+972)
const normalizePhone = (phone: string) => {
  return phone.replace(/[^0-9+]/g, "").replace(/^0/, "+972");
};

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
      city: user.city,
      isHelper: user.isHelper,
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
    const { fullName, profilePicture, phoneNumber, email, city, isHelper } = req.body;

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
    if (typeof isHelper === "boolean") user.isHelper = isHelper;

    // Check if email is unique
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        res.status(400).json({ message: "Email already in use" });
        return;
      }
    }
    if (city) {
      user.city = city;
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

    const user = await User.findById(userId).select("fullName profilePicture city isHelper");

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

// Update helper status
export const updateHelperStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isHelper } = req.body;

    // Check if user is authorized to update this profile
    if (req.user.id !== userId) {
      res.status(403).json({ message: "Not authorized to update this profile" });
      return;
    }

    // Validate input
    if (typeof isHelper !== "boolean") {
      res.status(400).json({ message: "isHelper must be a boolean value" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.isHelper = isHelper;
    await user.save();

    res.status(200).json({
      message: "Helper status updated successfully",
      isHelper: user.isHelper,
    });
  } catch (error) {
    console.error("Error updating helper status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users - updated to include isHelper
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Exclude password and select only necessary fields for display
    const users = await User.find().select("fullName profilePicture phoneNumber birthDate _id city isHelper");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId;
  try {
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};
