import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { stripIndents } from "common-tags";
import { Player } from "../models/Player";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";

// Sends a message containing a player's collection of animals
export default class ViewCollectionCommand extends GuildCommand {
    public readonly commandNames = ["collection", "col", "c"];

    public readonly info = "View you or another player's collection of animals";

    public readonly section = CommandSection.playerInfo;

    public help(commandPrefix: string): string {
        return stripIndents`
            Use \`${commandPrefix}${this.commandNames[0]}\` to see your collection of captured animals.

            You can also do \`${commandPrefix}${this.commandNames[0]}\` \`<user tag or id>\` to view somebody else's collection.
        `;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            if (handleUserError(parsedMessage.channel, error)) {
                throw error;
            }
            return;
        }

        const collectionMessage = new CollectionMessage(parsedMessage.channel, player);

        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a collection message: ${error}`);
        }
    }
}