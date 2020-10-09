import mongoose, { Schema, Types } from "mongoose";
import DocumentWrapper from '../structures/DocumentWrapper';
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

export const GuildModel = mongoose.model('Guild', guildScema);

export class PlayerGuild extends DocumentWrapper {
    constructor(documentId: Types.ObjectId) {
        super(GuildModel, documentId);
    }

    public getGuildId(): string {
        return this.getDocument().get('id');
    }

    public getPrefix(): string {
        return this.getDocument().get('config.prefix');
    }

    public async setPrefix(newPrefix: string): Promise<void> {
        if (!this.documentLoaded()) {
            throw new Error('Tried to change a guild document\'s prefix before it was loaded.');
        }

        // Attempt to update the guild's prefix
        try {
            await this.getDocument().updateOne({
                $set: {
                    'config.prefix': newPrefix
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error updating a guild model in the change prefix command: ${error}`);
        }
    }
}