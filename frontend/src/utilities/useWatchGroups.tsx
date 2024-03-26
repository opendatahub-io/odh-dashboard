import * as React from 'react';
import { GroupsConfig } from '~/pages/groupSettings/groupTypes';
import { fetchGroupsSettings, updateGroupsSettings } from '~/services/groupSettingsService';
import useNotification from './useNotification';

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
  const { errorAdmin, errorUser } = groupSettings;

  React.useEffect(() => {
    const fetchGroups = () => {
      setIsLoading(true);
      fetchGroupsSettings()
        .then((groupsResponse) => {
          setGroupSettings(groupsResponse);
          setLoadError(undefined);
          setLoaded(true);
        })
        .catch((error) => {
          notification.error(`Error`, `Error updating group settings`);
          setLoadError(error);
          setLoaded(false);
        })
        .finally(() => {
          setIsLoading(false);
          setIsGroupSettingsChanged(false);
        });
    };
    fetchGroups();
  }, [notification]);

  React.useEffect(() => {
    if (errorAdmin) {
      notification.error(`Group error`, errorAdmin);
    }
    if (errorUser) {
      notification.error(`Group error`, errorUser);
    }
  }, [errorAdmin, errorUser, notification]);

  const updateGroups = React.useCallback(
    (group: GroupsConfig) => {
      setIsLoading(true);
      updateGroupsSettings(group)
        .then((response) => {
          setGroupSettings(response);
          notification.success(
            'Group settings changes saved',
            'It may take up to 2 minutes for configuration changes to be applied.',
          );
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
    [notification],
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
