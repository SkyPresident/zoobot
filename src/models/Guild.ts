import mongoose, { Document, Schema } from "mongoose";
import config from "../config/BotConfig";
import GameObject from "../structures/GameObject";
import { guildConfigSchema } from "./guildConfig";

const guildScema = new Schema({
    id: {
        type: String,
        required: true
    },
    config: {
        type: guildConfigSchema,
        required: true
    }
});

export const GuildModel = mongoose.model("Guild", guildScema);

// A guild with at least one player in it. Does not exist for guilds that have not used any game commands.
export class PlayerGuild extends GameObject {
    public readonly model = GuildModel;

    public static newDocument(guildId: string): Document {
        // Make one and save it
        return new GuildModel({
            id: guildId,
            config: {
                prefix: config.prefix
            }
        });
    }

    public get guildId(): string {
        return this.document.get("id");
    }

    public get prefix(): string {
        return this.document.get("config.prefix");
    }

    public async setPrefix(newPrefix: string): Promise<void> {
        if (!this.documentLoaded) {
            throw new Error("Tried to change a guild document's prefix before it was loaded.");
        }

        // Attempt to update the guild's prefix
        try {
            await this.document.updateOne({
                $set: {
                    "config.prefix": newPrefix
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error updating a guild model in the change prefix command: ${error}`);
        }

        // Reflect the changes in memory
        this.document.set("config.prefix", newPrefix);
    }
}