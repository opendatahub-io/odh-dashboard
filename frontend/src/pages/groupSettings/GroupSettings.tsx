import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { useWatchGroups } from '#~/concepts/userConfigs/useWatchGroups';
import { updateAuthGroups } from '#~/concepts/userConfigs/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { GroupsConfig, GroupsConfigField } from '#~/concepts/userConfigs/groupTypes';
import useNotification from '#~/utilities/useNotification';
import GroupSettingsSection from './GroupSettingsSection';

const GroupSettings: React.FC = () => {
  const { groupSettings, setGroupSettings, availableGroups, loaded, isLoading, loadError } =
    useWatchGroups();
  const notification = useNotification();

  const enabledAdminGroups = groupSettings.adminGroups.filter((g) => g.enabled).map((g) => g.name);
  const enabledUserGroups = groupSettings.allowedGroups.filter((g) => g.enabled).map((g) => g.name);

  const saveSettings = React.useCallback(
    async (newSettings: GroupsConfig): Promise<void> => {
      const updated = await updateAuthGroups(newSettings, availableGroups);
      setGroupSettings(updated);
      notification.success('Group settings changes saved');
    },
    [availableGroups, setGroupSettings, notification],
  );

  const handleAdd = React.useCallback(
    (name: string, field: GroupsConfigField): Promise<void> => {
      const key = field === GroupsConfigField.ADMIN ? 'adminGroups' : 'allowedGroups';
      const newSettings: GroupsConfig = {
        ...groupSettings,
        [key]: [
          ...groupSettings[key].filter((g) => g.name !== name),
          { id: name, name, enabled: true },
        ],
      };
      return saveSettings(newSettings);
    },
    [groupSettings, saveSettings],
  );

  const handleRemove = React.useCallback(
    (name: string, field: GroupsConfigField): Promise<void> => {
      const key = field === GroupsConfigField.ADMIN ? 'adminGroups' : 'allowedGroups';
      const newSettings: GroupsConfig = {
        ...groupSettings,
        [key]: groupSettings[key].map((g) => (g.name === name ? { ...g, enabled: false } : g)),
      };
      return saveSettings(newSettings);
    },
    [groupSettings, saveSettings],
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="User management" objectType={ProjectObjectType.permissions} />}
      description={`Define group membership for ${ODH_PRODUCT_NAME} administrators and users.`}
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage="Unable to load user management"
      emptyMessage="No user and group settings found"
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <GroupSettingsSection
            title={`${ODH_PRODUCT_NAME} administrator groups`}
            description={`These groups contain all ${ODH_PRODUCT_NAME} administrators.`}
            infoMessage={`All cluster admins are automatically assigned as ${ODH_PRODUCT_NAME} administrators.`}
            enabledGroupNames={enabledAdminGroups}
            availableGroups={availableGroups}
            onAdd={(name) => handleAdd(name, GroupsConfigField.ADMIN)}
            onRemove={(name) => handleRemove(name, GroupsConfigField.ADMIN)}
            isLoading={isLoading}
            addButtonLabel="Add administrator group"
            placeholderText="Select or type administrator group name"
            testId="data-science-administrator-groups"
          />
        </StackItem>
        <StackItem>
          <GroupSettingsSection
            title={`${ODH_PRODUCT_NAME} user groups`}
            description={`These groups contain all ${ODH_PRODUCT_NAME} users.`}
            enabledGroupNames={enabledUserGroups}
            availableGroups={availableGroups}
            onAdd={(name) => handleAdd(name, GroupsConfigField.USER)}
            onRemove={(name) => handleRemove(name, GroupsConfigField.USER)}
            isLoading={isLoading}
            addButtonLabel="Add user group"
            placeholderText="Select or type user group name"
            testId="data-science-user-groups"
          />
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default GroupSettings;
