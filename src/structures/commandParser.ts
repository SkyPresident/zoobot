import { Message, TextChannel, DMChannel } from 'discord.js';

// The parsed version of a command given by a user's message
export default class CommandParser {
    // The parsed name of the command that's being used in the message, even if it's not a valid command
    public readonly parsedCommandName: string;
    // The array of text following the command, split by spaces
    public readonly args: string[];
    // The full, uncut string after the command name
    public readonly fullArguments: string;
    // The message as originally sent by the user
    public readonly originalMessage: Message;
    // The channel that the message was sent in
    public readonly channel: TextChannel | DMChannel;
    // The prefix used by the command handler
    public readonly commandPrefix: string;
    // The prefix to give to help commands for display purposes
    public readonly displayPrefix: string;

    // Initialization required the user's message and the prefix to cut out
    constructor(message: Message, prefixUsed: string, displayPrefix: string) {
        // Assign this instance's prefix to that which was supplied
        this.commandPrefix = prefixUsed;

        // Assign the prefix to show in messages
        this.displayPrefix = displayPrefix;
        
        // Remove the message's prefix
        const messageWithoutPrefix = message.content.slice(prefixUsed.length).trim();

        // Get the full string that comes directly after the command name
        this.fullArguments = messageWithoutPrefix.slice(messageWithoutPrefix.indexOf(' '), messageWithoutPrefix.length).trim();

        // Split the message by spaces to get the indiviual command and arguments
        const splitMessage = messageWithoutPrefix.split(' ');

        // Get the command used and remove it from the list of arguments
        // Short-circuit to ensure that even if undefined is returned from the shift method, an empty string will be used
        const commandName = messageWithoutPrefix.split(' ').shift() || '';
        
        // Tranform the command name used to lowercase and assign it to this instance
        this.parsedCommandName = commandName.toLowerCase();
        // Assign the split up message to this instance as the command's supplied arguments
        this.args = splitMessage;
        // Assign the original message to this instance
        this.originalMessage = message;
        // Assign the channel
        this.channel = message.channel as TextChannel | DMChannel;
    }
}