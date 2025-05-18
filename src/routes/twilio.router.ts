import express from "express";
export const twilioRouter = express.Router();
import {twilioSendTemplateMessage, twilioSendEmergencyMessage} from "../twilio/twilioController";

twilioRouter.post("/send-template-message", twilioSendTemplateMessage);
twilioRouter.post("/send-emergency-message",twilioSendEmergencyMessage);

