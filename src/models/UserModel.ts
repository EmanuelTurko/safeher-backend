import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    idPhotoUrl: { type: String },
    token : { type: [String], default: [] },
}, { timestamps: true });

export default mongoose.model('User', userSchema);

