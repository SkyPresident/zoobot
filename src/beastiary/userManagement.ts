import { Guild } from "discord.js";
import { Document } from "mongoose";

import getGuildMember from "../discordUtility/getGuildMember";
import { Animal, AnimalObject } from "../models/Animal";
import { GuildModel, GuildObject } from "../models/Guild";
import { PlayerObject } from "../models/Player";
import { errorHandler } from "../structures/ErrorHandler";
import { beastiary } from "./Beastiary";

// Gets a guild document from the database that corresponds to a given guild object and returns it as an object
export async function getGuildObject(guild: Guild): Promise<GuildObject> {
    // Attempt to find an existing document that represents this guild
    let guildDocument: Document | null;
    try {
        guildDocument = await GuildModel.findOne({ id: guild.id });
    }
    catch (error) {
        throw new Error(error);
    }

    // If no document currently represents the guild
    if (!guildDocument) {
        // Make one and save it
        guildDocument = new GuildModel({
            id: guild.id,
            config: {
                prefix: '>'
            }
        });

        try {
            await guildDocument.save();
        }
        catch (error) {
            throw new Error('There was an error saving a new guild document to the database.');
        }
    }

    // Return the pre-existing or newly created guild document within a wrapper object
    return new GuildObject({document: guildDocument});
}

export async function getAnimalByNickname(nickname: string, guildId?: string): Promise<AnimalObject | undefined> {
    // The base search query to add options to as needed
    const searchQuery = {
        $text: {
            $search: nickname
        }
    };

    // If a guild id was provided to narrow down the search
    if (guildId) {
        // Add the appropriate property to the search query options
        Object.defineProperty(searchQuery, 'guildId', {
            value: guildId,
            writable: false,
            enumerable: true
        });
    }

    let animalDocument: Document | null;
    // Attempt to find the animal by the given search options
    try {
        animalDocument = await Animal.findOne(searchQuery);
    }
    catch (error) {
        throw new Error('There was an error finding an animal by its nickname.');
    }

    // Return the document as an object if one was found
    if (!animalDocument) {
        return undefined;
    }

    return new AnimalObject({ document: animalDocument });
}

// Searches for an animal in
export async function searchAnimal(
    searchTerm: string,
    searchOptions?: {
        guildId?: string,
        userId?: string,
        playerObject?: PlayerObject,
        searchByPosition?: boolean
    }): Promise<AnimalObject | undefined> {
    // Pull the potential guild id and player object from the search options (undefined if none)
    const guildId = searchOptions && searchOptions.guildId;
    const userId = searchOptions && searchOptions.userId;
    let playerObject = searchOptions && searchOptions.playerObject;
    const searchByPosition = searchOptions && searchOptions.searchByPosition;

    // If the search is only to be done by nickname
    if (!searchByPosition) {
        try {
            return await getAnimalByNickname(searchTerm, guildId);
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error finding an animal by a given nickname.');
            return;
        }
    }
    // If we're out here, it means that animal indexes need to be considered

    // First make sure the search term isn't a numeric index in a player's inventory to search
    const searchNumber = Number(searchTerm);

    // If the search term isn't a number (it's a nickname)
    if (isNaN(searchNumber)) {
        let animalObject: AnimalObject | undefined;
        // Attempt to get an animal by the nickname provided
        try {
            animalObject = await getAnimalByNickname(searchTerm, guildId);
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error finding an animal by its nickname.');
        }

        // Only return something if an animal was found, if not continue for more checks
        if (animalObject) {
            return animalObject;
        }
    }
    // If the search term is a number
    else {
        // If no player object wasn't provided
        if (!playerObject) {
            // Make sure there's enough info provided to determine the player object
            if (!guildId || !userId) {
                throw new Error('Insufficient information was provided to searchAnimal for the purpose of seraching by animal position.');
            }

            // Get the player object corresponding to the user provided for the search
            try {
                playerObject = await beastiary.players.fetch(getGuildMember(userId, guildId));
            }
            catch (error) {
                errorHandler.handleError(error, 'There was an error getting a player object by a guild member.');
                return;
            }
        }

        // Get the animal by its position in the player's inventory
        const animalObject = playerObject.getAnimalPositional(searchNumber - 1);

        if (animalObject) {
            return animalObject;
        }
    }

    // If the search term is a number, but none of the other search options have returned anything so far
    if (!isNaN(searchNumber)) {
        // Search the number as a nickname (last resort)
        try {
            return await getAnimalByNickname(searchTerm, guildId);
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error finding an animal by its nickname.');
        }
    }

    return undefined;
}