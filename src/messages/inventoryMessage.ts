import { TextChannel, MessageEmbed, User, GuildMember } from "discord.js";

import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import { AnimalObject } from "../models/animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import { getGuildMember } from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { loopValue } from "../utility/loopValue";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { PlayerObject } from "../models/player";
import { PointedArray } from "../structures/pointedArray";
import { SmartEmbed } from "../discordUtility/smartEmbed";
import { deleteAnimal, getPlayerObject } from "../zoo/userManagement";

// The set of states that an inventory message can be in
enum InventoryMessageState {
    page,
    info,
    image
}

export class InventoryMessage extends InteractiveMessage {
    private readonly user: User;
    protected readonly channel: TextChannel;

    // The inventory of AnimalObjects to display
    private inventory = new PointedArray<AnimalObject>();

    // The page to start on
    private page = 0;
    private animalsPerPage = 10;
    // The number of total pages in the inventory
    // This has to be initialized as 0 because the page count can't be determined until the message is built
    private pageCount = 0;

    // The current display state of the message
    private state: InventoryMessageState;

    private readonly guildMember: GuildMember;
    private playerObject: PlayerObject | undefined;

    public constructor(handler: InteractiveMessageHandler, channel: TextChannel, user: User) {
        super(handler, channel, { buttons: [
            {
                name: 'leftArrow',
                emoji: '⬅️'
            },
            {
                name: 'rightArrow',
                emoji: '➡️'
            },
            {
                name: 'upArrow',
                emoji: '⬆️'
            },
            {
                name: 'downArrow',
                emoji: '⬇️'
            },
            {
                name: 'info',
                emoji: 'ℹ️'
            },
            {
                name: 'image',
                emoji: '🖼️'
            },
            {
                name: 'release',
                emoji: '🗑️'
            }
        ]});

        this.user = user;
        this.channel = channel;

        // Start the inventory message in paged view mode
        this.state = InventoryMessageState.page;

        // Find the Discord guild member corresponding to this message's requester
        this.guildMember = getGuildMember(user, channel.guild);
    }

    // Gets the document wrapper object corresponding to the player whose inventory this message represents
    private getPlayerObject(): PlayerObject {
        if (!this.playerObject) {
            throw new Error('Attempted to get a player object in an inventory before it was initialized.');
        }

        return this.playerObject;
    }

    // Pre-send build logic
    public async build(): Promise<void> {
        console.time('init');
        super.build();

        // Attempt to get the user's player object
        let playerObject: PlayerObject;
        try {
            playerObject = await getPlayerObject(this.guildMember);
            await playerObject.load();
        }
        catch (error) {
            console.error('There was an error trying to get a player object in an inventory message.');
            throw new Error(error);
        }

        // Assign the new player object
        this.playerObject = playerObject;
        this.inventory = new PointedArray(await this.playerObject.getAnimalObjects());

        // Calculate and set page count
        this.pageCount = Math.ceil(this.inventory.length / this.animalsPerPage);

        console.timeEnd('init');

        // Build the initial embed
        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(error);
        }
    }

    // Build's the current page of the inventory's embed
    // Is async because queries for each animal's species data are being made as requested, rather than initially
    private async buildEmbed(): Promise<MessageEmbed> {
        console.time('build');
        const embed = new SmartEmbed();

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);

        embed.setFooter(`${this.inventory.length} in collection`);

        // Don't try anything crazy if the user's inventory is empty
        if (this.inventory.length < 1) {
            return embed;
        }

        // Calculate the start and end points of the current page
        const startIndex = this.page * this.animalsPerPage;
        const endIndex = startIndex + this.animalsPerPage;

        // Filter the currently displayed slice of the inventory array for animals that haven't been loaded yet
        const unloadedAnimals: AnimalObject[] = this.inventory.slice(startIndex, endIndex).filter((animalObject: AnimalObject) => {
            return !animalObject.isLoaded();
        });
        
        // If there are animals that need to be loaded, initiate a promise to load them all at once
        unloadedAnimals.length && await new Promise(resolve => {
            let count = 0;
            unloadedAnimals.forEach(unloadedAnimal => {
                // Load every animal in the necessary array
                unloadedAnimal.load().then(() => {
                    // When the last animal is loaded, resolve the promise and continue on
                    if (++count >= unloadedAnimals.length) {
                        resolve();
                    }
                })
            });
        });

        // Get the animal that's selected by the pointer
        const selectedAnimal = this.inventory.selection();

        // Get the animal's necessary information
        const species = selectedAnimal.getSpecies();
        const image = selectedAnimal.getImage();

        // Calculate the index of the animal's image out of its species's images
        const imageIndex = species.getImages().findIndex(speciesImage => {
            return speciesImage.getId().equals(image.getId());
        });
        
        // Display state behavior
        switch (this.state) {
            // When the message is in paged view mode
            case InventoryMessageState.page: {
                embed.setThumbnail(this.inventory[0].getImage().getUrl());

                let inventoryString = '';
                // Start the current page's display at the appropriate position
                let inventoryIndex = startIndex;
                // Loop until either the index is above the entries per page limit or the length of the inventory
                while (inventoryIndex < endIndex && inventoryIndex < this.inventory.length) {
                    // Get the currently iterated animal in the user's inventory
                    const animal: AnimalObject = this.inventory[inventoryIndex];

                    const species = animal.getSpecies();
                    const image = animal.getImage();

                    const firstName = species.getCommonNames()[0];

                    const breed = image.getBreed();
                    // Write breed information only if it's present
                    const breedText = breed ? `(${breed})` : '';

                    // The pointer text to draw on the current animal entry (if any)
                    const pointerText = inventoryIndex === this.inventory.getPointerPosition() ? ' 🔹' : '';

                    inventoryString += `\`${inventoryIndex + 1})\` ${capitalizeFirstLetter(firstName)} ${breedText}`;

                    inventoryString += ` ${pointerText}\n`;

                    inventoryIndex++;
                }

                embed.setDescription(inventoryString);

                break;
            }
            // When the message is in info mode
            case InventoryMessageState.info: {
                embed.setThumbnail(image.getUrl());

                embed.setTitle(`\`${this.inventory.getPointerPosition() + 1})\` ${capitalizeFirstLetter(species.getCommonNames()[0])}`);
                
                embed.addField('Species', capitalizeFirstLetter(species.getScientificName()), true);

                embed.addField('Card', `${imageIndex + 1}/${species.getImages().length}`, true);

                const breed = image.getBreed();
                breed && embed.addField('Breed', capitalizeFirstLetter(breed));

                embed.addField('Experience', `${selectedAnimal.getExperience()}`);

                break;
            }
            // When the message is in image mode
            case InventoryMessageState.image: {
                embed.setImage(image.getUrl());
                embed.addField(`\`${this.inventory.getPointerPosition() + 1})\` ${capitalizeFirstLetter(species.getCommonNames()[0])}`, `Card #${imageIndex + 1} of ${species.getImages().length}`);

                break;
            }
        }
        console.timeEnd('build');
        return embed;
    }

    // Move a number of pages
    private movePages(count: number): void {
        // Moves the desired number of pages, looping if necessary
        this.page = loopValue(this.page + count, 0, this.pageCount - 1);
        // If the page move caused the pointer to be off the page
        if (!this.pointerIsOnPage()) {
            // Move the pointer to the first entry on the page
            this.inventory.setPointerPosition(this.page * this.animalsPerPage);
        }
    }

    // Gets the page that the pointer is currently on
    private getPointerPage(): number {
        return Math.floor(this.inventory.getPointerPosition() / this.animalsPerPage);
    }

    // Checks if the pointer is on the message's currently displayed page
    private pointerIsOnPage(): boolean {
        return this.page === this.getPointerPage();
    }

    // Moves to the page that the pointer is on
    private goToPointerPage(): void {
        this.page = this.getPointerPage();
    }

    // Moves the pointer a number of positions
    private movePointer(count: number): void {
        // Move the pointer to the new position
        this.inventory.movePointer(count);
        // If moving the pointer made it leave the page
        if (!this.pointerIsOnPage()) {
            // Change the page to the one that the pointer's on
            this.goToPointerPage();
        }
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case 'upArrow': {
                this.movePointer(-1);
                break;
            }
            case 'downArrow': {
                this.movePointer(1);
                break;
            }
            case 'leftArrow': {
                // Change pages if the message is in page mode, otherwise move the pointer
                if (this.state === InventoryMessageState.page) {
                    this.movePages(-1);
                }
                else {
                    this.movePointer(-1);
                }
                break;
            }
            case 'rightArrow': {
                // Change pages if the message is in page mode, otherwise move the pointer
                if (this.state === InventoryMessageState.page) {
                    this.movePages(1);
                }
                else {
                    this.movePointer(1);
                }
                break;
            }
            case 'info': {
                if (this.state !== InventoryMessageState.info) {
                    this.state = InventoryMessageState.info;
                }
                else {
                    this.state = InventoryMessageState.page;
                }
                break;
            }
            case 'image': {
                if (this.state !== InventoryMessageState.image) {
                    this.state = InventoryMessageState.image;
                }
                else {
                    this.state = InventoryMessageState.page;
                }
                break;
            }
            case 'release': {
                // Get the selected animal that will be released
                const selectedAnimal = this.inventory.selection();

                if (!(selectedAnimal instanceof AnimalObject)) {
                    throw new Error('A plain ObjectId was selected for release.');
                }

                // Release the user's animal
                try {
                    console.time('delete');
                    await deleteAnimal(selectedAnimal);
                    console.timeEnd('delete');
                }
                catch (error) {
                    betterSend(this.channel, 'There was an error releasing this animal.');
                    console.error('There was an error trying to release a user\'s animal from an inventory message.');
                    throw new Error(error);
                }

                // Delete the animal from the inventory message
                this.inventory.deleteAtPointer();
            }
        }

        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(error);
        }
    }
}