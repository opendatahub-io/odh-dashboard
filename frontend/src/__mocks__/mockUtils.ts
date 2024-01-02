import { genRandomChars } from '~/utilities/string';

export const genUID = (name: string): string => `test-uid_${name}_${genRandomChars()}`;
