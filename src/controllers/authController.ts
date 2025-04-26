import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import UserModel from "../models/UserModel";
dotenv.config();


const register = async (req:Request, res:Response) => {
    const fullName = req.body.fullName;
    const email = req.body.email;
    const password = req.body.password;
    const phoneNumber = req.body.phoneNumber;
    const idPhotoUrl = req.body.idPhotoUrl;


    const existingUser = await UserModel.findOne({email: email});
    if (existingUser) {
        res.status(401).json({message: "User already exists"});
        return;
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await UserModel.create({
            fullName: fullName,
            email: email,
            password: hashedPassword,
            phoneNumber: phoneNumber,
            idPhotoUrl: idPhotoUrl
        });
        await user.save();
        console.log("user:", user);
        res.status(200).json({message: "User registered successfully"});
        return;
    } catch (err: any) {
        console.log("error:", err);
        res.status(402).json({message: err.message});
        return;
    }
}

const login = async (req: Request, res: Response) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const user = await UserModel.findOne({ email: email });
        if (!user) {
            res.status(403).json({ message: "Invalid email or password" });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(405).json({ message: "Invalid email or password" });
            return;
        }

        const rand = Math.floor(Math.random() * 1000000000);
        let token = "";

        if (process.env.JWT_SECRET !== undefined) {
            token = jwt.sign(
                { id: user._id, rand: rand },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            user.token.push(token);
            await user.save();
        }

        res.status(200).json({
            token: token,
            user: {
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                idPhotoUrl: user.idPhotoUrl
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}

const authController = {register, login}
export default authController
