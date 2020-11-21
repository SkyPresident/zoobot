import { stripIndent } from "common-tags";
import { client } from "..";
import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class FeedbackCommand extends Command {
    public readonly commandNames = ["feedback", "suggest"];

    public readonly info = "Send a suggestion straight to the support team";

    public readonly helpUseString = "to send a feedback message to the developer.";

    public readonly section = CommandSection.getInvolved;

    public readonly arguments = [
        {
            name: "message",
            info: "your message to send the the developer",
            required: true
        }
    ];

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, "You have to include a message as your feedback!");
            return commandReceipt;
        }

        if (!client.shard) {
            throw new Error(stripIndent`
                Client shard value undefined.
            `);
        }

        client.shard.broadcastEval(`
            this.emit("feedbackmessage", "${parsedMessage.sender.tag}", "${parsedMessage.sender.avatarURL()}", "${parsedMessage.fullArguments}");
        `);

        betterSend(parsedMessage.channel, "Feedback sent!");

        return commandReceipt;
    }
}
export default new FeedbackCommand();