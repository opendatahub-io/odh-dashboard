import * as React from 'react';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  PageSection,
  PageSectionVariants,
  Text,
  HelperText,
  HelperTextItem,
  Alert,
  AlertActionCloseButton,
  Hint,
  HintBody,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import './GroupSettings.scss';
import { GroupsConfigField, MenuItemStatus } from './GroupTypes';
import { MenuOptionMultiSelect } from 'components/MultiSelection';
import { useWatchGroups } from 'utilities/useWatchGroups';

const CARD_FOOTER = `View, edit, or create groups in OpenShift under User Management`;

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

  const handleSaveButtonClicked = async () => {
    if (isLoading) return;
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

  const isGroupEmpty = (groupList: MenuItemStatus[]): boolean => {
    return groupList.filter((element) => element.enabled).length === 0;
  };

  return (
    <ApplicationsPage
      title={`User and group settings`}
      description={`Define OpenShift group membership for Data Science administrators and users.`}
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage={`Unable to load User and group settings`}
      emptyMessage={`No user and group settings found`}
    >
      {loaded && (
        <PageSection
          className="odh-cluster-settings"
          variant={PageSectionVariants.light}
          padding={{ default: 'noPadding' }}
        >
          <Form
            className="odh-cluster-settings__form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <FormGroup fieldId="admin-groups" label={`Data Science administrator groups`}>
              <Text>{`Select the OpenShift groups that contain all Data Science administrators.`}</Text>
              <MenuOptionMultiSelect
                initialState={groupSettings.adminGroups}
                onChange={(newState) => handleMenuItemSelection(newState, GroupsConfigField.ADMIN)}
              />
              {!groupSettings.errorAdmin && (
                <>
                  <HelperText>
                    <HelperTextItem variant="indeterminate">{CARD_FOOTER}</HelperTextItem>
                  </HelperText>
                  <Hint>
                    <HintBody>
                      All cluster admins are automatically assigned as Data Science administrators.
                    </HintBody>
                  </Hint>
                </>
              )}
              {groupSettings.errorAdmin && (
                <Alert
                  isInline
                  variant="warning"
                  title={`Group no longer exists`}
                  actionClose={
                    <AlertActionCloseButton
                      onClose={() => {
                        setGroupSettings({ ...groupSettings, errorAdmin: undefined });
                      }}
                    />
                  }
                >
                  <p>{groupSettings.errorAdmin}</p>
                </Alert>
              )}
            </FormGroup>

            <FormGroup fieldId="user-groups" label={`Data Science user groups`}>
              <Text>{`Select the OpenShift groups that contain all Data Science users.`}</Text>
              <MenuOptionMultiSelect
                initialState={groupSettings.allowedGroups}
                onChange={(newState) => handleMenuItemSelection(newState, GroupsConfigField.USER)}
              />
              {!groupSettings.errorUser && (
                <HelperText>
                  <HelperTextItem variant="indeterminate">{CARD_FOOTER}</HelperTextItem>
                </HelperText>
              )}
              {groupSettings.errorUser && (
                <Alert
                  isInline
                  variant="warning"
                  title={`Group no longer exists`}
                  actionClose={
                    <AlertActionCloseButton
                      onClose={() => {
                        setGroupSettings({ ...groupSettings, errorUser: undefined });
                      }}
                    />
                  }
                >
                  <p>{groupSettings.errorUser}</p>
                </Alert>
              )}
            </FormGroup>

            <ActionGroup>
              <Button
                isDisabled={
                  !isGroupSettingsChanged ||
                  isGroupEmpty(groupSettings.adminGroups) ||
                  isGroupEmpty(groupSettings.allowedGroups)
                }
                variant="primary"
                isLoading={isLoading}
                onClick={handleSaveButtonClicked}
              >
                {`Save changes`}
              </Button>
            </ActionGroup>
          </Form>
        </PageSection>
      )}
    </ApplicationsPage>
  );
};

export default GroupSettings;
