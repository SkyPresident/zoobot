import { TextChannel, Message, DMChannel, APIMessage } from 'discord.js';

// Sends a message in a channel, but has generic error handling so it doesn't have to be repeated 1,000,000 times throughout code.
export async function betterSend(channel: TextChannel | DMChannel, content: string | APIMessage, lifetime?: number): Promise<Message | undefined> {
    let message: Message;
    try {
        message = await channel.send(content);
    }
    catch (error) {
        console.error('Error trying to send message.', error);
        return;
    }

    // If a lifetime amount was given, try to delete the message eventually
    if (lifetime) {
        setTimeout(() => {
            safeDeleteMessage(message);
        }, lifetime);
    }

    return message;
}

// Deletes a message if the bot is able to do that
export function safeDeleteMessage(message: Message | undefined): boolean {
    if (!message) {
        return false;
    }
    
    if (!message.deletable) {
        return false;
    }

    // Delete the message
    try {
        message.delete();
    }
    catch (error) {
        throw new Error(error)
    }

    return true;
}