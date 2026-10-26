import { MAAS_ORGS_CLAIM, type MaaSWhoAmI } from '~/app/types/whoami';

export const isMaaSAdmin = (whoAmI: MaaSWhoAmI): boolean =>
  whoAmI[MAAS_ORGS_CLAIM].some((org) => org.roles.includes('admins'));

export const getMaaSWhoAmIDisplayName = (whoAmI: MaaSWhoAmI): string =>
  whoAmI.name?.trim() || whoAmI.email?.trim() || (isMaaSAdmin(whoAmI) ? 'Admin' : 'User');
