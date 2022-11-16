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
  NotebookState,
} from '../../../../types';
import ImageSelector from './ImageSelector';
import EnvironmentVariablesRow from './EnvironmentVariablesRow';
import { CUSTOM_VARIABLE, EMPTY_KEY, ENV_VAR_NAME_REGEX } from '../../const';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { enableNotebook, stopNotebook } from '../../../../services/notebookService';
import {
  generateEnvVarFileNameFromUsername,
  verifyResource,
  useNotebookUserState,
  classifyEnvVars,
} from '../../../../utilities/notebookControllerUtils';
import { useAppContext } from '../../../../app/AppContext';
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
import { getEnvConfigMap, getEnvSecret } from '../../../../services/envService';

import '../../NotebookController.scss';

const SpawnerPage: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const { images, loaded, loadError } = useWatchImages();
  const { buildStatuses } = useAppContext();
  const { currentUserNotebook, requestNotebookRefresh, impersonatedUsername, setImpersonating } =
    React.useContext(NotebookControllerContext);
  const { notebookNamespace: projectName } = useNamespaces();
  const currentUserState = useNotebookUserState();
  const username = currentUserState.user;
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const { startShown, hideStartShown, refreshNotebookForStart } =
    useSpawnerNotebookModalState(createInProgress);
  const [selectedImageTag, setSelectedImageTag] = React.useState<ImageTag>({
    image: undefined,
    tag: undefined,
  });
  const { selectedSize, setSelectedSize, sizes } = usePreferredNotebookSize();
  const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
  const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
  const [submitError, setSubmitError] = React.useState<Error | null>(null);

  const disableSubmit =
    createInProgress || variableRows.some(({ errors }) => Object.keys(errors).length > 0);

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
      const response = await verifyResource<ConfigMap | Secret>(
        envVarFileName,
        projectName,
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
    [username, projectName],
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
    updatedRow.variables.forEach((variable) => {
      if (!ENV_VAR_NAME_REGEX.test(variable.name)) {
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
    fireTrackingEvent('Notebook Server Started', {
      GPU: parseInt(selectedGpu),
      lastSelectedSize: selectedSize.name,
      lastSelectedImage: `${selectedImageTag.image?.name}:${selectedImageTag.tag?.name}`,
    });
  };

  const handleNotebookAction = async () => {
    setSubmitError(null);
    setCreateInProgress(true);
    const envVars = classifyEnvVars(variableRows);

    enableNotebook({
      notebookSizeName: selectedSize.name,
      imageName: selectedImageTag.image?.name || '',
      imageTagName: selectedImageTag.tag?.name || '',
      gpus: parseInt(selectedGpu),
      envVars: envVars,
      state: NotebookState.Started,
      username: impersonatedUsername || username,
    })
      .then(() => {
        fireStartServerEvent();
        refreshNotebookForStart();
      })
      .catch((e) => {
        setSubmitError(e);
        setCreateInProgress(false);
        // We had issues spawning the notebook -- try to stop it
        stopNotebook(impersonatedUsername ? impersonatedUsername : undefined).catch(() =>
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
        title="Start a notebook server"
        description="Select options for your notebook server."
        loaded={loaded}
        loadError={loadError}
        empty={!images || images.length === 0}
      >
        <Form maxWidth="1000px" className="odh-notebook-controller__page">
          <FormSection title="Notebook image">
            <FormGroup fieldId="modal-notebook-image">
              <Grid sm={12} md={12} lg={12} xl={6} xl2={6} hasGutter>
                {[...images].sort(checkOrder).map((image) => (
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
            <SizeSelectField
              data-id="container-size"
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
                data-id="start-server-button"
                variant="primary"
                onClick={() => {
                  handleNotebookAction().catch((e) => {
                    setCreateInProgress(false);
                    hideStartShown();
                    console.error('Error submitting resources around starting a notebook', e);
                    setSubmitError(e);
                  });
                }}
                isDisabled={disableSubmit}
              >
                Start server
              </Button>
              <Button
                data-id="cancel-button"
                variant="secondary"
                onClick={() => {
                  if (impersonatedUsername) {
                    setImpersonating();
                  } else {
                    navigate('/');
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
              stopNotebook(impersonatedUsername ? impersonatedUsername : undefined)
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
