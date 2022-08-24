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
} from '../../../../types';
import ImageSelector from './ImageSelector';
import EnvironmentVariablesRow from './EnvironmentVariablesRow';
import { CUSTOM_VARIABLE, EMPTY_KEY, MOUNT_PATH, DEFAULT_PVC_SIZE } from '../../const';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useHistory } from 'react-router-dom';
import { createNotebook, deleteNotebook } from '../../../../services/notebookService';
import { createPvc, getPvc } from '../../../../services/pvcService';
import {
  generateNotebookNameFromUsername,
  generatePvcNameFromUsername,
  generateEnvVarFileNameFromUsername,
  verifyResource,
  checkEnvVarFile,
  generatePvc,
  checkNotebookRunning,
} from '../../../../utilities/notebookControllerUtils';
import AppContext from '../../../../app/AppContext';
import { patchDashboardConfig } from '../../../../services/dashboardConfigService';
import { getSecret } from '../../../../services/secretsService';
import { getConfigMap } from '../../../../services/configMapService';
import { useWatchImages } from '../../../../utilities/useWatchImages';
import ApplicationsPage from '../../../ApplicationsPage';
import StartServerModal from './StartServerModal';
import { useWatchNotebookForSpawnerPage } from './useWatchNotebookForSpawnerPage';
import { usePreferredNotebookSize } from './usePreferredNotebookSize';
import useNotification from '../../../../utilities/useNotification';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import ImpersonateAlert from '../admin/ImpersonateAlert';
import useCurrentUser from '../../useCurrentUser';
import useNamespaces from '../../useNamespaces';
import GPUSelectField from './GPUSelectField';
import SizeSelectField from './SizeSelectField';

import '../../NotebookController.scss';

const SpawnerPage: React.FC = React.memo(() => {
  const history = useHistory();
  const notification = useNotification();
  const { images, loaded, loadError } = useWatchImages();
  const { buildStatuses, dashboardConfig } = React.useContext(AppContext);
  const {
    currentUserState,
    setCurrentUserState,
    impersonatingUser,
    setImpersonatingUsername,
    setLastNotebookCreationTime,
  } = React.useContext(NotebookControllerContext);
  const username = useCurrentUser();
  const { notebookNamespace: projectName } = useNamespaces();
  const [startShown, setStartShown] = React.useState<boolean>(false);
  const { notebook, notebookLoaded } = useWatchNotebookForSpawnerPage(
    startShown,
    projectName,
    username,
  );
  const isNotebookRunning = checkNotebookRunning(notebook);
  const [selectedImageTag, setSelectedImageTag] = React.useState<ImageTag>({
    image: undefined,
    tag: undefined,
  });
  const [selectedSize, setSelectedSize] = usePreferredNotebookSize();
  const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
  const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const [shouldRedirect, setShouldRedirect] = React.useState<boolean>(true);
  const [submitError, setSubmitError] = React.useState<Error | null>(null);

  const onModalClose = () => {
    setStartShown(false);
    if (notebook) {
      deleteNotebook(projectName, notebook.metadata.name).catch((e) =>
        notification.error(`Error delete notebook ${notebook.metadata.name}`, e.message),
      );
    }
  };

  React.useEffect(() => {
    if (shouldRedirect) {
      if (notebookLoaded && notebook) {
        if (!isNotebookRunning) {
          // We already notify the user when they are trying to close/refresh the page
          // when they are spawning a notebook
          // so we can safely delete it if the notebook is still there
          deleteNotebook(projectName, notebook.metadata.name);
        } else {
          history.replace('/notebookController');
        }
      }
    }
  }, [projectName, notebookLoaded, notebook, isNotebookRunning, history, shouldRedirect]);

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

  const handleNotebookAction = async () => {
    setSubmitError(null);
    const notebookSize = dashboardConfig?.spec?.notebookSizes?.find(
      (ns) => ns.name === selectedSize,
    );
    const pvcName = generatePvcNameFromUsername(username);
    const requestedPvcSize = dashboardConfig?.spec?.notebookController?.pvcSize;
    const pvcBody = generatePvc(pvcName, projectName, requestedPvcSize ?? DEFAULT_PVC_SIZE);
    await verifyResource(pvcName, projectName, getPvc, createPvc, pvcBody).catch((e) =>
      console.error(`Something wrong with PVC ${pvcName}: ${e}`),
    );
    const volumes = [{ name: pvcName, persistentVolumeClaim: { claimName: pvcName } }];
    const volumeMounts = [{ mountPath: MOUNT_PATH, name: pvcName }];
    const notebookName = generateNotebookNameFromUsername(username);
    const imageUrl = `${selectedImageTag.image?.dockerImageRepo}:${selectedImageTag.tag?.name}`;
    setCreateInProgress(true);
    setLastNotebookCreationTime(new Date());
    const envVars = await checkEnvVarFile(username, projectName, variableRows);
    const canContinue = await createNotebook(
      projectName,
      notebookName,
      username,
      imageUrl,
      notebookSize,
      parseInt(selectedGpu),
      envVars,
      volumes,
      volumeMounts,
      dashboardConfig.spec.notebookController?.notebookTolerationSettings,
    )
      .then(() => true)
      .catch((e) => {
        setSubmitError(e);
        return false;
      });
    setCreateInProgress(false);

    if (!canContinue) return;
    setShouldRedirect(false);
    setStartShown(true);

    if (!currentUserState.user) {
      notification.error(
        'Unable to update user settings',
        `Invalid username: "${currentUserState.user}"`,
      );
      return;
    }

    const updatedUserState = {
      ...currentUserState,
      ...(impersonatingUser ? {} : { lastActivity: Date.now() }),
      lastSelectedImage: `${selectedImageTag.image?.name}:${selectedImageTag.tag?.name}`,
      lastSelectedSize: selectedSize,
    };
    setCurrentUserState(updatedUserState);
    const otherUsersStates = dashboardConfig?.status?.notebookControllerState?.filter(
      (state) => state.user !== username,
    );
    const dashboardConfigPatch = {
      status: {
        notebookControllerState: otherUsersStates
          ? [...otherUsersStates, updatedUserState]
          : [updatedUserState],
      },
    };
    await patchDashboardConfig(dashboardConfigPatch);
  };

  return (
    <>
      {impersonatingUser && <ImpersonateAlert />}
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
                {images.sort(checkOrder).map((image) => (
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
            <SizeSelectField value={selectedSize} setValue={setSelectedSize} />
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
                    setStartShown(false);
                    console.error(e);
                  });
                }}
                isDisabled={createInProgress}
              >
                Start server
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (impersonatingUser) {
                    setImpersonatingUsername(null);
                  } else {
                    history.push('/');
                  }
                }}
              >
                Cancel
              </Button>
            </ActionGroup>
          </div>
        </Form>
        <StartServerModal
          notebook={notebook}
          startShown={startShown}
          setStartModalShown={setStartShown}
          onClose={onModalClose}
        />
      </ApplicationsPage>
    </>
  );
});

SpawnerPage.displayName = 'SpawnerPage';

export default SpawnerPage;
