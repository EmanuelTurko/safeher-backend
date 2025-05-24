import twilioClient from "./twilioClient";

export const sendEmergencyMessage = async (
    to: string,
    fullName: string,
    latitude: number,
    longitude: number,
    address: string
) => {
    // Try to get zoom level from environment variable, default to 18 if not set.
    // Try to get a direction from the recipient's phone to the emergency location.
    const zoomLevel = 18;
    const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&zoom=${zoomLevel}`;

    const body = `🚨 Emergency Alert!
${fullName} has activated the SOS signal and might be in danger.

📍 Location: ${address}
🔗 ${mapsLink}`;

    return await twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${to}`,
        body
    });
};