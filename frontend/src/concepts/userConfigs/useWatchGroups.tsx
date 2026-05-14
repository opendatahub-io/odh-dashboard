import * as React from 'react';
import { GroupKind } from '#~/k8sTypes';
import { GroupsConfig } from '#~/concepts/userConfigs/groupTypes';
import { fetchAuthGroups } from '#~/concepts/userConfigs/utils';
import useNotification from '#~/utilities/useNotification';
import { useGroups } from '#~/api';

export const useWatchGroups = (): {
  groupSettings: GroupsConfig;
  setGroupSettings: (group: GroupsConfig) => void;
  availableGroups: GroupKind[];
  loaded: boolean;
  isLoading: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  const notification = useNotification();
  const [groupSettings, setGroupSettings] = React.useState<GroupsConfig>({
    adminGroups: [],
    allowedGroups: [],
  });
  const [groupsData, groupsDataLoaded] = useGroups();

  React.useEffect(() => {
    if (!groupsDataLoaded) {
      return;
    }
    setIsLoading(true);
    fetchAuthGroups(groupsData)
      .then((groupConfig) => {
        setGroupSettings(groupConfig);
        setLoadError(undefined);
        setLoaded(true);
      })
      .catch((error) => {
        notification.error(`Error`, `Error getting group settings`);
        setLoadError(error);
        setLoaded(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [notification, groupsDataLoaded, groupsData]);

  return {
    groupSettings,
    setGroupSettings,
    availableGroups: groupsData,
    loaded,
    isLoading,
    loadError,
  };
};
