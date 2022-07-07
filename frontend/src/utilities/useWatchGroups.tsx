import * as React from 'react';
import { GroupsConfig } from 'pages/groupSettings/GroupTypes';
import { fetchGroupsSettings, updateGroupsSettings } from 'services/groupSettingsService';
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
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isGroupSettingsChanged, setIsGroupSettingsChanged] = React.useState<boolean>(false);
  const notification = useNotification();
  const [groupSettings, setGroupSettings] = React.useState<GroupsConfig>({
    adminGroups: [],
    allowedGroups: [],
  });

  React.useEffect(() => {
    const fetchGroups = () => {
      setIsLoading(true);
      fetchGroupsSettings()
        .then((groupsResponse) => {
          setGroupSettings(groupsResponse);
          createMissingGroupAlert(groupsResponse);
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
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateGroups = (group: GroupsConfig) => {
    setIsLoading(true);
    updateGroupsSettings(group)
      .then((response) => {
        if (response.success) {
          setGroupSettings(response.success);
          createMissingGroupAlert(response.success);
          notification.success('Group settings changes saved');
        }
      })
      .catch((error) => {
        setLoadError(error);
        setLoaded(false);
      })
      .finally(() => {
        setIsLoading(false);
        setIsGroupSettingsChanged(false);
      });
  };

  const createMissingGroupAlert = (groupsConfig: GroupsConfig) => {
    if (groupsConfig.errorAdmin) {
      notification.error(`Group no longer exists`, groupsConfig.errorAdmin);
    }
    if (groupsConfig.errorUser) {
      notification.error(`Group no longer exists`, groupsConfig.errorUser);
    }
  };

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
