import { TextChannel, Message, User, DMChannel } from 'discord.js';

// Waits for a given user's next message and returns it
export async function awaitUserNextMessage(channel: TextChannel | DMChannel, user: User, timeout: number): Promise<Message | undefined> {
    // The filter that'll be used to select response messages
    const messageCollectorFilter = (response: Message) => {
        // Only accept a message from the given user
        return response.author === user;
    };
    // Options that force the collector to finish after one message, or after timeout
    const messageCollectorOptions = { max: 1, time: timeout, errors: ['time'] };

    // Initialize the user's response up here because I have to
    let userResponse;
    try {
        // Wait for the user to respond to the given field's prompt
        userResponse = await channel.awaitMessages(messageCollectorFilter, messageCollectorOptions);
    }
    // If we enter this that means the user didn't provide an answer
    catch {
        // Return undefined
        return;
    }
    // If we're out here that means the user responded to the prompt
    if (!userResponse) {
        throw new Error('A user\'s message was collected with awaitUserNextMessage, but the collector came back undefined.');
    }

    return userResponse.first();
}
