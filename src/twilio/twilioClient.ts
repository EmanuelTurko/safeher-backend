import {Twilio} from 'twilio';

const accountSid:string|undefined = process.env.TWILIO_ACCOUNT_SID;
const authToken:string|undefined = process.env.TWILIO_AUTH_TOKEN;
if(!accountSid || !authToken) {
    console.error("Twilio credentials are not defined in environment variables");
    throw new Error("Twilio credentials are not defined in environment variables");
}
const twilioClient = new Twilio(accountSid as string, authToken as string);

export default twilioClient;