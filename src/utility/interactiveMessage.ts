import { Message, MessageReaction, PartialUser, User, TextChannel, APIMessage } from 'discord.js';
import { betterSend } from './toolbox';

export class InteractiveMessageHandler {
    // The shared list of every active interactive message to handle
    private static readonly messages = new Map<string, InteractiveMessage>();

    // Takes a user's message reaction and potentially activates an interactive message
    static async handleReaction(messageReaction: MessageReaction, user: User | PartialUser): Promise<undefined> {
        // If the user who reacted to something is a bot, or not a complete user instance
        if (user.bot || !(user instanceof User)) {
            // Ignore the reaction entirely
            return;
        }

        // Check the map of interactive messages for a message with the id of the one reacted to
        const possibleMessage = this.messages.get(messageReaction.message.id);
        // If a message was found
        if (possibleMessage) {
            // Cast the possible message as an interactive message
            const interactiveMessage = possibleMessage as InteractiveMessage;

            try {
                // Activate the message's button that corresponds to the emoji reacted with
                interactiveMessage.buttonPress(messageReaction.emoji.toString(), user);
            }
            catch (error) {
                console.error(`Error activating an interactive message's button.`, error);
            }
        }
    }

    // Adds an existing interactive message to the global collection of them
    static addMessage(message: InteractiveMessage): void {
        this.messages.set(message.getMessage().id, message);
    }

    // Removes an interactive message from the global collection
    static removeMessage(message: InteractiveMessage): void {
        this.messages.delete(message.getMessage().id);
    }
}

// A message with pressable reaction buttons
export class InteractiveMessage {
    // The map of button emojis and their functions
    private readonly buttons: string[];

    // This interactive message's underlying message
    private message: Message;

    // The protected constructor for internally creating an interactive message instance. Only to be called from within methods of the object.
    protected constructor(message: Message, buttons: string[], lifetime: number) {
        this.buttons = buttons;
        this.message = message;

        // Set the message's deactivation timer
        setTimeout(() => {
            try {
                this.deactivate();
            }
            catch (error) {
                console.error(`Error trying to deactivate an interactive message.`, error);
            }
        }, lifetime);

        // Add this message to the map of other interactive messages
        InteractiveMessageHandler.addMessage(this);
    }

    getButtons(): string[] { return this.buttons; }

    getMessage(): Message { return this.message; }

    // This class is missing a static init method, which would normally initialize the asynchronous building process and return a completed interactive message.
    // The implementation of the init method is left up to child classes, which might have different parameters and default values for initialization.
    // A simple init method would most likely look something like this, but again, I'm not adding one to this class because it's never meant to be initialized.
    /*
    static async init(channel: TextChannel, content: APIMEssage, buttons: string[], lifetime: number) {
        let message;
        try {
            message = await this.build(content, channel, buttons) as Message;
        }
        catch (error) {
            console.error(`Error trying to build the base message for an interactive message.`, error);
            return;
        }

        const interactiveMessage = new InteractiveMessage(buttons, message, lifetime);

        return interactiveMessage;
    }
    */
    // It should be noted that in subclass implementations of the init method, the constructor of the subclass should be called rather than that of InteractiveMessage.

    // Builder method for initializing an interactive message
    protected static async build(content: APIMessage, channel: TextChannel, buttons: string[]): Promise<Message | undefined> {
        const message = await betterSend(channel, content);

        if (!message) {
            console.error(`Error sending the base message for an interactive message.`);
            return;
        }

        // Iterate over every button's emoji
        for await (const emoji of buttons) {
            try {
                // Add a reaction for every button
                await message.react(emoji);
            }
            catch (error) {
                console.error(`Error trying to add reactions to an interactive message.`, error);
            }
        }

        // Return the resulting message once its reactions have been added
        return message;
    }

    // Activates a button on this message. This does nothing because it's meant to be overridden.
    async buttonPress(button: string, user: User | PartialUser): Promise<void> {
        throw new Error(`A basic interactive button object received a button press. This was probably a mistake. ${button} was pressed by ${user.id}`);
    }

    // Deactivates the interactive message, freeing up space in the global list
    async deactivate(): Promise<void> {
        // Remove the message from the handler's list
        InteractiveMessageHandler.removeMessage(this);
    }
}