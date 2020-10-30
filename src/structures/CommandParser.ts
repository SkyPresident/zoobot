import { Message, TextChannel, DMChannel, User, GuildMember, Guild } from "discord.js";
import { client } from "..";
import getGuildMember from "../discordUtility/getGuildMember";
import { commandHandler } from "./CommandHandler";

export interface Argument {
    text: string,
    user?: User,
    member?: GuildMember
}

// The parsed version of a command given by a user's message
export default class CommandParser {
    // The prefix used by the command handler
    public readonly commandPrefix: string;
    // The prefix to give to help commands for display purposes
    public readonly displayPrefix: string;

    // The parsed name of the command that's being used in the message, even if it's not a valid command
    public readonly commandName: string;
    // The array of arguments following the command
    public readonly arguments: Argument[] = [];
    // The full, uncut string after the command name
    public readonly fullArguments: string;

    // The message as originally sent by the user
    public readonly originalMessage: Message;
    // The channel that the message was sent in
    public readonly channel: TextChannel | DMChannel;
    // The user that sent the original message
    public readonly sender: User;

    // Initialization required the user's message and the prefix to cut out
    constructor(message: Message, prefixUsed: string) {
        // Set prefixes
        this.commandPrefix = prefixUsed;
        this.displayPrefix = commandHandler.getGuildPrefix(message.guild);
        
        // Remove the message's prefix
        const messageWithoutPrefix = message.content.slice(prefixUsed.length).trim();

        // Get the position of the beginning of the message arguments
        const startOfArgs = messageWithoutPrefix.indexOf(" ");
        // If there are no spaces in the message, so no arguments provided
        if (startOfArgs === -1) {
            // Manually assign the full set of arguments as nothing
            this.fullArguments = "";
        }
        // If there are arguments
        else {
            // Get the string of arguments that comes after the first space
            this.fullArguments = messageWithoutPrefix.slice(startOfArgs).trim();
        }

        // Split the incoming message by quotes first
        const splitByQuotes = messageWithoutPrefix.split("\"");

        // Where all arguments of the message will be stored, separated by spaces and quotes
        let splitMessage: string[] = [];
        // Start at the text before the first quote-separation
        for (let i = 0; i < splitByQuotes.length; i += 2) {
            // Split the text by spaces and add it to the split list
            splitMessage.push(...splitByQuotes[i].trim().split(" "));

            // If there's quote argument directly adjacent to this text
            if (i + 1 < splitByQuotes.length) {
                // Add the next set of text as-is
                splitMessage.push(splitByQuotes[i + 1]);
            }
        }

        // Filter out empty strings
        splitMessage = splitMessage.filter(element => {
            return element;
        });

        // Get the command used and remove it from the list of arguments
        // Short-circuit to ensure that even if undefined is returned from the shift method, an empty string will be used
        const commandName = splitMessage.shift() || "";

        // Tranform the command name used to lowercase and assign it to this instance
        this.commandName = commandName.toLowerCase();

        // Iterate and add every text argument of the split up message to the list of arguments
        for (const argument of splitMessage) {
            // Where a specified user would go if this argument can be resolved to one
            let user: User | undefined;
            // Only try to resolve user ids from arguments long enough to contain them
            if (argument.length >= 18) {
                let userId: string;
                // Search for a user tag containing a user id
                const tagPosition = argument.search(/<@!.*>/);

                // If a tag was found in the argument
                if (tagPosition !== -1) {
                    // Extract the user id from the tag
                    userId = argument.slice(tagPosition + 3, tagPosition + 3 + 18);
                }
                // If the argument is not a tag
                else {
                    // Interpret the argument as a plain id
                    userId = argument;
                }

                // Attempt to resolve the argument into a user
                user = client.users.resolve(userId) || undefined;
            }

            // Add the current argument to the list
            this.arguments.push({
                text: argument,
                user: user
            });
        }
    
        this.originalMessage = message;
        this.channel = message.channel as TextChannel | DMChannel;
        this.sender = message.author;
    }
}

export class GuildCommandParser extends CommandParser {
    public readonly channel: TextChannel;
    public readonly guild: Guild;

    public readonly member: GuildMember;

    constructor(message: Message, prefixUsed: string) {
        super(message, prefixUsed);

        if (message.channel.type !== "text") {
            throw new Error("A message within a non-text channel was given to a guild command parser.");
        }

        this.channel = message.channel;
        this.guild = this.channel.guild;

        this.member = getGuildMember(this.sender, this.guild);

        this.arguments.forEach(argument => {
            if (argument.user) {
                argument.member = this.channel.guild.member(argument.user) || undefined;
            }
        });
    }
}