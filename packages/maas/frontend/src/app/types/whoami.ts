export const MAAS_ORGS_CLAIM = 'https://redhat.com/maas/orgs';

export type MaaSOrg = {
  organization_id: string;
  organization_name?: string;
  roles: string[];
};

export type MaaSWhoAmI = {
  sub: string;
  email?: string;
  name?: string;
  [MAAS_ORGS_CLAIM]: MaaSOrg[];
};

export const isMaaSAdmin = (whoAmI: MaaSWhoAmI): boolean =>
  whoAmI[MAAS_ORGS_CLAIM].some((org) => org.roles.includes('admins'));

export const getMaaSWhoAmIDisplayName = (whoAmI: MaaSWhoAmI): string =>
  whoAmI.name?.trim() || whoAmI.email?.trim() || (isMaaSAdmin(whoAmI) ? 'Admin' : 'User');
