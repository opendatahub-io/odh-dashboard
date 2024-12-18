import * as React from 'react';
import { GroupsConfig } from '~/concepts/userConfigs/groupTypes';
import { fetchGroupsSettings, updateGroupsSettings } from '~/services/groupSettingsService';
import {
  fetchAuthGroups,
  updateAuthGroups,
  useDoesUserHaveAuthAccess,
} from '~/concepts/userConfigs/utils';
import useNotification from '~/utilities/useNotification';
import { useGroups } from '~/api';

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
  const [canUpdateAuthResource, isAuthCheckDone] = useDoesUserHaveAuthAccess();
  const [groupsData, groupsDataLoaded] = useGroups();

  const hasDirectAccessDataLoaded = groupsDataLoaded && isAuthCheckDone;

  React.useEffect(() => {
    const fetchGroups = () => {
      setIsLoading(true);
      if (canUpdateAuthResource) {
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
      } else {
        // TODO: This path should be deprecated in RHOAI 2.17 -- remove once we fully move to Auth
        // eslint-disable-next-line no-console
        console.log(
          'This user does not have access to update the Auth resource -- falling back on reading OdhDashboardConfig',
        );
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
      }
    };

    if (hasDirectAccessDataLoaded) {
      fetchGroups();
    }
  }, [notification, canUpdateAuthResource, hasDirectAccessDataLoaded, groupsData]);

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
      if (canUpdateAuthResource) {
        updateAuthGroups(group, groupsData)
          .then((groupsResponse) => {
            setGroupSettings(groupsResponse);
          })
          .catch((error) => {
            setLoadError(error);
            setLoaded(false);
          })
          .finally(() => {
            setIsLoading(false);
            setIsGroupSettingsChanged(false);
          });
      } else {
        // TODO: This path should be deprecated in RHOAI 2.17 -- remove once we fully move to Auth
        // eslint-disable-next-line no-console
        console.log(
          'This user does not have access to update the Auth resource -- falling back on updating OdhDashboardConfig',
        );
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
      }
    },
    [canUpdateAuthResource, groupsData, notification],
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
