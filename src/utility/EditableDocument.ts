import { PointedArray } from "./pointedArray";
import { capitalizeFirstLetter } from "./toolbox";
import { Schema } from "mongoose";

// A set of informational fields pertaining to a field of a document
interface EditableDocumentFieldInfo {
    // The human-formatted name of the field
    alias: string,
    // The optional prompt for informing the user about input guidelines
    prompt?: string,
    type: 'document' | 'array' | 'string' | 'boolean',
    // Whether or not the document will submit without this field
    required?: boolean,
    // The type of document, used if the type is 'document'
    documentType?: EditableDocumentSkeleton,
    // The type stored within the array, used if the type is 'array'
    arrayType?: EditableDocumentSkeleton | 'string'
}

// A blueprint used to construct a new empty editable document
export interface EditableDocumentSkeleton {
    [path: string]: EditableDocumentFieldInfo
}

// A single field within a document. Contains both the given field info and the value to eventually be set.
export interface EditableDocumentField {
    fieldInfo: EditableDocumentFieldInfo,
    value: EditableDocument | PointedArray<EditableDocument | string> | string | boolean;
}

// The simple, non-pointed form of an EditableDocument
// Used as a return type when getting an EditableDocument that has been submitted
export interface SimpleDocument {
    [path: string]: SimpleDocument | string[] | string | boolean | undefined
}

// A document containing a set of fields that can be edited through some given user interface
export default class EditableDocument {
    // The document's fields
    private readonly fields = new Map<string, EditableDocumentField>();
    // The names of the document's fields, in a pointed array so the fields can be loosely indexed for user pointer selection
    private readonly fieldNames = new PointedArray<string>();

    // Create a new document from a given skeleton
    constructor(skeleton: EditableDocumentSkeleton) {
        // Don't accept empty skeletons
        if (skeleton === {}) {
            throw new Error('Cannot form a new EditableDocument from an empty object');
        }

        // Iterate over every field in the skeleton
        for (const [key, fieldInfo] of Object.entries(skeleton)) {
            // The default value that will be assigned to this field
            let value: EditableDocument | PointedArray<EditableDocument | string> | string | boolean;

            // Field type behavior
            switch (fieldInfo.type) {
                // If the field is a document
                case 'document': {
                    // Make sure the document's type (skeleton) is provided
                    if (!fieldInfo.documentType) {
                        throw new Error('Must supply an EditableDocumentSkeleton in the documentType field if using Document type.');
                    }

                    // Initialize an empty document of the given type as the default value
                    value = new EditableDocument(fieldInfo.documentType);
                    break;
                }
                // If the field is an array
                case 'array': {
                    // Make sure the array's type (skeleton) is provided
                    if (!fieldInfo.arrayType) {
                        throw new Error('Must supply a type in the arrayType field if using Array type.');
                    }

                    // If the array is to hold strings
                    if (fieldInfo.arrayType === 'string') {
                        // Make a new pointed string array
                        value = new PointedArray<string>();
                    }
                    // If the array is to hold documents
                    else {
                        // Make a new pointed document array
                        value = new PointedArray<EditableDocument>();
                    }
                    break;
                }
                // If the field is a string
                case 'string': {
                    // Just give it an empty string (which will be treated as undefined)
                    value = '';
                    break;
                }
                // If the field is a boolean value
                case 'boolean': {
                    // Initialize to false
                    value = false;
                    break;
                }
            }

            // Add the current field to the document's fields
            this.fields.set(key, {
                fieldInfo: fieldInfo,
                value: value
            });
            // Add the name to the pointed array
            this.fieldNames.push(key);
        }
    }

    // Concisely display the fields of the document
    public toString(delimiter?: string): string {
        let content = '';
        let fieldIndex = 0;
        for (const field of this.fields.values()) {
            const currentDelimiter = fieldIndex < this.fields.size - 1 ? (delimiter ? delimiter : '\n') : '';
            content += `${capitalizeFirstLetter(field.fieldInfo.alias)}: ${field.value || '*None*'}${currentDelimiter}`;
            fieldIndex++;
        }
        return content;
    }

    // Get the currently selected field within the document
    public getSelection(): EditableDocumentField {
        const selected = this.fields.get(this.fieldNames.selection());
        if (!selected) {
            throw new Error('An editable document returned nothing when retrieving its selection.');
        }

        return selected;
    }

    // Gets the name of the currently selected field
    public getSelectedFieldName(): string {
        return this.fieldNames.selection();
    }

    // Gets an iterator of every field in this document
    public getFieldEntries(): IterableIterator<[string, EditableDocumentField]> {
        return this.fields.entries();
    }

    // Moves the pointer up one
    public incrementPointer(): void {
        this.fieldNames.incrementPointer();
    }

    // Moves the pointer down one
    public decrementPointer(): void {
        this.fieldNames.decrementPointer();
    }

    // Makes sure that all requirements are met, as indicated by each field's optional "required" property
    public requirementsMet(): boolean {
        // Check every field for validity
        for (const field of this.fields.values()) {
            // If the field is not required, don't bother checking it because it doesn't matter
            if (!field.fieldInfo.required) {
                continue;
            }

            // If the field is an array
            if (field.value instanceof PointedArray) {
                // If the array is empty
                if (field.value.length < 1) {
                    return false;
                }
            }
            // If the field is a document
            else if (field.value instanceof EditableDocument) {
                // Return whether or not the document's requirements are met
                return field.value.requirementsMet();
            }
            // If the field is a string, make sure it's not empty or undefined
            else if (typeof field.value === 'string' && !field.value) {
                return false;
            }
            // If the field is a boolean value, make sure it's not undefined (I'm not even sure if it can be)
            else if (typeof field.value === 'boolean' && field.value === undefined) {
                return false;
            }
        }
        // If all above tests were passed, indicate that requirements have been met
        return true;
    }

    // Gets the EditableDocument's data as a simple object of the raw submitted data
    public getData(): SimpleDocument {
        // The final object to stuff and submit
        const finalObject: SimpleDocument = {};

        // Iterate over every field in this document
        for (const [key, field] of this.fields.entries()) {
            // The value that will be stored in this current field's simple analogue
            let storedValue: SimpleDocument | SimpleDocument[] | string[] | string | boolean | undefined;

            // If the current field's value is an array
            if (field.value instanceof PointedArray) {
                // Store the basic string array if it stores strings
                if (field.fieldInfo.arrayType === 'string') {
                    storedValue = field.value as string[];
                }
                // If the array contains other EditableDocuments
                else {
                    // Indicate that the value will be an array of simple documents
                    storedValue = [] as SimpleDocument[];
                    // Convert every editable document into its simple counterpart and add them to the array
                    for (const element of field.value as EditableDocument[]) {
                        storedValue.push(element.getData());
                    }
                }
            }
            // If the field's value is just another document
            else if (field.value instanceof EditableDocument) {
                // Store the simple version of the document
                storedValue = field.value.getData();
            }
            // If the field's value is a basic type
            else {
                // Just store the value itself
                storedValue = field.value;
            }

            // Add the current property to the simple document
            Object.defineProperty(finalObject, key, {
                value: storedValue,
                writable: false,
                enumerable: true
            });
        }

        return finalObject;
    }
}

interface EditableDocumentSkeletonInfo {
    [path: string]: {
        alias: string,
        prompt?: string
    }
}

// Takes a Mongoose schema and some information about each field to include, and combines them into an EditableDocumentSkeleton
export function schemaToSkeleton(schema: Schema, info: EditableDocumentSkeletonInfo): EditableDocumentSkeleton {
    const skeleton: EditableDocumentSkeleton = {};

    // Iterate over every field in the info objext
    for (const [key, value] of Object.entries(info)) {
        // If the current info field's key isn't also in the schema
        if (!(key in schema.obj)) {
            throw new Error('Field name found in info skeleton not found in Mongoose schema.');
        }

        // The type to assign for the current field in the skeleton
        let fieldType: 'string' | 'array';
        // The optional type of the array to assign to the current field in the skeleton (only if it's an array)
        let fieldArrayType: 'string' | undefined;

        // Determine type based on the type of the current field in the schema
        switch (schema.obj[key].type) {
            case String: {
                fieldType = 'string';
                break;
            }
            // Cover both ways of denoting an array of strings
            case Array:
            case [String]: {
                fieldType = 'array';
                fieldArrayType = 'string';
                break;
            }
            default: {
                throw new Error('Unsupported type encountered in schema upon trying to convert to an EditableDocumentSkeleton');
            }
        }

        // Add the field to the skeleton
        Object.defineProperty(skeleton, key, {
            value: {
                alias: value.alias,
                prompt: value.prompt,
                type: fieldType,
                required: schema.obj[key].required,
                arrayType: fieldArrayType
            },
            writable: false,
            enumerable: true
        });
    }

    return skeleton;
}