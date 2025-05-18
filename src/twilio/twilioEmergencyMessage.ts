import twilioClient from "./twilioClient";

export const sendEmergencyMessage = async (
    to: string,
    fullName:string,
    address:string,
    latitude:number,
    longitude:number
) => {
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const body = `Emergency Alert! ${fullName} has activated SOS signal and might be in danger *\n
     📍 ${address}\n🔗 ${mapsLink}`;

    return await twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${to}`,
        body
    });
};