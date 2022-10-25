import * as React from 'react';
import * as _ from 'lodash-es';
import {
  ActionGroup,
  Button,
  ButtonVariant,
  Checkbox,
  TextVariants,
  Form,
  FormGroup,
  InputGroup,
  InputGroupText,
  InputGroupTextVariant,
  PageSection,
  PageSectionVariants,
  Text,
  TextInput,
  HelperText,
  HelperTextItem,
  Radio,
  ValidatedOptions,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { useAppContext } from '../../app/AppContext';
import { fetchClusterSettings, updateClusterSettings } from '../../services/clusterSettingsService';
import { ClusterSettings, NotebookTolerationFormSettings } from '../../types';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../redux/actions/actions';
import {
  DEFAULT_CONFIG,
  DEFAULT_PVC_SIZE,
  DEFAULT_CULLER_TIMEOUT,
  MIN_PVC_SIZE,
  MAX_PVC_SIZE,
  CULLER_TIMEOUT_LIMITED,
  CULLER_TIMEOUT_UNLIMITED,
  MAX_MINUTE,
  MIN_MINUTE,
  MIN_HOUR,
  MAX_HOUR,
  DEFAULT_HOUR,
  MIN_CULLER_TIMEOUT,
} from './const';
import { getTimeoutByHourAndMinute, getHourAndMinuteByTimeout } from '../../utilities/utils';
import { useCheckJupyterEnabled } from '../../utilities/notebookControllerUtils';

import './ClusterSettings.scss';

const description = `Update global settings for all users.`;

const DEFAULT_TOLERATION_VALUE = 'NotebooksOnly';
const TOLERATION_FORMAT = /^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/;
const TOLERATION_FORMAT_ERROR =
  "Toleration key must consist of alphanumeric characters, '-', '_' or '.', and must start and end with an alphanumeric character.";

const ClusterSettings: React.FC = () => {
  const isEmpty = false;
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [clusterSettings, setClusterSettings] = React.useState(DEFAULT_CONFIG);
  const [pvcSize, setPvcSize] = React.useState<number | string>(DEFAULT_PVC_SIZE);
  const [userTrackingEnabled, setUserTrackingEnabled] = React.useState<boolean>(false);
  const [cullerTimeoutChecked, setCullerTimeoutChecked] =
    React.useState<string>(CULLER_TIMEOUT_UNLIMITED);
  const [cullerTimeout, setCullerTimeout] = React.useState<number>(DEFAULT_CULLER_TIMEOUT);
  const [hour, setHour] = React.useState<number>(DEFAULT_HOUR);
  const [minute, setMinute] = React.useState<number>(0);
  const pvcDefaultBtnRef = React.useRef<HTMLButtonElement>();
  const { dashboardConfig } = useAppContext();
  const isJupyterEnabled = useCheckJupyterEnabled();
  const [notebookTolerationSettings, setNotebookTolerationSettings] =
    React.useState<NotebookTolerationFormSettings>({
      enabled: false,
      key: isJupyterEnabled ? DEFAULT_TOLERATION_VALUE : '',
    });
  const dispatch = useDispatch();

  React.useEffect(() => {
    fetchClusterSettings()
      .then((clusterSettings: ClusterSettings) => {
        setLoaded(true);
        setLoadError(undefined);
        setClusterSettings(clusterSettings);
        setPvcSize(clusterSettings.pvcSize);
        if (clusterSettings.notebookTolerationSettings) {
          setNotebookTolerationSettings(clusterSettings.notebookTolerationSettings);
        }
        if (clusterSettings.cullerTimeout !== DEFAULT_CULLER_TIMEOUT) {
          setCullerTimeoutChecked(CULLER_TIMEOUT_LIMITED);
          setHour(getHourAndMinuteByTimeout(clusterSettings.cullerTimeout).hour);
          setMinute(getHourAndMinuteByTimeout(clusterSettings.cullerTimeout).minute);
        }
        if (clusterSettings.userTrackingEnabled) {
          setUserTrackingEnabled(clusterSettings.userTrackingEnabled);
        }
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, []);

  React.useEffect(() => {
    if (cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED) {
      setCullerTimeout(DEFAULT_CULLER_TIMEOUT);
    } else if (cullerTimeoutChecked === CULLER_TIMEOUT_LIMITED) {
      setCullerTimeout(getTimeoutByHourAndMinute(hour, minute));
    }
  }, [hour, minute, cullerTimeoutChecked]);

  const isSettingsChanged = React.useMemo(
    () =>
      !_.isEqual(clusterSettings, {
        pvcSize,
        cullerTimeout,
        userTrackingEnabled,
        notebookTolerationSettings,
      }),
    [pvcSize, cullerTimeout, userTrackingEnabled, clusterSettings, notebookTolerationSettings],
  );

  const radioCheckedChange = (_, event) => {
    const { value } = event.currentTarget;
    setCullerTimeoutChecked(value);
  };

  const handleSaveButtonClicked = () => {
    const newClusterSettings: ClusterSettings = {
      pvcSize,
      cullerTimeout,
      userTrackingEnabled,
      notebookTolerationSettings: {
        enabled: notebookTolerationSettings.enabled,
        key: notebookTolerationSettings.key,
      },
    };
    if (!_.isEqual(clusterSettings, newClusterSettings)) {
      if (
        Number(newClusterSettings?.pvcSize) !== 0 &&
        Number(newClusterSettings?.cullerTimeout) >= MIN_CULLER_TIMEOUT
      ) {
        updateClusterSettings(newClusterSettings)
          .then((response) => {
            if (response.success) {
              setClusterSettings(newClusterSettings);
              dispatch(
                addNotification({
                  status: 'success',
                  title: 'Settings changes saved',
                  message: 'It takes a few seconds for configuration changes to be applied.',
                  timestamp: new Date(),
                }),
              );
            } else {
              throw new Error(response.error);
            }
          })
          .catch((e) => {
            dispatch(
              addNotification({
                status: 'danger',
                title: 'Error',
                message: e.message,
                timestamp: new Date(),
              }),
            );
          });
      }
    }
  };

  return (
    <ApplicationsPage
      title="Cluster Settings"
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
      errorMessage="Unable to load cluster settings."
      emptyMessage="No cluster settings found."
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
            <FormGroup fieldId="pvc-size" label="PVC size">
              <Text>
                Changing the PVC size changes the storage size attached to the new notebook servers
                for all users.
              </Text>
              <InputGroup>
                <TextInput
                  id="pvc-size-input"
                  className="odh-number-input"
                  name="pvc"
                  type="text"
                  aria-label="PVC Size Input"
                  value={pvcSize}
                  pattern="/^(\s*|\d+)$/"
                  onChange={async (value: string) => {
                    const modifiedValue = value.replace(/ /g, '');
                    if (modifiedValue !== '') {
                      let newValue = Number.isInteger(Number(modifiedValue))
                        ? Number(modifiedValue)
                        : pvcSize;
                      newValue =
                        newValue > MAX_PVC_SIZE
                          ? MAX_PVC_SIZE
                          : newValue < MIN_PVC_SIZE
                          ? MIN_PVC_SIZE
                          : newValue;
                      setPvcSize(newValue);
                    } else {
                      setPvcSize(modifiedValue);
                    }
                  }}
                />
                <InputGroupText variant={InputGroupTextVariant.plain}>GiB</InputGroupText>
              </InputGroup>
              <Button
                innerRef={pvcDefaultBtnRef}
                variant={ButtonVariant.secondary}
                onClick={() => {
                  setPvcSize(DEFAULT_PVC_SIZE);
                }}
              >
                Restore Default
              </Button>
              <HelperText>
                <HelperTextItem
                  variant={pvcSize === '' ? 'error' : 'indeterminate'}
                  hasIcon={pvcSize === ''}
                >
                  Note: PVC size must be between 1 GiB and 16384 GiB.
                </HelperTextItem>
              </HelperText>
            </FormGroup>
            <FormGroup
              fieldId="culler-timeout"
              label="Stop idle notebooks"
              helperText="All idle notebooks are stopped at cluster log out. To edit the cluster log
                out time, discuss with your OpenShift Administrator to see if the OpenShift Authentication Timeout value can be modified."
            >
              <Text>Set the time limit for idle notebooks to be stopped.</Text>
              <Radio
                id="culler-timeout-unlimited"
                label="Do not stop idle notebooks"
                isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                name={CULLER_TIMEOUT_UNLIMITED}
                onChange={radioCheckedChange}
                value={CULLER_TIMEOUT_UNLIMITED}
              />
              <Radio
                id="culler-timeout-limited"
                label="Stop idle notebooks after"
                isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_LIMITED}
                name={CULLER_TIMEOUT_LIMITED}
                onChange={radioCheckedChange}
                value={CULLER_TIMEOUT_LIMITED}
              />
              <InputGroup className="odh-cluster-settings__culler-input-group">
                <TextInput
                  id="hour-input"
                  className="odh-number-input__hour"
                  name="hour"
                  type="text"
                  aria-label="Culler Timeout Hour Input"
                  value={hour}
                  isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                  onChange={(value: string) => {
                    let newValue =
                      isNaN(Number(value)) || !Number.isInteger(Number(value))
                        ? hour
                        : Number(value);
                    newValue =
                      newValue > MAX_HOUR ? MAX_HOUR : newValue < MIN_HOUR ? MIN_HOUR : newValue;
                    // if the hour is max, then the minute can only be set to 0
                    if (newValue === MAX_HOUR && minute !== MIN_MINUTE) {
                      setMinute(MIN_MINUTE);
                    }
                    setHour(newValue);
                  }}
                />
                <InputGroupText variant={InputGroupTextVariant.plain}>hours</InputGroupText>
                <TextInput
                  id="minute-input"
                  className="odh-number-input"
                  name="minute"
                  type="text"
                  aria-label="Culler Timeout Minute Input"
                  value={minute}
                  isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                  onChange={(value: string) => {
                    let newValue =
                      isNaN(Number(value)) || !Number.isInteger(Number(value))
                        ? minute
                        : Number(value);
                    newValue =
                      newValue > MAX_MINUTE
                        ? MAX_MINUTE
                        : newValue < MIN_MINUTE
                        ? MIN_MINUTE
                        : newValue;
                    // if the hour is max, then the minute can only be set to 0
                    if (hour === MAX_HOUR) {
                      newValue = MIN_MINUTE;
                    }
                    setMinute(newValue);
                  }}
                />
                <InputGroupText variant={InputGroupTextVariant.plain}>minutes</InputGroupText>
              </InputGroup>
              <HelperText>
                <HelperTextItem
                  variant={cullerTimeout < MIN_CULLER_TIMEOUT ? 'error' : 'indeterminate'}
                  hasIcon={cullerTimeout < MIN_CULLER_TIMEOUT}
                >
                  Note: Notebook culler timeout must be between 10 minutes and 1000 hours.
                </HelperTextItem>
              </HelperText>
            </FormGroup>
            {!dashboardConfig.spec.dashboardConfig.disableTracking ? (
              <FormGroup
                fieldId="usage-data"
                label="Usage Data Collection"
                helperText={
                  <Text component={TextVariants.small}>
                    For more information see the{' '}
                    <Text
                      component={TextVariants.a}
                      href="https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html/managing_users_and_user_resources/usage-data-collection#usage-data-collection-notice-for-openshift-data-science"
                      target="_blank"
                    >
                      documentation
                    </Text>
                    .
                  </Text>
                }
              >
                <Checkbox
                  label="Allow collection of usage data"
                  isChecked={userTrackingEnabled}
                  onChange={() => {
                    setUserTrackingEnabled(!userTrackingEnabled);
                  }}
                  aria-label="usageData"
                  id="usage-data-checkbox"
                  name="usageDataCheckbox"
                />
              </FormGroup>
            ) : null}
            {isJupyterEnabled ? (
              <FormGroup fieldId="notebook-toleration" label="Notebook pod tolerations">
                <Checkbox
                  label="Add a toleration to notebook pods to allow them to be scheduled to tainted nodes"
                  isChecked={notebookTolerationSettings.enabled}
                  onChange={(enabled) => {
                    const newNotebookTolerationSettings: NotebookTolerationFormSettings = {
                      ...notebookTolerationSettings,
                      enabled,
                    };
                    setNotebookTolerationSettings(newNotebookTolerationSettings);
                  }}
                  aria-label="tolerationsEnabled"
                  id="tolerations-enabled-checkbox"
                  name="tolerationsEnabledCheckbox"
                />
                <InputGroup>
                  <InputGroupText variant={InputGroupTextVariant.plain}>
                    Toleration key for notebook pods:{' '}
                  </InputGroupText>
                  <TextInput
                    id="toleration-key-input"
                    isDisabled={!notebookTolerationSettings.enabled}
                    className="odh-number-input"
                    name="tolerationKey"
                    type="text"
                    aria-label="Toleration key"
                    value={notebookTolerationSettings.key}
                    placeholder={DEFAULT_TOLERATION_VALUE}
                    validated={
                      notebookTolerationSettings.error ? ValidatedOptions.error : undefined
                    }
                    onChange={(value: string) => {
                      const newNotebookTolerationSettings: NotebookTolerationFormSettings = {
                        ...notebookTolerationSettings,
                        key: value,
                        error: TOLERATION_FORMAT.test(value) ? undefined : TOLERATION_FORMAT_ERROR,
                      };
                      setNotebookTolerationSettings(newNotebookTolerationSettings);
                    }}
                  />
                </InputGroup>
                <HelperText>
                  {notebookTolerationSettings.error && (
                    <HelperTextItem hasIcon variant="error">
                      {notebookTolerationSettings.error}
                    </HelperTextItem>
                  )}
                  <HelperTextItem
                    variant={pvcSize === '' ? 'error' : 'indeterminate'}
                    hasIcon={pvcSize === ''}
                  >
                    The toleration key above will be applied to all notebook pods when they are
                    created. Add a matching taint key (with any value) to the Machine Pool(s) that
                    you want to dedicate to Notebooks.
                  </HelperTextItem>
                </HelperText>
              </FormGroup>
            ) : null}
            <ActionGroup>
              <Button
                isDisabled={!isSettingsChanged || !!notebookTolerationSettings.error}
                variant="primary"
                onClick={handleSaveButtonClicked}
              >
                Save changes
              </Button>
            </ActionGroup>
          </Form>
        </PageSection>
      ) : null}
    </ApplicationsPage>
  );
};

export default ClusterSettings;
