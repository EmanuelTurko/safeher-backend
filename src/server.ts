import dotenv from 'dotenv';
dotenv.config(); 

import app from './app';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 3000;

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log(' MongoDB connected');
    } catch (error) {
        console.error(' MongoDB connection error:', error);
        process.exit(1); 
    }
};
connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



