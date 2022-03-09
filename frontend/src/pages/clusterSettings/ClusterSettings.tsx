import * as React from 'react';
import {
  Button,
  ButtonVariant,
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
import './ClusterSettings.scss';

const description = `Update global settings for all users.`;

const DEFAULT_PVC_SIZE = 20;
const DEFAULT_CONFIG: ClusterSettings = {
  pvcSize: DEFAULT_PVC_SIZE,
};

const ClusterSettings: React.FC = () => {
  const isEmpty = false;
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [clusterSettings, setClusterSettings] = React.useState<ClusterSettings>(DEFAULT_CONFIG);
  const MIN_PVC_SIZE = 1;
  const MAX_PVC_SIZE = 16384;
  const pvcDefaultBtnRef = React.useRef<HTMLButtonElement>();

  React.useEffect(() => {
    fetchClusterSettings()
      .then((clusterSettings: ClusterSettings) => {
        setLoaded(true);
        setLoadError(undefined);
        setClusterSettings(clusterSettings);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, []);

  const submitClusterSettings = async (newClusterSettings: ClusterSettings) => {
    try {
      const response: ClusterSettings = await updateClusterSettings(newClusterSettings);
      setClusterSettings(response);
    } catch (e) {
      console.log('Error changing data collection');
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
          <PageSection variant={PageSectionVariants.light}>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <FormGroup
                fieldId="pvc-size"
                label="PVC size"
                helperText="Note: The default size is 20 GiB."
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
                    value={clusterSettings.pvcSize}
                    pattern="[0-9]+"
                    onBlur={submitClusterSettings}
                    onKeyPress={(event) => {
                      if (event.key === 'Enter') {
                        submitClusterSettings(clusterSettings);
                        if (pvcDefaultBtnRef.current) pvcDefaultBtnRef.current.focus();
                      }
                    }}
                    onChange={async (value: string) => {
                      let newValue = isNaN(Number(value)) ? clusterSettings.pvcSize : Number(value);
                      newValue =
                        newValue > MAX_PVC_SIZE
                          ? MAX_PVC_SIZE
                          : newValue < MIN_PVC_SIZE
                          ? MIN_PVC_SIZE
                          : newValue;
                      setClusterSettings({
                        pvcSize: newValue,
                      });
                    }}
                  />
                  <InputGroupText id="plain-example" variant={InputGroupTextVariant.plain}>
                    GiB
                  </InputGroupText>
                </InputGroup>
                <div>
                  <Button
                    innerRef={pvcDefaultBtnRef}
                    variant={ButtonVariant.secondary}
                    onClick={() => {
                      submitClusterSettings({ pvcSize: DEFAULT_PVC_SIZE });
                    }}
                  >
                    Restore Defaults
                  </Button>
                </div>
              </FormGroup>
            </Form>
          </PageSection>
        </div>
      ) : null}
    </ApplicationsPage>
  );
};

export default ClusterSettings;
