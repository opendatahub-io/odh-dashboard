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
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { isGroupEmpty } from '#~/utilities/utils';
import SettingSection from '#~/components/SettingSection';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import { useWatchGroups } from '#~/concepts/userConfigs/useWatchGroups';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { GroupsConfigField } from '#~/concepts/userConfigs/groupTypes';

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

  const handleMenuItemSelection = (newState: SelectionOptions[], field: GroupsConfigField) => {
    switch (field) {
      case GroupsConfigField.ADMIN:
        setGroupSettings({
          ...groupSettings,
          adminGroups: newState.map((opt) => ({
            id: opt.id,
            name: opt.name,
            enabled: opt.selected || false,
          })),
        });
        break;
      case GroupsConfigField.USER:
        setGroupSettings({
          ...groupSettings,
          allowedGroups: newState.map((opt) => ({
            id: opt.id,
            name: opt.name,
            enabled: opt.selected || false,
          })),
        });
        break;
    }
    setIsGroupSettingsChanged(true);
  };

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="User management" objectType={ProjectObjectType.permissions} />}
      description="Define OpenShift group membership for Data Science administrators and users."
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage="Unable to load user management"
      emptyMessage="No user and group settings found"
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <SettingSection
            title="Data Science administrator groups"
            testId="data-science-administrator-groups"
            description={adminDesc}
            footer={
              <Alert
                data-testid="data-science-administrator-info"
                variant="info"
                isInline
                isPlain
                title="All cluster admins are automatically assigned as Data Science administrators."
              />
            }
          >
            <MultiSelection
              ariaLabel={adminDesc}
              toggleTestId="group-setting-select"
              value={groupSettings.adminGroups.map((g) => ({
                id: g.id,
                name: g.name,
                selected: g.enabled,
              }))}
              setValue={(newState) => handleMenuItemSelection(newState, GroupsConfigField.ADMIN)}
              selectionRequired
              noSelectedOptionsMessage="One or more group must be selected"
              popperProps={{ appendTo: document.body }}
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
                <HelperTextItem>
                  View, edit, or create groups in OpenShift under User Management
                </HelperTextItem>
              </HelperText>
            )}
          </SettingSection>
        </StackItem>
        <StackItem>
          <SettingSection
            title="Data Science user groups"
            description={userDesc}
            testId="data-science-user-groups"
          >
            <MultiSelection
              ariaLabel={userDesc}
              toggleTestId="group-setting-select"
              value={groupSettings.allowedGroups.map((g) => ({
                id: g.id,
                name: g.name,
                selected: g.enabled,
              }))}
              setValue={(newState) => handleMenuItemSelection(newState, GroupsConfigField.USER)}
              selectionRequired
              noSelectedOptionsMessage="One or more group must be selected"
              popperProps={{ appendTo: document.body }}
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
                <HelperTextItem>
                  View, edit, or create groups in OpenShift under User Management
                </HelperTextItem>
              </HelperText>
            )}
          </SettingSection>
        </StackItem>
        <StackItem>
          <Button
            data-id="save-button"
            data-testid="save-button"
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
