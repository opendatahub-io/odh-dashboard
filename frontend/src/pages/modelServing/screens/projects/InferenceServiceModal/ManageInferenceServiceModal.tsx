import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormGroup,
  FormSection,
  Modal,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { useCreateInferenceServiceObject } from '../utils';
import InferenceServiceFrameworkSection from './InferenceServiceFrameworkSection';
import { assembleSecret, createInferenceService, createSecret, updateInferenceService } from 'api';
import { InferenceServiceKind, ProjectKind, SecretKind, ServingRuntimeKind } from 'k8sTypes';
import ProjectSection from './ProjectSection';
import { DataConnection } from 'pages/projects/types';
import DataConnectionSection from './DataConnectionSection';
import { InferenceServiceStorageType } from '../../types';
import { isAWSValid } from 'pages/projects/screens/spawner/spawnerUtils';

type ManageInferenceServiceModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
  editInfo?: InferenceServiceKind;
  projectContext?: {
    currentProject: ProjectKind;
    currentServingRuntime: ServingRuntimeKind;
    dataConnections: DataConnection[];
  };
};

const ManageInferenceServiceModal: React.FC<ManageInferenceServiceModalProps> = ({
  isOpen,
  onClose,
  editInfo,
  projectContext,
}) => {
  const [createData, setCreateData, resetData] = useCreateInferenceServiceObject(editInfo);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (projectContext) {
      const { currentProject, currentServingRuntime } = projectContext;
      setCreateData('project', currentProject.metadata.name);
      setCreateData('servingRuntimeName', currentServingRuntime.metadata.name);
    }
  }, [projectContext, setCreateData]);

  const storageCanCreate = (): boolean => {
    if (createData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      return createData.storage.dataConnection !== '';
    } else {
      return isAWSValid(createData.storage.awsData);
    }
  };

  const canCreate =
    !actionInProgress &&
    createData.name !== '' &&
    createData.project !== '' &&
    createData.format.name !== '' &&
    createData.project !== '' &&
    storageCanCreate();

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setActionInProgress(false);
    resetData();
  };

  const setErrorModal = (error: Error) => {
    setError(error);
    setActionInProgress(false);
  };

  const createAWSSecret = (): Promise<SecretKind> => {
    return createSecret(
      assembleSecret(
        createData.project,
        createData.storage.awsData.reduce<Record<string, string>>(
          (acc, { key, value }) => ({ ...acc, [key]: value }),
          {},
        ),
        'aws',
      ),
    );
  };

  const createModel = (): Promise<InferenceServiceKind> => {
    if (createData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      return createInferenceService(createData);
    } else {
      return createAWSSecret().then((secret) => {
        return createInferenceService(createData, secret.metadata.name);
      });
    }
  };

  const updateModel = (): Promise<InferenceServiceKind> => {
    if (!editInfo) {
      return Promise.reject(new Error('No model to update'));
    }
    if (createData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      return updateInferenceService(createData, editInfo);
    } else {
      return createAWSSecret().then((secret) => {
        return updateInferenceService(createData, editInfo, secret.metadata.name);
      });
    }
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    if (editInfo) {
      updateModel()
        .then(() => {
          setActionInProgress(false);
          onBeforeClose(true);
        })
        .catch(setErrorModal);
    } else {
      createModel()
        .then(() => {
          setActionInProgress(false);
          onBeforeClose(true);
        })
        .catch(setErrorModal);
    }
  };

  return (
    <Modal
      title="Deploy model"
      description="Configure properties for deploying your model"
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-model" variant="primary" isDisabled={!canCreate} onClick={submit}>
          Deploy
        </Button>,
        <Button key="cancel-model" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack hasGutter>
          <StackItem>
            <ProjectSection
              data={createData}
              setData={setCreateData}
              editInfo={editInfo}
              project={projectContext?.currentProject}
            />
          </StackItem>
          <StackItem>
            <FormGroup label="Name" isRequired>
              <TextInput
                isRequired
                id="inference-service-name-input"
                value={createData.name}
                onChange={(name) => setCreateData('name', name)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <InferenceServiceFrameworkSection
              data={createData}
              setData={setCreateData}
              modelContext={projectContext?.currentServingRuntime?.spec.supportedModelFormats}
            />
          </StackItem>
          <StackItem>
            <FormSection title="Model location" id="model-location">
              <DataConnectionSection
                data={createData}
                setData={setCreateData}
                dataConnectionContext={projectContext?.dataConnections}
              />
            </FormSection>
          </StackItem>
        </Stack>
      </Form>
      {error && (
        <Alert isInline variant="danger" title="Error creating model server">
          {error.message}
        </Alert>
      )}
    </Modal>
  );
};

export default ManageInferenceServiceModal;
