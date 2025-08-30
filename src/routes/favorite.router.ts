import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { addToFavorites, removeFromFavorites, getFavorites, checkFavorite } from "../controllers/favorite.controller";

const favoriteRouter = express.Router();

// Add user to favorites
favoriteRouter.post("/", authMiddleware, (req, res) => addToFavorites(req as AuthenticatedRequest, res));

// Remove user from favorites
favoriteRouter.delete("/:favoriteUserId", authMiddleware, (req, res) => removeFromFavorites(req as AuthenticatedRequest, res));

// Get user's favorites list
favoriteRouter.get("/", authMiddleware, (req, res) => getFavorites(req as AuthenticatedRequest, res));

// Check if user is in favorites
favoriteRouter.get("/check/:userId", authMiddleware, (req, res) => checkFavorite(req as AuthenticatedRequest, res));

export default favoriteRouter;
