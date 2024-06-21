import axios from '~/utilities/axios';
import { GroupsConfig } from '~/pages/groupSettings/groupTypes';

export const fetchGroupsSettings = (): Promise<GroupsConfig> => {
  const url = '/api/groups-config';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateGroupsSettings = (settings: GroupsConfig): Promise<GroupsConfig> => {
  const url = '/api/groups-config';
  return axios
    .put(url, settings)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
