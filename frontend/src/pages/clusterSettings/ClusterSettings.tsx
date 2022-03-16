import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  InputGroup,
  InputGroupText,
  InputGroupTextVariant,
  PageSection,
  PageSectionVariants,
  Text,
  TextInput,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { fetchClusterSettings, updateClusterSettings } from '../../services/clusterSettingsService';
import { ClusterSettings } from '../../types';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../redux/actions/actions';
import './ClusterSettings.scss';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

const description = `Update global settings for all users.`;

const DEFAULT_PVC_SIZE = 20;
const MIN_PVC_SIZE = 1;
const MAX_PVC_SIZE = 16384;
const DEFAULT_CONFIG: ClusterSettings = {
  pvcSize: DEFAULT_PVC_SIZE,
};

const ClusterSettings: React.FC = () => {
  const isEmpty = false;
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [clusterSettings, setClusterSettings] = React.useState(DEFAULT_CONFIG);
  const [pvcSize, setPvcSize] = React.useState<number | string>(DEFAULT_PVC_SIZE);
  const pvcDefaultBtnRef = React.useRef<HTMLButtonElement>();
  const dispatch = useDispatch();

  React.useEffect(() => {
    fetchClusterSettings()
      .then((clusterSettings: ClusterSettings) => {
        setLoaded(true);
        setLoadError(undefined);
        setClusterSettings(clusterSettings);
        setPvcSize(clusterSettings.pvcSize);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, []);

  const submitClusterSettings = (newClusterSettings: ClusterSettings) => {
    if (!_.isEqual(clusterSettings, newClusterSettings)) {
      if (Number(newClusterSettings?.pvcSize) !== 0) {
        updateClusterSettings(newClusterSettings)
          .then((response) => {
            if (response.success) {
              setClusterSettings(newClusterSettings);
              dispatch(
                addNotification({
                  status: 'success',
                  title: 'Cluster settings updated successfully.',
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
        <div className="odh-cluster-settings">
          <PageSection variant={PageSectionVariants.light} padding={{ default: 'noPadding' }}>
            <Flex direction={{ default: 'column' }}>
              <FlexItem>
                <Form
                  className="odh-cluster-settings__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                  <FormGroup
                    fieldId="pvc-size"
                    label="PVC size"
                    helperText="Note: PVC size must be between 1 GiB and 16384 GiB."
                    helperTextInvalid="Note: PVC size must be between 1 GiB and 16384 GiB."
                    helperTextInvalidIcon={<ExclamationCircleIcon />}
                    validated={pvcSize !== '' ? 'success' : 'error'}
                  >
                    <Text>
                      Changing the PVC size changes the storage size attached to the new notebook
                      servers for all users.
                    </Text>
                    <InputGroup>
                      <TextInput
                        className="odh-number-input"
                        name="pvc"
                        id="pvc-size-input"
                        type="text"
                        aria-label="PVC Size Input"
                        value={pvcSize}
                        pattern="/^(\s*|\d+)$/"
                        onBlur={() => {
                          submitClusterSettings({ pvcSize: Number(pvcSize) });
                        }}
                        onKeyPress={(event) => {
                          if (event.key === 'Enter') {
                            if (pvcDefaultBtnRef.current) pvcDefaultBtnRef.current.focus();
                          }
                        }}
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
                      <InputGroupText id="plain-example" variant={InputGroupTextVariant.plain}>
                        GiB
                      </InputGroupText>
                    </InputGroup>
                    <Button
                      innerRef={pvcDefaultBtnRef}
                      variant={ButtonVariant.secondary}
                      onClick={() => {
                        setPvcSize(DEFAULT_PVC_SIZE);
                        submitClusterSettings({ pvcSize: DEFAULT_PVC_SIZE });
                      }}
                    >
                      Restore Default
                    </Button>
                  </FormGroup>
                </Form>
              </FlexItem>
            </Flex>
          </PageSection>
        </div>
      ) : null}
    </ApplicationsPage>
  );
};

export default ClusterSettings;
