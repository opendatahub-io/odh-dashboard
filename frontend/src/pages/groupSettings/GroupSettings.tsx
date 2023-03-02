import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { isGroupEmpty } from '~/utilities/utils';
import SettingSection from '~/components/SettingSection';
import { MultiSelection } from '~/components/MultiSelection';
import { useWatchGroups } from '~/utilities/useWatchGroups';
import { GroupsConfigField, MenuItemStatus } from './groupTypes';

const GroupSettings: React.FC = () => {
  const {
    groupSettings,
    loaded,
    isLoading,
    isGroupSettingsChanged,
    loadError,
    updateGroups,
    setGroupSettings,
    setIsGroupSettingsChanged,
  } = useWatchGroups();

  const adminDesc = 'Select the OpenShift groups that contain all Data Science administrators.';
  const userDesc = 'Select the OpenShift groups that contain all Data Science users.';

  const handleSaveButtonClicked = async () => {
    if (isLoading) {
      return;
    }
    updateGroups(groupSettings);
  };

  const handleMenuItemSelection = (newState: MenuItemStatus[], field: GroupsConfigField) => {
    switch (field) {
      case GroupsConfigField.ADMIN:
        setGroupSettings({ ...groupSettings, adminGroups: newState });
        break;
      case GroupsConfigField.USER:
        setGroupSettings({ ...groupSettings, allowedGroups: newState });
        break;
    }
    setIsGroupSettingsChanged(true);
  };

  return (
    <ApplicationsPage
      title="User and group settings"
      description="Define OpenShift group membership for Data Science administrators and users."
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage="Unable to load user and group settings"
      emptyMessage="No user and group settings found"
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <SettingSection
            title="Data Science administrator groups"
            description={adminDesc}
            footer={
              <Alert
                variant="info"
                isInline
                isPlain
                title="All cluster admins are automatically assigned as Data Science administrators."
              />
            }
          >
            <MultiSelection
              ariaLabel={adminDesc}
              value={groupSettings.adminGroups}
              setValue={(newState) => handleMenuItemSelection(newState, GroupsConfigField.ADMIN)}
            />
            {groupSettings.errorAdmin ? (
              <Alert
                isInline
                variant="warning"
                title="Group error"
                actionClose={
                  <AlertActionCloseButton
                    onClose={() => setGroupSettings({ ...groupSettings, errorAdmin: undefined })}
                  />
                }
              >
                <p>{groupSettings.errorAdmin}</p>
              </Alert>
            ) : (
              <HelperText>
                <HelperTextItem variant="indeterminate">
                  View, edit, or create groups in OpenShift under User Management
                </HelperTextItem>
              </HelperText>
            )}
          </SettingSection>
        </StackItem>
        <StackItem>
          <SettingSection title="Data Science user groups" description={userDesc}>
            <MultiSelection
              ariaLabel={userDesc}
              value={groupSettings.allowedGroups}
              setValue={(newState) => handleMenuItemSelection(newState, GroupsConfigField.USER)}
            />
            {groupSettings.errorUser ? (
              <Alert
                isInline
                variant="warning"
                title="Group error"
                actionClose={
                  <AlertActionCloseButton
                    onClose={() => setGroupSettings({ ...groupSettings, errorUser: undefined })}
                  />
                }
              >
                <p>{groupSettings.errorUser}</p>
              </Alert>
            ) : (
              <HelperText>
                <HelperTextItem variant="indeterminate">
                  View, edit, or create groups in OpenShift under User Management
                </HelperTextItem>
              </HelperText>
            )}
          </SettingSection>
        </StackItem>
        <StackItem>
          <Button
            data-id="save-button"
            isDisabled={
              isLoading ||
              !isGroupSettingsChanged ||
              isGroupEmpty(groupSettings.adminGroups) ||
              isGroupEmpty(groupSettings.allowedGroups)
            }
            variant="primary"
            isLoading={isLoading}
            onClick={handleSaveButtonClicked}
          >
            Save changes
          </Button>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default GroupSettings;
