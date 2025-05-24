import { Request, Response } from 'express';
import userModel from "../models/User.model";
import {sendSafeCircleTemplateMessage} from "./twilioTemplateMessage";
import {sendEmergencyMessage} from "./twilioEmergencyMessage";

interface DispatcherResult{
    fullName: string;
    results: {
        contactPhoneNumber: string;
        status: "sent" | "failed";
        sid?: string;
        error?: string;
    }[],
}


type SendFunction = (to:string, fullName: string, ...args: any[]) => Promise<{sid:string}>;

const twilioDispatcher = async (
    userPhoneNumber: string,
    sendFunction: SendFunction,
    ...sendArgs: any[]
): Promise<DispatcherResult> => {
    const user = await userModel.findOne({phoneNumber: userPhoneNumber});
    if(!user) {
        throw new Error("USER_NOT_FOUND");
    }
    const {fullName, safeCircleContacts} = user;
    if (!safeCircleContacts || safeCircleContacts.length === 0) {
        throw new Error("NO_CONTACTS_FOUND");
    }
    const phoneNumbers = safeCircleContacts.map(contact => {
        if (typeof contact === 'string') return contact;
        if (typeof contact === 'object' && 'phoneNumber' in contact) return contact.phoneNumber;
        return null;
    }).filter((phone): phone is string => typeof phone === 'string');

    const results: DispatcherResult["results"] = [];

    for(const contactPhoneNumber of phoneNumbers) {
        try{
            const result = await sendFunction(contactPhoneNumber, fullName, ...sendArgs);
            results.push({contactPhoneNumber, status: "sent", sid: result.sid});
        } catch (error: any) {
            results.push({contactPhoneNumber, status: "failed", error: error.message});

        }
    }
    return {fullName, results};
};

export const twilioSendTemplateMessage = async (req: Request, res: Response) => {
    const {userPhoneNumber} = req.body;
    try {
     const result = await twilioDispatcher(
        userPhoneNumber,
        sendSafeCircleTemplateMessage,
     )
        res.status(200).json({message: "Messages processed", results: result.results});
    } catch (error:any) {
        if(error.message === "USER_NOT_FOUND") {
            res.status(404).json({message: "User not found"});
            return;
        }
        if(error.message === "NO_CONTACTS_FOUND") {
            res.status(400).json({message: "No safe circle contacts found"});
            return;
        }
        console.error("Error sending template message:", error);
        res.status(500).json({message: "Server error"});
        return;
    }
};

export const twilioSendEmergencyMessage = async (req: Request, res: Response) => {
    const {userPhoneNumber, latitude, longitude, address } = req.body;

    if(!userPhoneNumber || !latitude || !longitude || !address) {
        res.status(401).json({message: "Missing required fields"});
        return;
    }

    try {
      const result = await twilioDispatcher(
        userPhoneNumber,
        sendEmergencyMessage,
        latitude,
        longitude,
        address
      );

      res.status(200).json({message: "Messages processed", results: result.results});
    } catch(error:any){
        if(error.message === "USER_NOT_FOUND") {
            res.status(404).json({message: "User not found"});
            return;
        }
        if(error.message === "NO_CONTACTS_FOUND") {
            res.status(400).json({message: "No safe circle contacts found"});
            return;
        }
        console.error("Error sending emergency message:", error);
        res.status(500).json({message: "Server error"});
    }
};