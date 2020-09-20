// Does pretty much what you'd expect it to
export function capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Takes an array of strings and returns its fully lowercase equivalent
export function arrayToLowerCase(array: string[]): string[] {
    const newArray: string[] = [];
    array.forEach(element => {
        newArray.push(element.toLowerCase());
    });
    return newArray;
}

// Joins an array by a given string, and uses comma separation by default if no delimiter is provided
export function safeArrayJoin(array: unknown[], delimiter?: string): string {
    return array.join(delimiter ? delimiter : ', ');
}

// Takes either a string value or an array of strings and converts it to a single string
export function joinIfArray(value: string | string[] | undefined, delimiter?: string): string | undefined {
    return Array.isArray(value) ? safeArrayJoin(value, delimiter) : value;
}

// Get the number of occurrences of a given element in a given array
export function arrayElementCount<T>(array: T[], element: T): number {
    let count = 0;
    for (const current of array) {
        if (current === element) {
            count++;
        }
    }
    return count;
}