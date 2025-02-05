export const EXTENSION_REGEX = /^\.[a-zA-Z0-9]+(^.[a-zA-Z0-9]+)?$/;

export const URI_SCHEME_REGEX = /^[A-Za-z][A-Za-z0-9+.-]*:(\/\/)?$/;

export const isDuplicateExtension = (index: number, values: string[]): boolean =>
  index !== 0 &&
  values.slice(0, index).some((val) => values[index].toLowerCase() === val.toLowerCase());
