import axios from '~/utilities/axios';
import { GroupsConfig } from '~/concepts/userConfigs/groupTypes';

/**
 * @deprecated Use Auth Resource instead
 * @see fetchAuthGroups
 */
export const fetchGroupsSettings = (): Promise<GroupsConfig> => {
  const url = '/api/groups-config';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

/**
 * @deprecated Use Auth Resource instead
 * @see updateAuthGroups
 */
export const updateGroupsSettings = (settings: GroupsConfig): Promise<GroupsConfig> => {
  const url = '/api/groups-config';
  return axios
    .put(url, settings)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
