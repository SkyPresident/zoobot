import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { remainingTimeString } from "../utility/timeStuff";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import gameConfig from "../config/gameConfig";
import BeastiaryClient from "../bot/BeastiaryClient";

class EncounterCommand extends GuildCommand {
    public readonly names = ["encounter", "e"];

    public readonly info = "Initiate an animal encounter";

    public readonly helpUseString = "to initiate an animal encounter.";

    public readonly section = CommandSection.gettingStarted;

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (player.encountersLeft <= 0) {
            betterSend(parsedMessage.channel, stripIndent`
                You don't have any encounters left. Next encounter reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextEncounterReset)}**.

                Want more? Subscribe at <${gameConfig.patreonLink}> for exclusive premium features such as more encounters, captures, and xp!
            `);
            return commandReceipt;
        }

        player.encounterAnimal();

        player.awardCrewExperienceInChannel(gameConfig.xpPerEncounter, parsedMessage.channel);

        try {
            await beastiaryClient.beastiary.encounters.spawnAnimal(parsedMessage.channel);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error creating a new animal encounter.

                Message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new EncounterCommand();