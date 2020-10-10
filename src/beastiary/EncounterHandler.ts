import { TextChannel } from "discord.js";
import { Document, Types } from "mongoose";

import { SpeciesModel, Species } from "../models/Species";
import EncounterMessage from "../messages/Encountermessage";
import getWeightedRandom from "../utility/getWeightedRandom";
import { beastiary } from "./Beastiary";

// A handler class that deals with creating encounters with species from the total set
class EncounterHandler {
    // The map of ID and rarity pairs that will determine how common each species is
    private rarityMap: Map<Types.ObjectId, number> = new Map();

    // Loads/reloads the rarity table from the database
    public async loadRarityTable(): Promise<void> {
        let rarityList: Document[];
        // Get all species and their associated rarity values
        try {
            rarityList = await SpeciesModel.find({}, { rarity: 1 });
        }
        catch (error) {
            throw new Error(`There was an error getting all species rarities from the database: ${error}`);
        }

        // Reset the rarity map (useful for reloading the values after already being initialized)
        this.rarityMap = new Map();

        // Add each species to the map
        rarityList.forEach(species => {
            this.rarityMap.set(species._id, species.get("rarity"));
        });
    }

    // Spawn an animal encounter in a given server
    public async spawnAnimal(channel: TextChannel): Promise<void> {
        // Don't try to spawn anything if the rarity map is empty
        if (this.rarityMap.size < 1) {
            throw new Error("Tried to spawn an animal before the encounter rarity map was formed.");
        }

        // Get a weighted random species object
        let species: Species;
        try {
            species = await beastiary.species.fetchById(getWeightedRandom(this.rarityMap));
        }
        catch (error) {
            throw new Error(`There was an error getting a species by an id: ${error}`);
        }

        const encounterMessage = new EncounterMessage(channel, species);
        // Send an encounter message to the channel
        try {
            await encounterMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a new encounter message: ${error}`);
        }
    }
}
export const encounterHandler = new EncounterHandler();