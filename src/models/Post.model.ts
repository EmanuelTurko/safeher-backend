import mongoose, { Document, Schema } from "mongoose";

export interface IPost extends Document {
  user: mongoose.Types.ObjectId;
  body: string;
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isAnonymous?: boolean;
}

const PostSchema: Schema = new Schema<IPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    body: {
      type: String,
      default: "",
    },
    likes: {
      type: [{ type: mongoose.Types.ObjectId, ref: "User" }],
      default: [],
    },
    comments: {
      type: [{ type: mongoose.Types.ObjectId, ref: "Comment" }],
      default: [],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PostSchema.virtual("likeCount").get(function (this: IPost) {
  return this.likes ? this.likes.length : 0;
});

PostSchema.virtual("commentCount").get(function (this: IPost) {
  return this.comments ? this.comments.length : 0;
});

PostSchema.virtual("isLiked").get(function (this: IPost) {
  return false;
});

const Post = mongoose.model<IPost>("Post", PostSchema);
export default Post;
