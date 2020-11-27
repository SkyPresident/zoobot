import { MessageEmbed, TextChannel, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { remainingTimeString } from "../utility/timeStuff";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { stripIndent } from "common-tags";
import gameConfig from "../config/gameConfig";
import BeastiaryClient from "../bot/BeastiaryClient";

export default class EncounterMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    public readonly channel: TextChannel;

    protected deactivationText = "(fled)";

    private readonly species: Species;
    private readonly card: SpeciesCard;

    private readonly warnedUserIds: string[] = [];

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, species: Species) {
        super(channel, beastiaryClient);

        this.addButton({
            name: "capture",
            emoji: "🔘",
            helpMessage: "Capture"
        });

        this.channel = channel;
        this.species = species;
        this.card = this.species.getRandomCard();
    }

    public async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();
        
        embed.setColor(this.beastiaryClient.beastiary.encounters.getRarityInfo(this.species.rarity).color);
        embed.setTitle(capitalizeFirstLetter(this.species.commonNames[0]));

        const speciesRarity = this.beastiaryClient.beastiary.encounters.getRarityInfo(this.species.rarity);
        const rarityEmojiString = this.beastiaryClient.beastiary.emojis.getByName(speciesRarity.emojiName);

        embed.addField("――――――――", `${rarityEmojiString} ${capitalizeFirstLetter(this.species.scientificName)}`, true);
        embed.setImage(this.card.url);

        if (this.card.breed) {
            embed.addField("Breed", capitalizeFirstLetter(this.card.breed), true);
        }

        if (this.card.special) {
            embed.addField("Special", capitalizeFirstLetter(this.card.special), true);
        }

        embed.setFooter("Wild encounter");

        return embed;
    }

    private warnPlayer(player: Player): void {
        if (!this.warnedUserIds.includes(player.member.user.id)) {
            if (player.collectionFull) {
                betterSend(this.channel, `${player.member.user}, your collection is full! Either release some animals with \`${this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild)}release\`, or upgrade your collection size.`);
            }
            else {
                betterSend(this.channel, `${player.member.user}, you can't capture an animal for another **${remainingTimeString(this.beastiaryClient.beastiary.resets.nextCaptureReset)}**.`);
            }

            this.warnedUserIds.push(player.member.user.id);
        }
    }

    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        const guildMember = getGuildMember(user, this.channel.guild, this.beastiaryClient);

        let player: Player;
        try {
            player = await this.beastiaryClient.beastiary.players.fetch(guildMember);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player in an encounter message.

                Guild member: ${JSON.stringify(guildMember)}
                
                ${error}
            `);
        }

        if (!player.canCapture) {
            this.warnPlayer(player);
            return;
        }

        const commonName = this.species.commonNameObjects[0];

        betterSend(this.channel, `${user}, you caught ${commonName.article} ${commonName.name}!`);
        this.setDeactivationText("(caught)");

        player.captureAnimal();

        player.awardCrewExperienceInChannel(gameConfig.xpPerCapture, this.channel);

        try {
            await this.beastiaryClient.beastiary.animals.createAnimal(player, this.species, this.card);
        }
        catch (error) {
            betterSend(this.channel, "There was an error creating a new animal from an encounter, sorry if you didn't get your animal! Please report this to the developer and you can be compensated.");

            throw new Error(stripIndent`
                There was an error creating a new animal in an encounter message.

                Player: ${player.debugString}
                Species: ${this.species.debugString}
                Card: ${JSON.stringify(this.card)}
                
                ${error}
            `);
        }

        this.deactivate();
    }
}