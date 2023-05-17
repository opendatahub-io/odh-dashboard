import { genRandomChars } from '~/utilities/string';

export const genUID = (name: string) => `test-uid_${name}_${genRandomChars()}`;
