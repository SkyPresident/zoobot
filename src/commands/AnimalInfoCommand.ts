import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import AnimalInfoMessage from "../messages/AnimalInfoMessage";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndents } from "common-tags";

export default class AnimalInfoCommand extends GuildCommand {
    public readonly commandNames = ["animalinfo", "ai", "stats"];

    public readonly info = "View the stats, info, and card of a captured animal";

    public readonly section = CommandSection.gettingStarted;

    public help(prefix: string): string {
        return `Use \`${prefix}${this.commandNames[0]}\` \`<animal number or nickname>\` to view information about that animal.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        const animalIdentifier = parsedMessage.fullArguments.toLowerCase();

        let animalObject: Animal | undefined;
        try {
            animalObject = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error attempting to search an animal for the info command.

                Parsed message: ${JSON.stringify(parsedMessage)}

                ${error}
            `);
        }

        if (!animalObject) {
            betterSend(parsedMessage.channel, "No animal by that nickname/number could be found in this server.");
            return;
        }

        const infoMessage = new AnimalInfoMessage(parsedMessage.channel, animalObject);
        
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error sending an animal information message.

                Message: ${infoMessage}
                
                ${error}
            `);
        }
    }
}