export const MAAS_ORGS_CLAIM = 'https://redhat.com/maas/orgs';

export type MaaSOrg = {
  organization_id: string;
  organization_name?: string;
  roles: string[];
};

export type MaaSMe = {
  sub: string;
  email?: string;
  name?: string;
  [MAAS_ORGS_CLAIM]: MaaSOrg[];
};
