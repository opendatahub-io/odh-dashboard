import * as React from 'react';
import { GroupsConfig } from '#~/concepts/userConfigs/groupTypes';
import { fetchAuthGroups, updateAuthGroups } from '#~/concepts/userConfigs/utils';
import useNotification from '#~/utilities/useNotification';
import { useGroups } from '#~/api';

export const useWatchGroups = (): {
  groupSettings: GroupsConfig;
  loaded: boolean;
  isLoading: boolean;
  isGroupSettingsChanged: boolean;
  loadError: Error | undefined;
  updateGroups: (group: GroupsConfig) => void;
  setGroupSettings: (group: GroupsConfig) => void;
  setIsGroupSettingsChanged: (changed: boolean) => void;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGroupSettingsChanged, setIsGroupSettingsChanged] = React.useState(false);
  const notification = useNotification();
  const [groupSettings, setGroupSettings] = React.useState<GroupsConfig>({
    adminGroups: [],
    allowedGroups: [],
  });
  const [groupsData, groupsDataLoaded] = useGroups();

  const hasDirectAccessDataLoaded = groupsDataLoaded;

  React.useEffect(() => {
    const fetchGroups = () => {
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
          setIsGroupSettingsChanged(false);
        });
    };

    if (hasDirectAccessDataLoaded) {
      fetchGroups();
    }
  }, [notification, hasDirectAccessDataLoaded, groupsData]);

  const updateGroups = React.useCallback(
    (group: GroupsConfig) => {
      setIsLoading(true);
      updateAuthGroups(group, groupsData)
        .then((groupsResponse) => {
          setGroupSettings(groupsResponse);
          notification.success('Group settings changes saved');
        })
        .catch((error) => {
          setLoadError(error);
          setLoaded(false);
        })
        .finally(() => {
          setIsLoading(false);
          setIsGroupSettingsChanged(false);
        });
    },
    [groupsData, notification],
  );

  return {
    groupSettings,
    loaded,
    isLoading,
    isGroupSettingsChanged,
    loadError,
    updateGroups,
    setGroupSettings,
    setIsGroupSettingsChanged,
  };
};
