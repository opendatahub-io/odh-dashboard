import * as React from 'react';
import { Form, FormSection, Modal, Stack, StackItem } from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  getCreateInferenceServiceLabels,
  submitInferenceServiceResourceWithDryRun,
  useCreateInferenceServiceObject,
} from '~/pages/modelServing/screens/projects/utils';
import { InferenceServiceKind, ProjectKind, ServingRuntimeKind } from '~/k8sTypes';
import { DataConnection } from '~/pages/projects/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { InferenceServiceStorageType } from '~/pages/modelServing/screens/types';
import { isAWSValid } from '~/pages/projects/screens/spawner/spawnerUtils';
import { AwsKeys } from '~/pages/projects/dataConnections/const';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { containsOnlySlashes, isS3PathValid } from '~/utilities/string';
import { RegisteredModelDeployInfo } from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployInfo';
import usePrefillDeployModalFromModelRegistry from '~/pages/modelRegistry/screens/RegisteredModels/usePrefillDeployModalFromModelRegistry';
import DataConnectionSection from './DataConnectionSection';
import ProjectSection from './ProjectSection';
import InferenceServiceFrameworkSection from './InferenceServiceFrameworkSection';
import InferenceServiceServingRuntimeSection from './InferenceServiceServingRuntimeSection';
import InferenceServiceNameSection from './InferenceServiceNameSection';

type ManageInferenceServiceModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
  registeredModelDeployInfo?: RegisteredModelDeployInfo;
  shouldFormHidden?: boolean;
  projectSection?: React.ReactNode;
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
  projectSection,
  registeredModelDeployInfo,
  shouldFormHidden,
}) => {
  const [createData, setCreateData, resetData] = useCreateInferenceServiceObject(editInfo);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const isInferenceServiceNameWithinLimit =
    translateDisplayNameForK8s(createData.name).length <= 253;

  const currentProjectName = projectContext?.currentProject.metadata.name || '';
  const currentServingRuntimeName = projectContext?.currentServingRuntime?.metadata.name || '';

  const [dataConnections, dataConnectionsLoaded, dataConnectionsLoadError] =
    usePrefillDeployModalFromModelRegistry(
      projectContext,
      createData,
      setCreateData,
      registeredModelDeployInfo,
    );

  React.useEffect(() => {
    setCreateData('project', currentProjectName);
    setCreateData('servingRuntimeName', currentServingRuntimeName);
  }, [setCreateData, currentProjectName, currentServingRuntimeName]);

  const storageCanCreate = (): boolean => {
    if (createData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      return createData.storage.dataConnection !== '';
    }
    return isAWSValid(createData.storage.awsData, [AwsKeys.AWS_S3_BUCKET]);
  };

  const isDisabled =
    actionInProgress ||
    createData.name.trim() === '' ||
    createData.project === '' ||
    createData.format.name === '' ||
    createData.servingRuntimeName === '' ||
    containsOnlySlashes(createData.storage.path) ||
    !isS3PathValid(createData.storage.path) ||
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

  const setErrorModal = (e: Error) => {
    setError(e);
    setActionInProgress(false);
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    submitInferenceServiceResourceWithDryRun(
      {
        ...createData,
        ...getCreateInferenceServiceLabels(registeredModelDeployInfo),
      },
      editInfo,
      undefined,
      true,
    )
      .then(() => onSuccess())
      .catch((e) => {
        setErrorModal(e);
      });
  };

  return (
    <Modal
      title={editInfo ? 'Edit model' : 'Deploy model'}
      description="Configure properties for deploying your model"
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      footer={
        <DashboardModalFooter
          submitLabel={editInfo ? 'Redeploy' : 'Deploy'}
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
            {projectSection || (
              <ProjectSection
                projectName={
                  (projectContext?.currentProject &&
                    getDisplayNameFromK8sResource(projectContext.currentProject)) ||
                  editInfo?.metadata.namespace ||
                  ''
                }
              />
            )}
          </StackItem>
          {!shouldFormHidden && (
            <>
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
                  registeredModelFormat={registeredModelDeployInfo?.modelFormat}
                />
              </StackItem>
              <StackItem>
                <FormSection title="Model location" id="model-location">
                  <DataConnectionSection
                    data={createData}
                    setData={setCreateData}
                    loaded={!!projectContext?.dataConnections || dataConnectionsLoaded}
                    loadError={dataConnectionsLoadError}
                    dataConnections={dataConnections}
                  />
                </FormSection>
              </StackItem>
            </>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageInferenceServiceModal;
