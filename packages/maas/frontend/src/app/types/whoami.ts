export type MaaSWhoAmI = {
  sub: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
  /** The caller's organization, for an organization-scoped identity (AI grid tenants). */
  orgId?: string;
  orgName?: string;
};
