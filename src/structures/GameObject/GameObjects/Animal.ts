import { TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import GameObject from "../GameObject";
import { Species, SpeciesCard } from "./Species";
import { AnimalModel, animalSchemaDefinition } from '../../../models/Animal';
import { unknownCard } from './UnknownSpecies';
import { stripIndent } from "common-tags";
import { betterSend } from "../../../discordUtility/messageMan";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
import gameConfig from "../../../config/gameConfig";
import BeastiaryClient from "../../../bot/BeastiaryClient";
import { randomWithinRange } from "../../../utility/numericalMisc";
import { inspect } from "util";
import ListField from "../GameObjectFieldHelpers/ListField";
import Emojis from "../../../beastiary/Emojis";
import { Player } from "./Player";

interface ExperienceGainReceipt {
    xpGiven: number,
    xpTaken: number,
    levelUp: boolean,
    essence: number,
    encounters: number,
    captures: number
}

export class Animal extends GameObject {
    public readonly model = AnimalModel;
    public readonly schemaDefinition = animalSchemaDefinition;

    public static readonly fieldNames = {
        speciesId: "speciesId",
        cardId: "cardId",
        userId: "userId",
        guildId: "guildId",
        ownerId: "ownerId",
        nickname: "nickname",
        experience: "experience",
        tags: "tags"
    };

    protected referenceNames = {
        species: "species",
        owner: "owner"
    }

    public static newDocument(species: Species, card: SpeciesCard, guildId: string, owner?: Player): Document {
        let userId: string | undefined;
        if (owner) {
            if (owner.guildId !== guildId) {
                throw new Error(stripIndent`
                    An owner player whose guild id doesn't match the supplied guild id was found while creating a new animal document.
    
                    Guild id: ${guildId}
                    Owner: ${inspect(owner)}
                `);
            }

            if (!owner.member) {
                throw new Error("A new animal's owner has no guild member.");
            }

            userId = owner.member.user.id;
        }
        
        return new AnimalModel({
            [Animal.fieldNames.speciesId]: species.id,
            [Animal.fieldNames.cardId]: card._id,
            [Animal.fieldNames.userId]: userId,
            [Animal.fieldNames.guildId]: guildId,
            [Animal.fieldNames.ownerId]: owner ? owner.id : undefined,
            [Animal.fieldNames.experience]: 0,
            [Animal.fieldNames.tags]: []
        });
    }

    public readonly tags: ListField<string>;

    constructor(document: Document, beastiaryClient: BeastiaryClient) {
        super(document, beastiaryClient);

        this.references = {
            [this.referenceNames.species]: {
                cache: beastiaryClient.beastiary.species,
                id: this.speciesId
            },
            [this.referenceNames.owner]: {
                cache: beastiaryClient.beastiary.players,
                id: this.ownerId
            }
        };

        this.tags = new ListField(this, Animal.fieldNames.tags, this.document.get(Animal.fieldNames.tags));
    }

    public get speciesId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.speciesId);
    }

    public get cardId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.cardId);
    }

    public get userId(): string | undefined {
        return this.document.get(Animal.fieldNames.userId);
    }

    public set userId(userId: string | undefined) {
        this.setDocumentField(Animal.fieldNames.userId, userId);
    }

    public get guildId(): string {
        return this.document.get(Animal.fieldNames.guildId);
    }

    public get ownerId(): Types.ObjectId | undefined {
        return this.document.get(Animal.fieldNames.ownerId);
    }

    public set ownerId(ownerId: Types.ObjectId | undefined) {
        this.setDocumentField(Animal.fieldNames.ownerId, ownerId);
    }

    public get nickname(): string | undefined {
        return this.document.get(Animal.fieldNames.nickname);
    }

    public set nickname(nickname: string | undefined) {
        this.setDocumentField(Animal.fieldNames.nickname, nickname);
    }

    public get experience(): number {
        return this.document.get(Animal.fieldNames.experience);
    }

    public set experience(experience: number) {
        this.setDocumentField(Animal.fieldNames.experience, experience);
    }

    public get value(): number {
        const levelScaler = 1 + (this.level - 1) / 10;

        return Math.floor(this.species.baseValue * levelScaler);
    }

    public get isOwnersFavorite(): boolean {
        if (this.owner && this.owner.favoriteAnimalId) {
            return this.owner.favoriteAnimalId.equals(this.id);
        }
        return false;
    }

    public get displayNameSimple(): string {
        const displayName = this.nickname || capitalizeFirstLetter(this.species.commonNames[0]);

        return displayName;
    }

    public get displayName(): string {
        let displayName = this.displayNameSimple;

        if (this.isOwnersFavorite) {
            displayName += " 💕";
        }

        return displayName;
    }

    public get showcaseDisplayName(): string {
        const levelEmoji = Emojis.getAnimalLevelEmoji(this.level);

        return `${levelEmoji} ${this.displayName}`;
    }

    public get owner(): Player | undefined {
        if (this.references[this.referenceNames.owner].id !== undefined) {
            return this.getReference(this.referenceNames.owner);
        }
    }

    public get species(): Species {
        return this.getReference(this.referenceNames.species);
    }

    public get card(): SpeciesCard {
        const card = this.species.cards.find(speciesCard => {
            return this.cardId.equals(speciesCard._id);
        });

        if (!card) {
            return unknownCard;
        }
        return card;
    }

    private getLevel(xp: number): number {
        return Math.floor(Math.max(1, Math.log(Math.ceil((xp + 1) / 100)) / Math.log(1.75) + 1));
    }

    public get level(): number {
        return this.getLevel(this.experience);
    }

    public get levelCap(): number {
        if (this.owner) {
            return this.owner.getSpeciesLevelCap(this.species.id);
        }
        return 5;
    }

    public get nextLevelXp(): number {
        return this.getLevelXpRequirement(this.level + 1);
    }

    public get levelEssenceReward(): number {
        return 1 + 2 * Math.floor((this.level - 1) / 5);
    }

    public getlevelEncounterRandomReward(): number {
        const minimumEncounterReward = Math.max(1, this.level / 2);
        const maximumEncounterReward = Math.max(0, 2 * Math.floor(this.level) - 2);

        const encounterReward = Math.round(randomWithinRange(Math.random(), minimumEncounterReward, maximumEncounterReward));

        return encounterReward;
    }

    public getLevelCaptureRandomReward(): number {
        const minimumCaptureReward = Math.max(0, Math.floor((this.level - 3) / 2));
        const maximumCaptureReward = Math.max(0, Math.floor(this.level - 4));
        
        const captureReward = Math.round(randomWithinRange(Math.random(), minimumCaptureReward, maximumCaptureReward));

        return captureReward;
    }

    private get ownerHasToken(): boolean {
        if (this.owner) {
            return this.owner.hasToken(this.species.id);
        }
        return false;
    }

    public getLevelXpRequirement(level: number): number {
        return 100 * Math.floor(Math.pow(1.75, level - 1));
    }

    public playerIsOwner(player: Player): boolean {
        if (!player.member) {
            return false;
        }

        return this.userId === player.member.user.id && this.guildId === player.member.guild.id;
    }

    private performDropChance(target: number): boolean {
        const tokenChance = Math.random() * gameConfig.tokenDropChance;
        
        if (tokenChance <= target) {
            return true;
        }
        return false;
    }

    private giveOwnerToken(): void {
        if (this.owner) {
            this.owner.giveToken(this.species);
        }
    }

    private potentiallyDropTokenOrEssence(chance: number, channel: TextChannel): void {
        if (!this.owner) {
            return;
        }

        const dropSuccess = this.performDropChance(chance);

        if (dropSuccess) {
            let dropString = `Oh? ${this.owner.pingString}, ${this.displayName} dropped something!\n\n`;

            if (!this.ownerHasToken) {
                this.giveOwnerToken();

                dropString += `${Emojis.token} **${capitalizeFirstLetter(this.species.token)}** was added to your token collection!`;
            }
            else {
                this.owner.addEssence(this.species.id, 5);

                dropString += `+**5**${Emojis.essence} (${this.species.commonNames[0]})`;
            }

            betterSend(channel, dropString);
        }
    }

    private addExperienceAndCheckForLevelUp(experience: number): ExperienceGainReceipt {
        const previousExperience = this.experience;
        const previousLevel = this.level;

        if (this.level < this.levelCap) {
            this.experience += experience;
        }

        let levelUp = false;
        
        if (this.level > previousLevel) {
            if (this.level === this.levelCap) {
                this.experience = Math.min(this.experience, this.getLevelXpRequirement(this.levelCap));
            }

            levelUp = true;
        }
        
        const xpReceipt: ExperienceGainReceipt = {
            xpGiven: experience,
            xpTaken: this.experience - previousExperience,
            levelUp: levelUp,
            essence: 0,
            encounters: 0,
            captures: 0
        }

        return xpReceipt;
    }

    public addExperienceInChannel(experience: number, channel: TextChannel): ExperienceGainReceipt {
        if (!this.owner) {
            throw new Error(stripIndent`
                An animal with no owner was given experience.

                Animal: ${this.debugString}
            `);
        }

        const xpReceipt = this.addExperienceAndCheckForLevelUp(experience);

        if (xpReceipt.levelUp) {
            xpReceipt.essence = this.levelEssenceReward;
            xpReceipt.encounters = this.getlevelEncounterRandomReward();
            xpReceipt.captures = this.getLevelCaptureRandomReward();

            this.owner.addEssence(this.species.id, xpReceipt.essence);
            this.owner.extraEncountersLeft += xpReceipt.encounters;
            this.owner.extraCapturesLeft += xpReceipt.captures;

            let rewardString = stripIndent`
                Congratulations ${this.owner.pingString}, ${this.displayName} grew to level ${this.level}!
                +**${xpReceipt.essence}**${Emojis.essence} (${this.species.commonNames[0]})
                +**${xpReceipt.encounters}** encounter${xpReceipt.encounters !== 1 ? "s" : ""}
            `;

            if (xpReceipt.captures > 0) {
                rewardString += `\n+**${xpReceipt.captures}** capture${xpReceipt.captures !== 1 ? "s" : ""}`;
            }

            if (this.level === this.levelCap) {
                rewardString += `\n\n${this.displayName} has reached its species' **max level**! Raise it by gaining more ${this.species.commonNames[0]} essence${Emojis.essence}.`;
            }

            betterSend(channel, rewardString);
        }

        this.potentiallyDropTokenOrEssence(experience, channel);

        return xpReceipt;
    }

    private clearTags(): void {
        this.tags.clear();
    }

    public async changeOwner(newOwnerId: Types.ObjectId): Promise<void> {
        let newOwner: Player | undefined;
        try {
            newOwner = await this.beastiaryClient.beastiary.players.fetchById(newOwnerId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal's new owner player upon attempting to change its owner.

                New owner id: ${newOwnerId}
                Animal: ${this.debugString}

                ${error}
            `);
        }

        if (!newOwner) {
            throw new Error(stripIndent`
                An invalid player id was given to an animal when attempting to change its owner.

                New owner id: ${newOwnerId}
                Animal: ${this.debugString}
            `);
        }

        if (!newOwner.member) {
            throw new Error(stripIndent`
                An animal was attempted to be transferred to a player with no member.

                Player: ${newOwner.debugString}
                Animal: ${this.debugString}
            `);
        }

        this.ownerId = newOwner.id;
        this.userId = newOwner.member.user.id;

        this.clearTags();

        try {
            await this.loadFields();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error reloading an animal's references after an owner change.
            `);
        }
    }
}