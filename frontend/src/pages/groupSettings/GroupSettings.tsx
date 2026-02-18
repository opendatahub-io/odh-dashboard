import * as React from 'react';
import {
  Alert,
  Button,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { isGroupEmpty } from '#~/utilities/utils';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import SettingSection from '#~/components/SettingSection';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import { useWatchGroups } from '#~/concepts/userConfigs/useWatchGroups';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { GroupsConfigField, GroupStatus } from '#~/concepts/userConfigs/groupTypes';

const CREATE_PREFIX = 'Define new group: ';
const newGroupMessage = (value: string): string => `${CREATE_PREFIX}"${value}"`;

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

  const adminDesc = `Select the groups that contain all ${ODH_PRODUCT_NAME} administrators.`;
  const userDesc = `Select the groups that contain all ${ODH_PRODUCT_NAME} users.`;

  const handleSaveButtonClicked = async () => {
    if (isLoading) {
      return;
    }
    updateGroups(groupSettings);
  };

  const handleMenuItemSelection = (newState: SelectionOptions[], field: GroupsConfigField) => {
    const processGroup = (opt: SelectionOptions): GroupStatus => ({
      id: String(opt.id),
      // Handle the create option situation -- show different in dropdown but not in selection
      name: opt.name.startsWith(CREATE_PREFIX) ? String(opt.id) : opt.name,
      enabled: opt.selected || false,
    });

    switch (field) {
      case GroupsConfigField.ADMIN:
        setGroupSettings({
          ...groupSettings,
          adminGroups: newState.map(processGroup),
        });
        break;
      case GroupsConfigField.USER:
        setGroupSettings({
          ...groupSettings,
          allowedGroups: newState.map(processGroup),
        });
        break;
    }
    setIsGroupSettingsChanged(true);
  };

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
          <SettingSection
            title={`${ODH_PRODUCT_NAME} administrator groups`}
            testId="data-science-administrator-groups"
            description={adminDesc}
            footer={
              <Alert
                data-testid="data-science-administrator-info"
                variant="info"
                isInline
                isPlain
                title={`All cluster admins are automatically assigned as ${ODH_PRODUCT_NAME} administrators.`}
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
              isCreatable
              createOptionMessage={newGroupMessage}
              isCreateOptionOnTop
            />
            <HelperText>
              <HelperTextItem>
                Select from existing groups, or specify a new group name.
              </HelperTextItem>
            </HelperText>
          </SettingSection>
        </StackItem>
        <StackItem>
          <SettingSection
            title={`${ODH_PRODUCT_NAME} user groups`}
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
              isCreatable
              createOptionMessage={newGroupMessage}
              isCreateOptionOnTop
            />
            <HelperText>
              <HelperTextItem>
                Select from existing groups, or specify a new group name.
              </HelperTextItem>
            </HelperText>
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
