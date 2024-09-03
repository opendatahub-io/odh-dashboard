export const EXTENSION_REGEX = /^\.[a-zA-Z0-9]+(^.[a-zA-Z0-9]+)?$/;

export const isDuplicateExtension = (index: number, values: string[]): boolean =>
  index !== 0 &&
  !!values.slice(0, index).find((val) => values[index].toLowerCase() === val.toLowerCase());
