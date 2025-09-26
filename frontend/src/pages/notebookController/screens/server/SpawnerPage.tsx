import * as React from 'react';
import {
  ActionGroup,
  Alert,
  Button,
  EmptyState,
  EmptyStateVariant,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  Spinner,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { CUSTOM_VARIABLE, EMPTY_KEY, ENV_VAR_NAME_REGEX } from '#~/pages/notebookController/const';
import {
  ConfigMap,
  EnvVarResourceType,
  ImageInfo,
  ImageTag,
  ImageTagInfo,
  NotebookState,
  Secret,
  VariableRow,
} from '#~/types';
import { checkOrder, getDefaultTag, isImageTagBuildValid } from '#~/utilities/imageUtils';
import { enableNotebook, stopNotebook } from '#~/services/notebookService';
import {
  classifyEnvVars,
  generateEnvVarFileNameFromUsername,
  useNotebookUserState,
  verifyResource,
} from '#~/utilities/notebookControllerUtils';
import { useAppContext } from '#~/app/AppContext';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useNotification from '#~/utilities/useNotification';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import ImpersonateAlert from '#~/pages/notebookController/screens/admin/ImpersonateAlert';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { getEnvConfigMap, getEnvSecret } from '#~/services/envService';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { useDefaultStorageClass } from '#~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import HardwareProfileFormSection from '#~/concepts/hardwareProfiles/HardwareProfileFormSection';
import { useNotebookPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useNotebookPodSpecOptionsState';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { useDashboardNamespace } from '#~/redux/selectors';
import { useImageStreams } from '#~/utilities/useImageStreams';
import { mapImageStreamToImageInfo } from '#~/utilities/imageStreamUtils';
import SizeSelectField from './SizeSelectField';
import useSpawnerNotebookModalState from './useSpawnerNotebookModalState';
import BrowserTabPreferenceCheckbox from './BrowserTabPreferenceCheckbox';
import EnvironmentVariablesRow from './EnvironmentVariablesRow';
import ImageSelector from './ImageSelector';
import StartServerModal from './StartServerModal';
import AcceleratorProfileSelectField from './AcceleratorProfileSelectField';

import '#~/pages/notebookController/NotebookController.scss';

const SpawnerPage: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const isHomeAvailable = useIsAreaAvailable(SupportedArea.HOME).status;
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const { dashboardNamespace } = useDashboardNamespace();
  const [imageStreams, loaded, loadError] = useImageStreams(dashboardNamespace, { enabled: true });
  const images = React.useMemo(() => imageStreams.map(mapImageStreamToImageInfo), [imageStreams]);
  const { buildStatuses } = useAppContext();
  const { currentUserNotebook, requestNotebookRefresh, impersonatedUsername, setImpersonating } =
    React.useContext(NotebookControllerContext);
  const { workbenchNamespace } = useNamespaces();
  const currentUserState = useNotebookUserState();
  const username = currentUserState.user;
  const [createInProgress, setCreateInProgress] = React.useState(false);
  const { startShown, hideStartShown, refreshNotebookForStart } =
    useSpawnerNotebookModalState(createInProgress);
  const [selectedImageTag, setSelectedImageTag] = React.useState<ImageTag>({
    image: undefined,
    tag: undefined,
  });
  const podSpecOptionsState = useNotebookPodSpecOptionsState(currentUserNotebook ?? undefined);

  const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
  const [submitError, setSubmitError] = React.useState<Error | null>(null);

  const [defaultStorageClass, defaultStorageClassLoaded] = useDefaultStorageClass();

  const disableSubmit =
    createInProgress ||
    variableRows.some(
      ({ errors, variables }) =>
        Object.keys(errors).length > 0 ||
        variables.find((variable) => !variable.name || variable.name === EMPTY_KEY),
    ) ||
    !defaultStorageClassLoaded ||
    !podSpecOptionsState.hardwareProfile.isFormDataValid;

  React.useEffect(() => {
    const setFirstValidImage = () => {
      const getDefaultImageTag = () => {
        let found = false;
        let i = 0;

        while (!found && i < images.length) {
          const image = images[i++];
          const tag = getDefaultTag(buildStatuses, image);
          if (tag) {
            setSelectedImageTag({ image, tag });
            found = true;
          }
        }
      };
      if (currentUserState.lastSelectedImage) {
        const [imageName, tagName] = [...currentUserState.lastSelectedImage.split(':')];
        const image = images.find((currentImage) => currentImage.name === imageName);
        const tag = image?.tags && image.tags.find((currentTag) => currentTag.name === tagName);
        if (tag && isImageTagBuildValid(buildStatuses, image, tag)) {
          setSelectedImageTag({ image, tag });
        } else {
          getDefaultImageTag();
        }
      } else {
        getDefaultImageTag();
      }
    };
    setFirstValidImage();
  }, [currentUserState, images, buildStatuses]);

  const mapRows = React.useCallback(
    async (fetchFunc: (namespace: string, name: string) => Promise<ConfigMap | Secret>) => {
      if (!username) {
        return [];
      }
      let fetchedVariableRows: VariableRow[] = [];
      const envVarFileName = generateEnvVarFileNameFromUsername(username);
      const response = await verifyResource<ConfigMap | Secret>(
        envVarFileName,
        workbenchNamespace,
        fetchFunc,
      );
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
                value: isSecret ? atob(value) : value,
                type: isSecret ? 'password' : 'text',
              },
            ],
            errors,
          };
        });
      }
      return fetchedVariableRows;
    },
    [username, workbenchNamespace],
  );

  React.useEffect(() => {
    let cancelled = false;
    const mapEnvironmentVariableRows = async () => {
      const fetchedVariableRowsConfigMap = await mapRows(getEnvConfigMap);
      const fetchedVariableRowsSecret = await mapRows(getEnvSecret);
      if (!cancelled) {
        setVariableRows([...fetchedVariableRowsConfigMap, ...fetchedVariableRowsSecret]);
      }
    };
    /* eslint-disable-next-line no-console */
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
    if (!variableRows.length) {
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
    updatedRow.variables.forEach((variable) => {
      if (variable.name && variable.name !== EMPTY_KEY && !ENV_VAR_NAME_REGEX.test(variable.name)) {
        updatedRows[index].errors[variable.name] =
          "Invalid variable name. The name must consist of alphabetic characters, digits, '_', '-', or '.', and must not start with a digit.";
      }
    });
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
    fireFormTrackingEvent('Notebook Server Started', {
      outcome: TrackingOutcome.submit,
      podSpecOptions: JSON.stringify({
        notebookSize: podSpecOptionsState.notebooksSize.selectedSize,
        acceleratorProfile: podSpecOptionsState.acceleratorProfile.formData.profile?.metadata.name,
        hardwareProfile:
          podSpecOptionsState.hardwareProfile.formData.selectedProfile?.metadata.name,
        resources: podSpecOptionsState.podSpecOptions.resources,
        tolerations: podSpecOptionsState.podSpecOptions.tolerations,
        nodeSelector: podSpecOptionsState.podSpecOptions.nodeSelector,
      }),
      lastSelectedImage: `${selectedImageTag.image?.name ?? ''}:${
        selectedImageTag.tag?.name ?? ''
      }`,
    });
  };

  const handleNotebookAction = async () => {
    setSubmitError(null);
    setCreateInProgress(true);
    const envVars = classifyEnvVars(variableRows);

    enableNotebook({
      imageName: selectedImageTag.image?.name || '',
      imageTagName: selectedImageTag.tag?.name || '',
      podSpecOptions: podSpecOptionsState.podSpecOptions,
      envVars,
      state: NotebookState.Started,
      username: impersonatedUsername || undefined,
      storageClassName: defaultStorageClass?.metadata.name,
    })
      .then(() => {
        fireStartServerEvent();
        refreshNotebookForStart();
      })
      .catch((e) => {
        fireFormTrackingEvent('Notebook Server Started', {
          outcome: TrackingOutcome.submit,
          success: false,
          error: e.message,
        });
        setSubmitError(e);
        setCreateInProgress(false);
        // We had issues spawning the notebook -- try to stop it
        stopNotebook(impersonatedUsername || undefined).catch(() =>
          notification.error(
            'Error creating notebook',
            'Error spawning notebook and unable to properly stop it',
          ),
        );
      });
  };

  return (
    <>
      <ImpersonateAlert />
      <ApplicationsPage
        title="Start a basic workbench"
        description="Configure your basic workbench. Each user can start a single basic workbench, and its features are limited to only a workbench image."
        provideChildrenPadding
        loaded={loaded}
        loadingContent={
          <EmptyState
            headingLevel="h1"
            titleText="Loading"
            variant={EmptyStateVariant.lg}
            data-id="loading-empty-state"
          >
            <Spinner size="xl" />
          </EmptyState>
        }
        loadError={loadError}
        empty={loaded && images.length === 0}
      >
        <Form maxWidth="1000px" data-testid="notebook-server-form">
          <FormSection title="Workbench image">
            <FormGroup fieldId="modal-notebook-image">
              <Grid sm={12} md={12} lg={12} xl={6} xl2={6} hasGutter>
                {images
                  .filter((image) => !image.error)
                  .toSorted(checkOrder)
                  .map((image) => (
                    <GridItem key={image.name}>
                      <ImageSelector
                        data-id="image-selector"
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
            {isHardwareProfilesAvailable ? (
              <HardwareProfileFormSection
                podSpecOptionsState={podSpecOptionsState}
                isEditing={!!currentUserNotebook}
                visibleIn={[HardwareProfileFeatureVisibility.WORKBENCH]}
              />
            ) : (
              <>
                <SizeSelectField
                  data-id="container-size"
                  value={podSpecOptionsState.notebooksSize.selectedSize}
                  setValue={(size) => podSpecOptionsState.notebooksSize.setSelectedSize(size)}
                  sizes={podSpecOptionsState.notebooksSize.sizes}
                />
                <AcceleratorProfileSelectField
                  initialState={podSpecOptionsState.acceleratorProfile.initialState}
                  acceleratorProfilesLoaded={podSpecOptionsState.acceleratorProfile.loaded}
                  formData={podSpecOptionsState.acceleratorProfile.formData}
                  setFormData={podSpecOptionsState.acceleratorProfile.setFormData}
                />
              </>
            )}
          </FormSection>
          <FormSection title="Environment variables" className="odh-notebook-controller__env-var">
            {renderEnvironmentVariableRows()}
            <Button
              icon={<PlusCircleIcon />}
              className="odh-notebook-controller__env-var-add-button"
              isInline
              variant="link"
              onClick={addEnvironmentVariableRow}
            >
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
                data-id="start-server-button"
                data-testid="start-server-button"
                variant="primary"
                onClick={() => {
                  handleNotebookAction().catch((e) => {
                    setCreateInProgress(false);
                    hideStartShown();
                    /* eslint-disable-next-line no-console */
                    console.error('Error submitting resources around starting a notebook', e);
                    setSubmitError(e);
                  });
                }}
                isDisabled={disableSubmit}
              >
                Start workbench
              </Button>
              <Button
                data-id="cancel-button"
                data-testid="cancel-start-server-button"
                variant="secondary"
                onClick={() => {
                  if (impersonatedUsername) {
                    setImpersonating();
                  } else {
                    navigate(isHomeAvailable ? '/applications/enabled' : '/');
                  }
                }}
              >
                Cancel
              </Button>
            </ActionGroup>
          </div>
          <BrowserTabPreferenceCheckbox />
        </Form>
        {createInProgress ? (
          <StartServerModal
            spawnInProgress={startShown}
            onClose={() => {
              if (currentUserNotebook) {
                const notebookName = currentUserNotebook.metadata.name ?? '';
                stopNotebook(impersonatedUsername || undefined)
                  .then(() => requestNotebookRefresh())
                  .catch((e) =>
                    notification.error(`Error stop notebook ${notebookName}`, e.message),
                  );
              } else {
                // Shouldn't happen, but if we don't have a notebook, there is nothing to stop
                hideStartShown();
              }
              setCreateInProgress(false);
            }}
          />
        ) : null}
      </ApplicationsPage>
    </>
  );
};

export default SpawnerPage;
