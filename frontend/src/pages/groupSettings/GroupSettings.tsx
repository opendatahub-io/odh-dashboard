import React, { useEffect, useState } from 'react';
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
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../redux/actions/actions';
import './GroupSettings.scss';
import { fetchGroupsSettings, updateGroupsSettings } from 'services/groupSettingsService';
import { GroupsConfig, GroupsConfigField, MenuItemStatus } from 'types';
import { MenuOptionMultiSelect } from 'components/MultiSelection';

const TITLE = `User and group settings`;
const DESCRIPTION = `Define OpenShift group membership for Data Science administrators and users.`;
const ERROR_MESSAGE = `Unable to load User and group settings`;
const EMPTY_MESSAGE = `No user and group settings found`;
const ADMIN_FORM_TITLE = `Data Science administrator groups`;
const ADMIN_FORM_DESCRIPTION = `Select the OpenShift groups that contain all Data Science administrators.`;
const USER_FORM_TITLE = `Data Science user groups`;
const USER_FORM_DESCRIPTION = `Select the OpenShift groups that contain all Data Science users.`;
const CARD_FOOTER = `View, edit, or create groups in OpenShift under User Management`;
const BUTTON_LABEL = `Save changes`;
const ALERT_TITLE = `Group no longer exists`;

const GroupSettings: React.FC = () => {
  const isEmpty = false;
  const [isLoadingButton, setIsLoadingButton] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<Error | undefined>(undefined);
  const [isGroupSettingsChanged, setIsGroupSettingsChanged] = useState<boolean>(false);
  const [groupSettings, setGroupSettings] = useState<GroupsConfig>({
    adminGroups: [],
    userGroups: [],
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupSettings = await fetchGroupsSettings();
        setGroupSettings(groupSettings);
        createMissingGroupAlert(groupSettings);
        refreshStateAfterUpdate();
      } catch (error) {
        if (error instanceof Error) setLoadError(error);
      }
    };

    fetchGroups();
  }, []);

  const handleSaveButtonClicked = async () => {
    if (isLoadingButton) return;
    try {
      setIsLoadingButton(true);
      const response = await updateGroupsSettings(groupSettings);
      if (response.success) {
        setGroupSettings(response.success);
        createMissingGroupAlert(response.success);
        dispatch(
          addNotification({
            status: 'success',
            title: 'Group settings changes saved',
            timestamp: new Date(),
          }),
        );
      }
      refreshStateAfterUpdate();
    } catch (error) {
      if (error instanceof Error) {
        dispatch(
          addNotification({
            status: 'danger',
            title: 'Error',
            message: 'Error updating group settings',
            timestamp: new Date(),
          }),
        );
      }
      setIsLoadingButton(false);
    }
  };

  const createMissingGroupAlert = (groupsConfig: GroupsConfig) => {
    if (groupsConfig.errorAdmin) {
      dispatch(
        addNotification({
          status: 'warning',
          title: ALERT_TITLE,
          message: groupsConfig.errorAdmin,
          timestamp: new Date(),
        }),
      );
    }

    if (groupsConfig.errorUser) {
      dispatch(
        addNotification({
          status: 'warning',
          title: ALERT_TITLE,
          message: groupsConfig.errorUser,
          timestamp: new Date(),
        }),
      );
    }
  };

  const refreshStateAfterUpdate = () => {
    setLoaded(true);
    setLoadError(undefined);
    setIsLoadingButton(false);
    setIsGroupSettingsChanged(false);
  };

  const handleMenuItemSelection = (newState: MenuItemStatus[], field: GroupsConfigField) => {
    switch (+field) {
      case GroupsConfigField.ADMIN:
        setGroupSettings({ ...groupSettings, adminGroups: newState });
        break;
      case GroupsConfigField.USER:
        setGroupSettings({ ...groupSettings, userGroups: newState });
        break;
    }
    setIsGroupSettingsChanged(true);
  };

  const isGroupEmpty = (groupList: MenuItemStatus[]): boolean => {
    return groupList.filter((element) => element.enabled).length === 0;
  };

  return (
    <ApplicationsPage
      title={TITLE}
      description={DESCRIPTION}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
      errorMessage={ERROR_MESSAGE}
      emptyMessage={EMPTY_MESSAGE}
    >
      {!isEmpty ? (
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
            <FormGroup fieldId="admin-groups" label={ADMIN_FORM_TITLE}>
              <Text>{ADMIN_FORM_DESCRIPTION}</Text>
              <MenuOptionMultiSelect
                initialState={groupSettings.adminGroups}
                onChange={(newState) => handleMenuItemSelection(newState, GroupsConfigField.ADMIN)}
              />
              {!groupSettings.errorAdmin && (
                <HelperText>
                  <HelperTextItem variant="indeterminate">{CARD_FOOTER}</HelperTextItem>
                </HelperText>
              )}
              {groupSettings.errorAdmin && (
                <Alert
                  isInline
                  variant="warning"
                  title={ALERT_TITLE}
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

            <FormGroup fieldId="user-groups" label={USER_FORM_TITLE}>
              <Text>{USER_FORM_DESCRIPTION}</Text>
              <MenuOptionMultiSelect
                initialState={groupSettings.userGroups}
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
                  title={ALERT_TITLE}
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
                  isGroupEmpty(groupSettings.userGroups)
                }
                variant="primary"
                isLoading={isLoadingButton}
                onClick={handleSaveButtonClicked}
              >
                {BUTTON_LABEL}
              </Button>
            </ActionGroup>
          </Form>
        </PageSection>
      ) : null}
    </ApplicationsPage>
  );
};

export default GroupSettings;
