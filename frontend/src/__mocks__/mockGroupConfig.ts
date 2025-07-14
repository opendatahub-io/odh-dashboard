import { GroupsConfig } from '#~/concepts/userConfigs/groupTypes';

export const mockGroupSettings = (): GroupsConfig => ({
  adminGroups: [
    {
      id: 0,
      name: 'odh-admins',
      enabled: true,
    },
    {
      id: 1,
      name: 'odh-admins-1',
      enabled: false,
    },
  ],
  allowedGroups: [
    {
      id: 0,
      name: 'odh-admins',
      enabled: false,
    },
    {
      id: 1,
      name: 'odh-admins-1',
      enabled: false,
    },
    {
      id: 2,
      name: 'system:authenticated',
      enabled: true,
    },
  ],
});
