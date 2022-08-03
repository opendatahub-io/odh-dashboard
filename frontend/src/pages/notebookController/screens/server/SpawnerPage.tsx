import * as React from 'react';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  Select,
  SelectOption,
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
import { getGPU } from '../../../../services/gpuService';
import { patchDashboardConfig } from '../../../../services/dashboardConfigService';
import { getSecret } from '../../../../services/secretsService';
import { getConfigMap } from '../../../../services/configMapService';
import { useWatchImages } from '../../../../utilities/useWatchImages';
import ApplicationsPage from '../../../ApplicationsPage';
import StartServerModal from './StartServerModal';
import { useWatchNotebookForSpawnerPage } from './useWatchNotebookForSpawnerPage';
import useNotification from '../../../../utilities/useNotification';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import ImpersonateAlert from '../admin/ImpersonateAlert';
import { useUser } from '../../../../redux/selectors';
import useNamespaces from '../../useNamespaces';

import '../../NotebookController.scss';

const SpawnerPage: React.FC = React.memo(() => {
  const history = useHistory();
  const notification = useNotification();
  const { images, loaded, loadError } = useWatchImages();
  const { buildStatuses, dashboardConfig } = React.useContext(AppContext);
  const { currentUserState, setCurrentUserState, impersonatingUser } =
    React.useContext(NotebookControllerContext);
  const { username: stateUsername } = useUser();
  const username = currentUserState.user || stateUsername;
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
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState<boolean>(false);
  const [selectedSize, setSelectedSize] = React.useState<string>('');
  const [gpuDropdownOpen, setGpuDropdownOpen] = React.useState<boolean>(false);
  const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
  const [gpuSize, setGpuSize] = React.useState<number>(0);
  const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const [shouldRedirect, setShouldRedirect] = React.useState<boolean>(true);

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
          setStartShown(true);
        } else {
          history.replace('/notebookController');
        }
      }
    }
  }, [notebookLoaded, notebook, isNotebookRunning, history, shouldRedirect]);

  React.useEffect(() => {
    let cancelled = false;
    const setGpu = async () => {
      const size = await getGPU();
      if (!cancelled) {
        setGpuSize(size);
      }
    };
    setGpu().catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, []);

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

  React.useEffect(() => {
    if (dashboardConfig?.spec.notebookSizes) {
      if (currentUserState?.lastSelectedSize) {
        const size = dashboardConfig.spec.notebookSizes.find(
          (notebookSize) => notebookSize.name === currentUserState.lastSelectedSize,
        );
        if (size) {
          setSelectedSize(size.name);
        } else {
          setSelectedSize(dashboardConfig.spec.notebookSizes[0].name);
        }
      } else {
        setSelectedSize(dashboardConfig.spec.notebookSizes[0].name);
      }
    }
  }, [dashboardConfig, currentUserState]);

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

  const handleSizeSelection = (e, selection) => {
    setSelectedSize(selection);
    setSizeDropdownOpen(false);
  };

  const handleGpuSelection = (e, selection) => {
    setSelectedGpu(selection);
    setGpuDropdownOpen(false);
  };

  const sizeOptions = React.useMemo(() => {
    const sizes = dashboardConfig?.spec?.notebookSizes;
    if (!sizes?.length) {
      return [<SelectOption key="Default" value="Default" description="No Size Limits" />];
    }

    return sizes.map((size) => {
      const name = size.name;
      const desc =
        `Limits: ${size?.resources?.limits?.cpu || '??'} CPU, ` +
        `${size?.resources?.limits?.memory || '??'} Memory ` +
        `Requests: ${size?.resources?.requests?.cpu || '??'} CPU, ` +
        `${size?.resources?.requests?.memory || '??'} Memory`;
      return <SelectOption key={name} value={name} description={desc} />;
    });
  }, [dashboardConfig]);

  const gpuOptions = React.useMemo(() => {
    const values: number[] = [];
    const start = 0;
    for (let i = start; i <= gpuSize; i++) {
      values.push(i);
    }
    return values?.map((size) => <SelectOption key={size} value={`${size}`} />);
  }, [gpuSize]);

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
    const envVars = await checkEnvVarFile(username, projectName, variableRows);
    await createNotebook(
      projectName,
      notebookName,
      username,
      imageUrl,
      notebookSize,
      parseInt(selectedGpu),
      envVars,
      volumes,
      volumeMounts,
    );
    setCreateInProgress(false);
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
        title="Start a Notebook server"
        description="Select options for your Notebook server."
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
            {sizeOptions && (
              <FormGroup label="Container size" fieldId="modal-notebook-container-size">
                <Select
                  isOpen={sizeDropdownOpen}
                  onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                  aria-labelledby="container-size"
                  selections={selectedSize}
                  onSelect={handleSizeSelection}
                  menuAppendTo="parent"
                >
                  {sizeOptions}
                </Select>
              </FormGroup>
            )}
            {gpuOptions && (
              <FormGroup label="Number of GPUs" fieldId="modal-notebook-gpu-number">
                <Select
                  isOpen={gpuDropdownOpen}
                  onToggle={() => setGpuDropdownOpen(!gpuDropdownOpen)}
                  aria-labelledby="gpu-numbers"
                  selections={selectedGpu}
                  onSelect={handleGpuSelection}
                  menuAppendTo="parent"
                >
                  {gpuOptions}
                </Select>
              </FormGroup>
            )}
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
            <Button variant="secondary" onClick={() => history.push('/')}>
              Cancel
            </Button>
          </ActionGroup>
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
