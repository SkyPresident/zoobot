import { stripIndents } from 'common-tags';

import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { reactionInput, betterSend } from '../utility/toolbox';
import EditableDocumentMessage from '../messages/editableDocumentMessage';
import EditableDocument, { schemaToSkeleton } from '../utility/editableDocument';
import { PendingSpecies, pendingSpeciesSchema } from '../models/pendingSpecies';

// Initiates the species submission process. Only to be used in DMs.
export class SubmitSpeciesCommand implements Command {
    public commandNames = ['submitspecies', 'submit'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}submit to begin the species submission process. Only usable in DMs.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Cast the channel as a DMChannel or a TextChannel because that's what it is
        const channel = parsedUserCommand.channel;

        const user = parsedUserCommand.originalMessage.author;

        // Send the big instructional message so the user knows what they're signing themselves up for
        const initialMessage = await betterSend(channel, stripIndents`
            You're about to begin the process of submitting a new animal species to The Beastiary.
            Please read over the following fields and prepare your submissions for them in advance.
            
            1) Common name(s): The names used to refer to the animal in everyday speech. E.g. "raven", "bottlenose dolphin". **At least one is required.**
            2) Image(s): Pictures used to clearly depict the animal's appearance. Imgur links only. **At least one is required.**
            3) Scientific name: The taxonomical name of the animal. If the animal's common name refers to multiple species, pick the most relevant one. **Required.**
            4) Description: A brief description of the animal's appearance, attributes, and behaviors. **Not required.**
            5) Natural habitat: A brief description of the animal's natural environment, both in ecological traits and geographic location. **Not required.**
            6) Wikipedia page: The link to the animal's species' wikipedia page. **Not required.**

            Press the reaction button to initiate the submission process when you're ready.
        `);

        // If the message didn't send for whatever reason just stop everything. Not sure why this would happen so throw an error I guess.
        if (!initialMessage) {
            throw new Error('Unable to send the initial species submission message to a user through DMs.');
        }

        // Make sure baby understands the game by making them press a cool confirmation button
        // There's also only a 60 second window to press the button so bonus burn if they have to send the command again
        // This is necessary for reasons other than making the user feel dumb I promise
        if (!(await reactionInput(initialMessage, 60000, ['✅']))) {
            // If we're in here, the button didn't get pressed
            betterSend(channel, 'Your time to initiate the previous submission process has expired. Perform the submit command again if you wish try again.');
            return;
        }
        // If we're out here that means the button was pressed. They did good.

        // The document used to construct a pending species
        const skeleton = schemaToSkeleton(pendingSpeciesSchema, {
            commonNames: {
                alias: 'common names',
                prompt: 'Enter a name that is used to refer to this animal conversationally, e.g. "dog", "cat", "bottlenose dolphin".',
            },
            scientificName: {
                alias: 'scientific name',
                prompt: 'Enter this animal\'s scientific (taxonomical) name.',
            },
            images: {
                alias: 'images',
                prompt: 'Enter a valid imgur link to a clear picture of the animal. Must be a direct link to the image, e.g. "i.imgur.com/fake-image"',
            },
            description: {
                alias: 'description',
                prompt: 'Enter a concise description of the animal. See other animals for examples.',
            },
            naturalHabitat: {
                alias: 'natural habitat',
                prompt: 'Enter a concise summary of where the animal is naturally found. See other animals for examples.',
            },
            wikiPage: {
                alias: 'wikipedia page',
                prompt: 'Enter the link leading to the Wikipedia page of the animal\'s species.',
            }
        });

        const document = new EditableDocument(skeleton);

        // Create and send an editable document for the user's new species submission
        const submissionMessage = new EditableDocumentMessage(channel, document, 'new submission');
        submissionMessage.send();

        // Get user's submission
        const finalDocument = await submissionMessage.getNextSubmission();

        // After the user has submitted the document, deactivate it
        submissionMessage.deactivate();

        // If the user ran out of time
        if (!finalDocument) {
            betterSend(channel, 'Time limit expired, nothing submitted.');
            return;
        }

        // Create a new pending species based on the SimpleDocument that was returned
        // This works because SimpleDocument is just a plain object with the same field names as the Skeleton that was passed in
        const pendingSpecies = new PendingSpecies(finalDocument);

        // Set the author
        pendingSpecies.set('author', user.id);

        // Save the document
        pendingSpecies.save();

        betterSend(channel, 'Submission accepted. Thanks for contributing to The Beastiary!');
    }
}