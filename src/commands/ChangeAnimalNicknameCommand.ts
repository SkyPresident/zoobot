import { betterSend } from "../discordUtility/messageMan";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ChangeAnimalNicknameCommand extends GuildCommand {
    public readonly commandNames = ["nickname", "nick", "nn"];

    public readonly info = "Change the nickname of one of your captured animals";

    public readonly helpUseString = "`<animal number or nickname>` `<new nickname>` to change the nickname of an animal in your collection. Use quotation marks (\") for any names with spaces in them.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "animal identifier",
            info: "the nickname or number of the animal in your collection"
        },
        {
            name: "nickname",
            info: "the animal's new nickname",
            optional: true,
            default: "the animal's common name, if left out"
        }
    ];

    public readonly section = CommandSection.animalManagement;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const animalIdentifier = parsedMessage.consumeArgument().text.toLowerCase();

        let animal: Animal | undefined;
        try {
            animal = await beastiaryClient.beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedMessage.member.guild.id,
                userId: parsedMessage.member.user.id,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There as an error searching an animal by its nickname.

                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal by the name/number '${animalIdentifier}' exists in your collection.`);
            return commandReceipt;
        }

        let newNickname: string | undefined;
        if (!parsedMessage.currentArgument) {
            // Set the animal's nickname as nothing, resetting it
            newNickname = undefined;
        }
        // If the user specified a nickname
        else {
            newNickname = parsedMessage.fullArguments;

            const bannedSubStrings = ["*", "_", "`", "~", ">"];

            for (const substring of bannedSubStrings) {
                if (newNickname.includes(substring)) {
                    betterSend(parsedMessage.channel, `Animal nicknames can't contain any Discord-reserved formatting characters, such as: '${substring}'`);
                    return commandReceipt;
                }
            }
        }

        animal.nickname = newNickname;

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new ChangeAnimalNicknameCommand();