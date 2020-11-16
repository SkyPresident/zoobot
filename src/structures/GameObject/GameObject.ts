import { stripIndent } from "common-tags";
import { Document, Model, Types } from "mongoose";
import gameConfig from "../../config/gameConfig";

export interface FieldRestriction {
    nonNegative?: boolean;
}

export default abstract class GameObject {
    // The model in which the game object's representative documents are found
    public readonly abstract model: Model<Document>;

    protected readonly document: Document;
    public readonly id: Types.ObjectId;

    // The set of field names that are used to access data within this object's document
    public static readonly fieldNames: {[fieldName: string]: string};

    public readonly fieldRestrictions: {[fieldName: string]: FieldRestriction} = {};

    private modifiedSinceLastSave = false;
    private saveTimer: NodeJS.Timeout | undefined;
    private saveDelay = gameConfig.gameObjectSaveDelay;

    constructor(document: Document) {
        this.document = document;
        this.id = document._id;
    }

    private get saveTimerIsRunning(): boolean {
        return Boolean(this.saveTimer);
    }

    private startSaveTimer(): void {
        this.saveTimer = setTimeout(() => {
            this.save().then(() => {
                this.unmodify();
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error saving a game object's document after it was modified.

                    Game object: ${this.debugString}
                    
                    ${error}
                `);
            });
        }, this.saveDelay);
    }

    private stopSaveTimer(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
        }
    }

    // Meant to be called whenever changes are made to the game object
    protected modify(): void {
        if (!this.modifiedSinceLastSave) {
            this.modifiedSinceLastSave = true;

            if (!this.saveTimerIsRunning) {
                this.startSaveTimer();
            }
        }
    }

    private unmodify(): void {
        this.modifiedSinceLastSave = false;

        this.stopSaveTimer();
    }

    protected setDocumentField(fieldName: string, value: unknown): void {
        if (fieldName in this.fieldRestrictions) {
            const restrictions = this.fieldRestrictions[fieldName];

            if (restrictions.nonNegative) {
                if (typeof value !== "number") {
                    throw new Error(stripIndent`
                        A non-number value was given to a game object field that is marked as non-negative.

                        Value: ${value}
                        Game object: ${this.debugString}
                    `);
                }

                if (value < 0) {
                    throw new Error(stripIndent`
                        A negative number was given to a game object field that's supposed to be non-negative.

                        Value: ${value}
                        Game object: ${this.debugString}
                    `);
                }
            }
        }

        this.modify();

        this.document.set(fieldName, value);
    }

    // Placeholder for optionally extensible field loader method
    public async loadFields(): Promise<void> {
        return;
    }

    private async saveDocument(): Promise<void> {
        try {
            await this.document.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a game object's document.

                Document: ${this.document.toString()}
                
                ${error}
            `);
        }
    }

    public async save(): Promise<void> {
        try {
            await this.saveDocument();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a game object's document before unmodifying it.
                
                ${error}
            `);
        }
    }

    // This should only be called after the game object has been properly removed from the game
    public async delete(): Promise<void> {
        this.stopSaveTimer();

        try {
            await this.document.deleteOne();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error deleting a game object's document.

                Document: ${this.document.toString()}
                
                ${error}
            `);
        }
    }

    public get debugString(): string {
        return stripIndent`
            Document: ${this.document.toString()}
        `;
    }
}