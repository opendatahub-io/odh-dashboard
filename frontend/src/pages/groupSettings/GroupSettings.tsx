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
import { validateGroupName } from '#~/api';

const newGroupMessage = (value: string): string => `Define new group: "${value}"`;

const GroupSettings: React.FC = () => {
  const {
    groupSettings,
    loaded,
    isLoading,
    isGroupSettingsChanged,
    isGroupsTruncated,
    loadError,
    updateGroups,
    setGroupSettings,
    setIsGroupSettingsChanged,
  } = useWatchGroups();
  const [invalidGroups, setInvalidGroups] = React.useState<Set<string>>(new Set());
  const [validatingGroups, setValidatingGroups] = React.useState<Set<string>>(new Set());

  const adminDesc = `Select the groups that contain all ${ODH_PRODUCT_NAME} administrators.`;
  const userDesc = `Select the groups that contain all ${ODH_PRODUCT_NAME} users.`;

  const handleSaveButtonClicked = async () => {
    if (isLoading) {
      return;
    }
    updateGroups(groupSettings);
  };

  const validateCustomGroup = React.useCallback(
    async (groupName: string) => {
      setValidatingGroups((prev) => new Set(prev).add(groupName));
      const exists = await validateGroupName(groupName);
      setValidatingGroups((prev) => {
        const next = new Set(prev);
        next.delete(groupName);
        return next;
      });
      if (!exists) {
        setInvalidGroups((prev) => new Set(prev).add(groupName));
      } else {
        setInvalidGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupName);
          return next;
        });
      }
    },
    [],
  );

  const handleMenuItemSelection = (newState: SelectionOptions[], field: GroupsConfigField) => {
    const processGroup = (opt: SelectionOptions): GroupStatus => ({
      id: String(opt.id),
      name: opt.name,
      enabled: opt.selected || false,
    });

    const processedGroups = newState.map(processGroup);

    // Find newly created groups (name starts with CREATE_PREFIX indicates a new selection)
    const currentGroups =
      field === GroupsConfigField.ADMIN ? groupSettings.adminGroups : groupSettings.allowedGroups;
    const currentIds = new Set(currentGroups.map((g) => g.id));
    const newlyAdded = processedGroups.filter((g) => g.enabled && !currentIds.has(g.id));

    // Validate newly created custom groups
    newlyAdded.forEach((g) => {
      validateCustomGroup(g.name);
    });

    switch (field) {
      case GroupsConfigField.ADMIN:
        setGroupSettings({
          ...groupSettings,
          adminGroups: processedGroups,
        });
        break;
      case GroupsConfigField.USER:
        setGroupSettings({
          ...groupSettings,
          allowedGroups: processedGroups,
        });
        break;
    }
    setIsGroupSettingsChanged(true);
  };

  const invalidGroupWarning =
    invalidGroups.size > 0 ? (
      <Alert
        variant="warning"
        isInline
        isPlain
        title={`The following groups were not found on the cluster: ${[...invalidGroups].join(', ')}. They will still be saved.`}
        data-testid="invalid-group-warning"
      />
    ) : null;

  const helperTextContent = isGroupsTruncated
    ? 'Only the first 250 groups are listed. Type a group name to add groups not shown.'
    : 'Select from existing groups, or specify a new group name.';

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
            description={
              isGroupsTruncated ? (
                <>
                  {adminDesc}
                  <Alert
                    variant="info"
                    isInline
                    isPlain
                    title="Only the first 250 groups are shown. Type a group name to add a group that is not listed."
                    data-testid="admin-groups-truncation-alert"
                    className="pf-v6-u-mt-sm"
                  />
                </>
              ) : (
                adminDesc
              )
            }
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
              <HelperTextItem>{helperTextContent}</HelperTextItem>
            </HelperText>
          </SettingSection>
        </StackItem>
        <StackItem>
          <SettingSection
            title={`${ODH_PRODUCT_NAME} user groups`}
            description={
              isGroupsTruncated ? (
                <>
                  {userDesc}
                  <Alert
                    variant="info"
                    isInline
                    isPlain
                    title="Only the first 250 groups are shown. Type a group name to add a group that is not listed."
                    data-testid="user-groups-truncation-alert"
                    className="pf-v6-u-mt-sm"
                  />
                </>
              ) : (
                userDesc
              )
            }
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
              <HelperTextItem>{helperTextContent}</HelperTextItem>
            </HelperText>
          </SettingSection>
        </StackItem>
        {invalidGroupWarning && <StackItem>{invalidGroupWarning}</StackItem>}
        <StackItem>
          <Button
            data-id="save-button"
            data-testid="save-button"
            isDisabled={
              isLoading ||
              !isGroupSettingsChanged ||
              validatingGroups.size > 0 ||
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
