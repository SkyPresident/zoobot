import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Player } from "../structures/GameObject/GameObjects/Player";
import LoadableGameObjectDisplayMessage from "./LoadableGameObjectDisplayMessage";
import LoadableGameObject from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";

export default class BeastiaryMessage extends LoadableGameObjectDisplayMessage<Species> {
    protected readonly lifetime = 60000;

    protected readonly fieldsPerPage = 6;
    protected readonly elementsPerField = 10;

    private readonly player: Player;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient, beastiaryClient.beastiary.species.getAllLoadableSpecies());

        this.player = player;
    }

    protected formatElement(loadableSpecies: LoadableGameObject<Species>): string {
        const species = loadableSpecies.gameObject;

        return species.getShowcaseDisplayName(this.player)
    }

    private sortElementsByPlayerCaptureCount(): void {
        this.elements.sort((a, b) => {
            const recordA = this.player.getSpeciesRecord(a.id);
            const recordB = this.player.getSpeciesRecord(b.id);

            return recordB.data.captures - recordA.data.captures;
        });
    }

    private sortElementsByPlayerTokenStatus(): void {
        this.elements.sort((a, b) => {
            const hasTokenA = this.player.hasToken(a.id) ? 1 : 0;
            const hasTokenb = this.player.hasToken(b.id) ? 1 : 0;

            return hasTokenb - hasTokenA;
        });
    }

    public async build(): Promise<void> {
        this.sortElementsByPlayerCaptureCount();

        this.sortElementsByPlayerTokenStatus();

        try {
            await super.build();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error building the inherited information in a Beastiary message.
                
                ${error}
            `);
        }
    }
    
    protected async buildEmbed(): Promise<MessageEmbed> {
        let embed: MessageEmbed;
        try {
            embed = await super.buildEmbed();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing inherited embed building information in a Beastiary message.

                Species on page: ${JSON.stringify(this.visibleElements)}
                
                ${error}
            `);
        }

        embed.setDescription(`${this.player.beastiaryPercentComplete.toPrecision(3)}% of all species recorded.`);

        embed.setAuthor(`${this.player.member.user.username}'s Beastiary`, this.player.member.user.avatarURL() || undefined);
        embed.setColor(0x9e6734);

        return embed;
    }
}