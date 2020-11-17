import { MessageEmbed } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildAnimalCard(embed: MessageEmbed, animal: Animal): void {
    embed.setTitle(animal.displayName);
    embed.setImage(animal.card.url);

    const animalRarity = beastiary.encounters.getRarityInfo(animal.species.rarity);
    
    embed.setColor(animalRarity.color);

    embed.addField("――――――――", `Card #${animal.species.indexOfCard(animal.card._id) + 1} of ${animal.species.cardCount}`, true);

    if (animal.card.breed) {
        embed.addField("Breed", capitalizeFirstLetter(animal.card.breed), true);
    }

    if (animal.card.special) {
        embed.addField("Special", capitalizeFirstLetter(animal.card.special), true);
    }
}