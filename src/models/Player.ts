import mongoose, { Document, Schema, Types } from "mongoose";

import DocumentWrapper from "../structures/DocumentWrapper";

const playerSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    animals: {
        type: [Schema.Types.ObjectId],
        required: true
    }
});

export const PlayerModel = mongoose.model("Player", playerSchema);

// A wrapper object for a Mongoose player document
export class Player extends DocumentWrapper {
    constructor(document: Document) {
        super(document, PlayerModel);
    }

    public get userId(): string {
        return this.document.get("userId");
    }

    public get guildId(): string {
        return this.document.get("guildId");
    }

    public get animalIds(): Types.ObjectId[] {
        return this.document.get("animals");
    }

    public getAnimalIdPositional(position: number): Types.ObjectId | undefined {
        if (position < 0 || position >= this.animalIds.length) {
            return undefined;
        }

        return this.animalIds[position];
    }

    // Adds an animal id to the user's inventory
    public async addAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.document.updateOne({
                $push: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding an animal to its inventory: ${error}`);
        }
    }

    // Adds a set of animals at a given base position
    public async addAnimalsPositional(animalIds: Types.ObjectId[], position: number): Promise<void> {
        try {
            await this.document.updateOne({
                $push: {
                    animals: {
                        $each: animalIds,
                        $position: position
                    }
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error adding animals to a player's animal inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding animals to its inventory: ${error}`);
        }
    }

    // Removes an animal from the player's inventory by a given id
    public async removeAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.document.updateOne({
                $pull: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error removing an animal from a player's animal inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing an animal from its inventory: ${error}`);
        }
    }

    // Removes a set of animals by an array of positions
    public async removeAnimalsPositional(animalPositions: number[]): Promise<Types.ObjectId[]> {
        const animalIds: Types.ObjectId[] = [];
        for (const position of animalPositions) {
            animalIds.push(this.animalIds[position]);
        }
        
        try {
            await this.document.updateOne({
                $pull: {
                    animals: {
                        $in: animalIds
                    }
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error removing animals from a player's animal inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing animals from its inventory: ${error}`);
        }

        return animalIds;
    }
}