import * as React from 'react';
import {
  ActionGroup,
  Button,
  Form,
  PageSection,
  PageSectionVariants,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { GroupsConfigField, MenuItemStatus } from './groupTypes';
import { useWatchGroups } from 'utilities/useWatchGroups';
import { FormGroupSettings } from 'components/FormGroupSettings';
import './GroupSettings.scss';
import { isGroupEmpty } from 'utilities/utils';

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

  return (
    <ApplicationsPage
      title={`User and group settings`}
      description={`Define OpenShift group membership for Data Science administrators and users.`}
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage={`Unable to load user and group settings`}
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
            <FormGroupSettings
              title="Data Science administrator groups"
              body="Select the OpenShift groups that contain all Data Science administrators."
              groupsField={GroupsConfigField.ADMIN}
              items={groupSettings.adminGroups}
              error={groupSettings.errorAdmin}
              handleMenuItemSelection={handleMenuItemSelection}
              handleClose={() => {
                setGroupSettings({ ...groupSettings, errorAdmin: undefined });
              }}
            />
            <FormGroupSettings
              title="Data Science user groups"
              body="Select the OpenShift groups that contain all Data Science users."
              groupsField={GroupsConfigField.USER}
              items={groupSettings.allowedGroups}
              error={groupSettings.errorUser}
              handleMenuItemSelection={handleMenuItemSelection}
              handleClose={() => {
                setGroupSettings({ ...groupSettings, errorUser: undefined });
              }}
            />

            <ActionGroup>
              <Button
                data-id="save-button"
                isDisabled={
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
            </ActionGroup>
          </Form>
        </PageSection>
      )}
    </ApplicationsPage>
  );
};

export default GroupSettings;
