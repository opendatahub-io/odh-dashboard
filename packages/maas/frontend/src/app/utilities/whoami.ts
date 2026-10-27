/* eslint-disable no-relative-import-paths/no-relative-import-paths -- Portal TS checks this shared utility across package boundaries. */
import { type MaaSWhoAmI } from '../types/whoami';

export const getMaaSWhoAmIDisplayName = (whoAmI: MaaSWhoAmI): string =>
  whoAmI.name?.trim() || whoAmI.email?.trim() || (whoAmI.isAdmin ? 'Admin' : 'User');
