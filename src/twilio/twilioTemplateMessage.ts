import twilioClient from "./twilioClient";

export const sendSafeCircleTemplateMessage = async (to: string, fullName: string) => {
    try {
        const message = await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER!,
            to: `whatsapp:${to}`,
            contentSid: process.env.TWILIO_TEMPLATE_SID!,
            contentVariables: JSON.stringify({
                '1': fullName,
            }),
        });

        console.log('Message sent successfully:', message.sid);
        return message;
    } catch(error){
        console.error('Error sending message:', error);
        throw error;

        }
    };