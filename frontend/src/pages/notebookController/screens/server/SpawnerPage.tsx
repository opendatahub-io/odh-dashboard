import * as React from 'react';
import {
  ActionGroup,
  Alert,
  Button,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { checkOrder, getDefaultTag, isImageTagBuildValid } from '../../../../utilities/imageUtils';
import {
  ImageInfo,
  ImageTag,
  VariableRow,
  ImageTagInfo,
  ConfigMap,
  Secret,
  EnvVarResourceType,
  VolumeMount,
} from '../../../../types';
import ImageSelector from './ImageSelector';
import EnvironmentVariablesRow from './EnvironmentVariablesRow';
import { CUSTOM_VARIABLE, EMPTY_KEY, MOUNT_PATH, DEFAULT_PVC_SIZE } from '../../const';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useHistory } from 'react-router-dom';
import { startNotebook, stopNotebook } from '../../../../services/notebookService';
import { createPvc, getPvc } from '../../../../services/pvcService';
import {
  generateNotebookNameFromUsername,
  generatePvcNameFromUsername,
  generateEnvVarFileNameFromUsername,
  verifyResource,
  generatePvc,
  useNotebookUserState,
  classifyEnvVars,
  verifyEnvVars,
} from '../../../../utilities/notebookControllerUtils';
import { useAppContext } from '../../../../app/AppContext';
import {
  createSecret,
  deleteSecret,
  getSecret,
  replaceSecret,
} from '../../../../services/secretsService';
import {
  createConfigMap,
  deleteConfigMap,
  getConfigMap,
  replaceConfigMap,
} from '../../../../services/configMapService';
import { useWatchImages } from '../../../../utilities/useWatchImages';
import ApplicationsPage from '../../../ApplicationsPage';
import StartServerModal from './StartServerModal';
import { usePreferredNotebookSize } from './usePreferredNotebookSize';
import useNotification from '../../../../utilities/useNotification';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import ImpersonateAlert from '../admin/ImpersonateAlert';
import useNamespaces from '../../useNamespaces';
import GPUSelectField from './GPUSelectField';
import SizeSelectField from './SizeSelectField';
import { fireTrackingEvent } from '../../../../utilities/segmentIOUtils';
import useSpawnerNotebookModalState from './useSpawnerNotebookModalState';
import BrowserTabPreferenceCheckbox from './BrowserTabPreferenceCheckbox';

import '../../NotebookController.scss';

const SpawnerPage: React.FC = () => {
  const history = useHistory();
  const notification = useNotification();
  const { images, loaded, loadError } = useWatchImages();
  const { buildStatuses, dashboardConfig } = useAppContext();
  const { currentUserNotebook, requestNotebookRefresh, impersonatedUsername, setImpersonating } =
    React.useContext(NotebookControllerContext);
  const { notebookNamespace: projectName } = useNamespaces();
  const currentUserState = useNotebookUserState();
  const username = currentUserState.user;
  const { startShown, hideStartShown, refreshNotebookForStart } = useSpawnerNotebookModalState();
  const [selectedImageTag, setSelectedImageTag] = React.useState<ImageTag>({
    image: undefined,
    tag: undefined,
  });
  const { selectedSize, setSelectedSize, sizes } = usePreferredNotebookSize();
  const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
  const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const setFirstValidImage = () => {
      const getDefaultImageTag = () => {
        let found = false;
        let i = 0;
        while (!found && i < images.length) {
          const image = images[i++];
          if (image) {
            const tag = getDefaultTag(buildStatuses, image);
            if (tag) {
              setSelectedImageTag({ image, tag });
              found = true;
            }
          }
        }
      };
      if (currentUserState?.lastSelectedImage) {
        const [imageName, tagName] = [...currentUserState?.lastSelectedImage.split(':')];
        const image = images.find((image) => image.name === imageName);
        const tag = image?.tags.find((tag) => tag.name === tagName);
        if (image && tag && isImageTagBuildValid(buildStatuses, image, tag)) {
          setSelectedImageTag({ image, tag });
        } else {
          getDefaultImageTag();
        }
      } else {
        getDefaultImageTag();
      }
    };
    if (images && currentUserState) {
      setFirstValidImage();
    }
  }, [currentUserState, images, buildStatuses]);

  const mapRows = React.useCallback(
    async (fetchFunc: (namespace: string, name: string) => Promise<ConfigMap | Secret>) => {
      if (!username) {
        return [];
      }
      let fetchedVariableRows: VariableRow[] = [];
      const envVarFileName = generateEnvVarFileNameFromUsername(username);
      const response = await verifyResource(envVarFileName, projectName, fetchFunc);
      if (response && response.data) {
        const isSecret = response.kind === EnvVarResourceType.Secret;
        fetchedVariableRows = Object.entries(response.data).map(([key, value]) => {
          const errors = fetchedVariableRows.find((variableRow) =>
            variableRow.variables.find((variable) => variable.name === key),
          )
            ? { [key]: 'That name is already in use. Try a different name.' }
            : {};
          return {
            variableType: CUSTOM_VARIABLE,
            variables: [
              {
                name: key,
                value: isSecret ? Buffer.from(value, 'base64').toString() : value,
                type: isSecret ? 'password' : 'text',
              },
            ],
            errors,
          };
        });
      }
      return fetchedVariableRows;
    },
    [username, projectName],
  );

  React.useEffect(() => {
    let cancelled = false;
    const mapEnvironmentVariableRows = async () => {
      const fetchedVariableRowsConfigMap = await mapRows(getConfigMap);
      const fetchedVariableRowsSecret = await mapRows(getSecret);
      if (!cancelled) {
        setVariableRows([...fetchedVariableRowsConfigMap, ...fetchedVariableRowsSecret]);
      }
    };
    mapEnvironmentVariableRows().catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [mapRows]);

  const handleImageTagSelection = (image: ImageInfo, tag: ImageTagInfo, checked: boolean) => {
    if (checked) {
      setSelectedImageTag({ image, tag });
    }
  };

  const renderEnvironmentVariableRows = () => {
    if (!variableRows?.length) {
      return null;
    }
    return variableRows.map((row, index) => (
      <EnvironmentVariablesRow
        key={`environment-variable-row-${index}`}
        rowIndex={`environment-variable-row-${index}`}
        categories={[]}
        variableRow={row}
        onUpdate={(updatedRow) => onUpdateRow(index, updatedRow)}
      />
    ));
  };

  const onUpdateRow = (index: number, updatedRow?: VariableRow) => {
    const updatedRows = [...variableRows];

    if (!updatedRow) {
      updatedRows.splice(index, 1); // remove the whole variable at the index
      setVariableRows(updatedRows);
      return;
    }

    updatedRows[index] = { ...updatedRow };
    updatedRows[index].errors = {};
    for (let i = 0; i < updatedRows.length; i++) {
      if (i !== index) {
        updatedRow.variables.forEach((variable) => {
          if (updatedRows[i].variables.find((v) => v.name === variable.name)) {
            updatedRows[index].errors[variable.name] =
              'That name is already in use. Try a different name.';
          }
        });
      }
    }
    setVariableRows(updatedRows);
  };

  const addEnvironmentVariableRow = () => {
    const newRow: VariableRow = {
      variableType: CUSTOM_VARIABLE,
      variables: [
        {
          name: EMPTY_KEY,
          type: 'text',
          value: '',
        },
      ],
      errors: {},
    };
    setVariableRows([...variableRows, newRow]);
  };

  const fireStartServerEvent = () => {
    fireTrackingEvent('Notebook Server Started', {
      GPU: parseInt(selectedGpu),
      lastSelectedSize: selectedSize.name,
      lastSelectedImage: `${selectedImageTag.image?.name}:${selectedImageTag.tag?.name}`,
    });
  };

  const handleNotebookAction = async () => {
    setSubmitError(null);
    setCreateInProgress(true);
    const pvcName = generatePvcNameFromUsername(username);
    const envVarFileName = generateEnvVarFileNameFromUsername(username);
    const envVars = classifyEnvVars(variableRows);
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const requestedPvcSize = dashboardConfig.spec.notebookController?.pvcSize;
        const pvcBody = generatePvc(pvcName, projectName, requestedPvcSize ?? DEFAULT_PVC_SIZE);
        verifyResource(pvcName, projectName, getPvc, createPvc, pvcBody)
          .then(() => {
            resolve();
          })
          .catch((e) => {
            console.error(`Something wrong with PVC ${pvcName}: ${e}`);
            reject();
          });
      }),
      verifyEnvVars(
        envVarFileName,
        projectName,
        EnvVarResourceType.Secret,
        envVars.secrets,
        getSecret,
        createSecret,
        replaceSecret,
        deleteSecret,
      ),
      verifyEnvVars(
        envVarFileName,
        projectName,
        EnvVarResourceType.ConfigMap,
        envVars.configMap,
        getConfigMap,
        createConfigMap,
        replaceConfigMap,
        deleteConfigMap,
      ),
    ]).then(() => {
      const volumes = [{ name: pvcName, persistentVolumeClaim: { claimName: pvcName } }];
      const volumeMounts: VolumeMount[] = [{ mountPath: MOUNT_PATH, name: pvcName }];
      const notebookName = generateNotebookNameFromUsername(username);
      const imageUrl = `${selectedImageTag.image?.dockerImageRepo}:${selectedImageTag.tag?.name}`;
      startNotebook({
        projectName,
        notebookName,
        username,
        imageUrl,
        notebookSize: selectedSize,
        imageSelection: `${selectedImageTag.image?.name}:${selectedImageTag.tag?.name}`,
        gpus: parseInt(selectedGpu),
        envVars: {
          envVarFileName,
          ...envVars,
        },
        tolerationSettings: dashboardConfig.spec.notebookController?.notebookTolerationSettings,
        volumes,
        volumeMounts,
      })
        .then(() => {
          fireStartServerEvent();
          refreshNotebookForStart();
        })
        .catch((e) => {
          setSubmitError(e);
          setCreateInProgress(false);
          // We had issues spawning the notebook -- try to stop it
          stopNotebook(projectName, notebookName).catch(() =>
            notification.error(
              'Error creating notebook',
              'Error spawning notebook and unable to properly stop it',
            ),
          );
        });
    });
  };

  return (
    <>
      <ImpersonateAlert />
      <ApplicationsPage
        title="Start a notebook server"
        description="Select options for your notebook server."
        loaded={loaded}
        loadError={loadError}
        empty={!images || images.length === 0}
      >
        <Form className="odh-notebook-controller__page odh-notebook-controller__page-content">
          <FormSection title="Notebook image">
            <FormGroup fieldId="modal-notebook-image">
              <Grid sm={12} md={12} lg={12} xl={6} xl2={6} hasGutter>
                {[...images].sort(checkOrder).map((image) => (
                  <GridItem key={image.name}>
                    <ImageSelector
                      image={image}
                      selectedImage={selectedImageTag.image}
                      selectedTag={selectedImageTag.tag}
                      handleSelection={handleImageTagSelection}
                    />
                  </GridItem>
                ))}
              </Grid>
            </FormGroup>
          </FormSection>
          <FormSection title="Deployment size">
            <SizeSelectField
              value={selectedSize}
              setValue={(size) => setSelectedSize(size)}
              sizes={sizes}
            />
            <GPUSelectField value={selectedGpu} setValue={(size) => setSelectedGpu(size)} />
          </FormSection>
          <FormSection title="Environment variables" className="odh-notebook-controller__env-var">
            {renderEnvironmentVariableRows()}
            <Button
              className="odh-notebook-controller__env-var-add-button"
              isInline
              variant="link"
              onClick={addEnvironmentVariableRow}
            >
              <PlusCircleIcon />
              {` Add more variables`}
            </Button>
          </FormSection>
          <div>
            {submitError && (
              <Alert
                variant="danger"
                isInline
                title="Failed to create the notebook, please try again later"
              >
                {submitError.message}
              </Alert>
            )}
            <ActionGroup>
              <Button
                variant="primary"
                onClick={() => {
                  handleNotebookAction().catch((e) => {
                    setCreateInProgress(false);
                    hideStartShown();
                    console.error('Error submitting resources around starting a notebook', e);
                    setSubmitError(e);
                  });
                }}
                isDisabled={createInProgress}
              >
                Start server
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (impersonatedUsername) {
                    setImpersonating();
                  } else {
                    history.push('/');
                  }
                }}
              >
                Cancel
              </Button>
            </ActionGroup>
          </div>
          <BrowserTabPreferenceCheckbox />
        </Form>
        <StartServerModal
          spawnInProgress={startShown}
          open={createInProgress}
          onClose={() => {
            if (currentUserNotebook) {
              const notebookName = currentUserNotebook.metadata.name;
              stopNotebook(projectName, notebookName)
                .then(() => requestNotebookRefresh())
                .catch((e) => notification.error(`Error stop notebook ${notebookName}`, e.message));
            } else {
              // Shouldn't happen, but if we don't have a notebook, there is nothing to stop
              hideStartShown();
            }
            setCreateInProgress(false);
          }}
        />
      </ApplicationsPage>
    </>
  );
};

export default SpawnerPage;
