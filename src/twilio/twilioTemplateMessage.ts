import twilioClient from "./twilioClient";

export const sendSafeCircleTemplateMessage = async (to: string, fullName: string) => {
    try {
        // On sandbox mode contentTemplates cannot be used, so we send a regular message.
        // The 'from' number is set to the sandbox number.
        // The recipient needs to send join possibly-hunt every 3 days to keep the sandbox active.
        const message = await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER!}`,
            to: `whatsapp:${to}`,
            body: `Hey! ${fullName} has added you to their safe circle. If they need help, you will be notified.`,
        });
        console.log('from', process.env.TWILIO_WHATSAPP_NUMBER);
        console.log('Message sent successfully:', message.sid);
        return message;
    } catch(error){
        console.error('Error sending message:', error);
        throw error;

        }
    };