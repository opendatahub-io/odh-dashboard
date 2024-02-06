import * as React from 'react';
import { Form, FormSection, Modal, Stack, StackItem } from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  submitInferenceServiceResource,
  useCreateInferenceServiceObject,
} from '~/pages/modelServing/screens/projects/utils';
import { InferenceServiceKind, ProjectKind, ServingRuntimeKind } from '~/k8sTypes';
import { DataConnection } from '~/pages/projects/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { InferenceServiceStorageType } from '~/pages/modelServing/screens/types';
import { isAWSValid } from '~/pages/projects/screens/spawner/spawnerUtils';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { getProjectDisplayName, translateDisplayNameForK8s } from '~/pages/projects/utils';
import { containsOnlySlashes, removeLeadingSlashes } from '~/utilities/string';
import DataConnectionSection from './DataConnectionSection';
import ProjectSection from './ProjectSection';
import InferenceServiceFrameworkSection from './InferenceServiceFrameworkSection';
import InferenceServiceServingRuntimeSection from './InferenceServiceServingRuntimeSection';
import InferenceServiceNameSection from './InferenceServiceNameSection';

type ManageInferenceServiceModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
} & EitherOrNone<
  { editInfo?: InferenceServiceKind },
  {
    projectContext?: {
      currentProject: ProjectKind;
      currentServingRuntime?: ServingRuntimeKind;
      dataConnections: DataConnection[];
    };
  }
>;

const ManageInferenceServiceModal: React.FC<ManageInferenceServiceModalProps> = ({
  isOpen,
  onClose,
  editInfo,
  projectContext,
}) => {
  const [createData, setCreateData, resetData] = useCreateInferenceServiceObject(editInfo);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const isInferenceServiceNameWithinLimit =
    translateDisplayNameForK8s(createData.name).length <= 253;

  React.useEffect(() => {
    if (projectContext) {
      const { currentProject, currentServingRuntime } = projectContext;
      setCreateData('project', currentProject.metadata.name);
      setCreateData('servingRuntimeName', currentServingRuntime?.metadata.name || '');
    }
  }, [projectContext, setCreateData]);

  const storageCanCreate = (): boolean => {
    if (createData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      return createData.storage.dataConnection !== '';
    }
    return isAWSValid(createData.storage.awsData, [AWS_KEYS.AWS_S3_BUCKET]);
  };

  const isDisabled =
    actionInProgress ||
    createData.name.trim() === '' ||
    createData.project === '' ||
    createData.format.name === '' ||
    removeLeadingSlashes(createData.storage.path).includes('//') ||
    containsOnlySlashes(createData.storage.path) ||
    createData.storage.path === '' ||
    !isInferenceServiceNameWithinLimit ||
    !storageCanCreate();

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setError(undefined);
    setActionInProgress(false);
    resetData();
  };

  const onSuccess = () => {
    onBeforeClose(true);
  };

  const setErrorModal = (error: Error) => {
    setError(error);
    setActionInProgress(false);
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    submitInferenceServiceResource(createData, editInfo, undefined, true)
      .then(() => onSuccess())
      .catch((e) => {
        setErrorModal(e);
      });
  };

  return (
    <Modal
      title="Deploy model"
      description="Configure properties for deploying your model"
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      footer={
        <DashboardModalFooter
          submitLabel="Deploy"
          onSubmit={submit}
          onCancel={() => onBeforeClose(false)}
          isSubmitDisabled={isDisabled}
          error={error}
          alertTitle="Error creating model server"
        />
      }
      showClose
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <ProjectSection
              projectName={
                (projectContext?.currentProject &&
                  getProjectDisplayName(projectContext.currentProject)) ||
                editInfo?.metadata.namespace ||
                ''
              }
            />
          </StackItem>
          <StackItem>
            <InferenceServiceNameSection
              data={createData}
              setData={setCreateData}
              isNameValid={isInferenceServiceNameWithinLimit}
            />
          </StackItem>
          <StackItem>
            <InferenceServiceServingRuntimeSection
              data={createData}
              setData={setCreateData}
              currentServingRuntime={projectContext?.currentServingRuntime}
            />
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
    </Modal>
  );
};

export default ManageInferenceServiceModal;
