import { hasDuplicates } from '../../utility/arraysAndSuch';

export default interface SchemaFieldRestrictions {
    defaultValue: unknown,
    nonNegative?: boolean,
    maxListSize?: number,
    allowDuplicates?: boolean
}

export enum IllegalValueError {
    negative,
    maxLengthExceeded,
    wrongType,
    duplicateEntry
}

// Checks if a value is valid in accordance with a given set of field restrictions
export function findRestrictedFieldValueErrors(value: unknown, restrictions: SchemaFieldRestrictions): IllegalValueError | undefined {
    if (restrictions.nonNegative !== undefined) {
        if (typeof value !== "number") {
            return IllegalValueError.wrongType;
        }

        if (restrictions.nonNegative) {
            if (value < 0) {
                return IllegalValueError.negative;
            }
        }
    }

    if (restrictions.maxListSize !== undefined) {
        if (!Array.isArray(value)) {
            return IllegalValueError.wrongType;
        }

        if (value.length > restrictions.maxListSize) {
            return IllegalValueError.maxLengthExceeded;
        }
    }

    if (restrictions.allowDuplicates !== undefined) {
        if (!Array.isArray(value)) {
            return IllegalValueError.wrongType;
        }

        if (!restrictions.allowDuplicates && hasDuplicates(value)) {
            return IllegalValueError.duplicateEntry;
        }
    }

    return;
}