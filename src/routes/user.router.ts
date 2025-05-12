import express from "express";
import { getUserPublicProfile, updateUserProfile, uploadProfilePicture, getAllUsers } from "../controllers/user.controller";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { updateUserSafeCircle } from "../controllers/user.controller"; 
import multer from "multer";
import path from "path";
import fs from "fs";

export const userRouter = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/profile-pictures");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created upload directory:", uploadDir);
}

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// File filter to only allow image uploads
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedFileTypes = /jpeg|jpg|png|gif/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Get all users
userRouter.get("/all", authMiddleware, getAllUsers);

// Update user profile
userRouter.put("/update-profile/:userId", authMiddleware, (req, res) => updateUserProfile(req as AuthenticatedRequest, res));

// Upload profile picture
userRouter.post(
  "/upload-profile-picture/:userId",
  authMiddleware,
  (req: any, res: any, next: any) => {
    upload.single("profilePicture")(req, res, err => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File size exceeds the 5MB limit" });
          }
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else {
          return res.status(400).json({ message: err.message });
        }
      }
      next();
    });
  },
  (req, res) => uploadProfilePicture(req as AuthenticatedRequest, res)
);

// Get public user profile
userRouter.get("/:userId", authMiddleware, (req, res) => {
  console.log(`GET user profile request for userId: ${req.params.userId}`);
  getUserPublicProfile(req, res);
});

userRouter.post("/updateUserSafeCircle", authMiddleware, (req, res) =>
  updateUserSafeCircle(req as AuthenticatedRequest, res)
);
