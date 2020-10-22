import { stripIndents } from "common-tags";
import { MessageEmbed, TextChannel } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../models/Animal";
import { Player } from "../models/Player";

// Displays a player's various stats
export default class PlayerProfileMessage extends InteractiveMessage {
    private readonly player: Player;

    constructor(channel: TextChannel, player: Player) {
        super(channel);

        this.player = player;
    }

    public async build(): Promise<void> {
        this.setEmbed(await this.buildEmbed());
    }

    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        // Get the player's first animal in their inventory, if it exists
        let firstAnimal: Animal | undefined;
        if (this.player.animalIds.length > 0) {
            try {
                firstAnimal = await beastiary.animals.fetchById(this.player.animalIds[0]);
            }
            catch (error) {
                throw new Error(`There was an error fetching a player's first animal for use in a profile message: ${error}`);
            }
        }

        if (firstAnimal) {
            embed.setThumbnail(firstAnimal.card.url);
        }

        embed.setAuthor(`${this.player.user.username}'s profile`, this.player.user.avatarURL() || undefined);
        embed.setDescription(stripIndents`
            Collection size: **${this.player.animalIds.length}**
            Total encounters: **${this.player.totalEncounters}**
            Total captures: **${this.player.totalCaptures}**
        `);

        return embed;
    }
}