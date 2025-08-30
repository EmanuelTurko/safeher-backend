import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  favoriteUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema: Schema = new Schema<IFavorite>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    favoriteUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for better performance
FavoriteSchema.index({ userId: 1, favoriteUserId: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1 });
FavoriteSchema.index({ favoriteUserId: 1 });

export default mongoose.model<IFavorite>("Favorite", FavoriteSchema);
