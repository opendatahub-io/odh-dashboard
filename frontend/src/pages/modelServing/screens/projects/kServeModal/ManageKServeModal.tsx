import * as React from 'react';
import { Form, FormSection, Modal, Stack, StackItem } from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  submitInferenceServiceResource,
  submitServingRuntimeResources,
  useCreateInferenceServiceObject,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import { TemplateKind, ProjectKind, InferenceServiceKind } from '~/k8sTypes';
import { requestsUnderLimits, resourcesArePositive } from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getServingRuntimeFromName } from '~/pages/modelServing/customServingRuntimes/utils';
import useServingAccelerator from '~/pages/modelServing/screens/projects/useServingAccelerator';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import {
  InferenceServiceStorageType,
  ServingRuntimeEditInfo,
} from '~/pages/modelServing/screens/types';
import ServingRuntimeReplicaSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeReplicaSection';
import ServingRuntimeSizeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeSizeSection';
import ServingRuntimeTemplateSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeTemplateSection';
import ProjectSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSection';
import { DataConnection, NamespaceApplicationCase } from '~/pages/projects/types';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { isAWSValid } from '~/pages/projects/screens/spawner/spawnerUtils';
import InferenceServiceNameSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/InferenceServiceNameSection';
import InferenceServiceFrameworkSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/InferenceServiceFrameworkSection';
import DataConnectionSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/DataConnectionSection';
import { getProjectDisplayName, translateDisplayNameForK8s } from '~/pages/projects/utils';

type ManageKServeModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
  servingRuntimeTemplates?: TemplateKind[];
} & EitherOrNone<
  {
    projectContext?: {
      currentProject: ProjectKind;
      dataConnections: DataConnection[];
    };
  },
  {
    editInfo?: {
      servingRuntimeEditInfo?: ServingRuntimeEditInfo;
      inferenceServiceEditInfo?: InferenceServiceKind;
    };
  }
>;

const ManageKServeModal: React.FC<ManageKServeModalProps> = ({
  isOpen,
  onClose,
  servingRuntimeTemplates,
  projectContext,
  editInfo,
}) => {
  const [createDataServingRuntime, setCreateDataServingRuntime, resetDataServingRuntime, sizes] =
    useCreateServingRuntimeObject(editInfo?.servingRuntimeEditInfo);
  const [createDataInferenceService, setCreateDataInferenceService, resetDataInferenceService] =
    useCreateInferenceServiceObject(editInfo?.inferenceServiceEditInfo);
  const [acceleratorState, setAcceleratorState, resetAcceleratorData] = useServingAccelerator(
    editInfo?.servingRuntimeEditInfo?.servingRuntime,
    editInfo?.inferenceServiceEditInfo,
  );

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (projectContext?.currentProject) {
      setCreateDataInferenceService('project', projectContext?.currentProject.metadata.name);
    }
  }, [projectContext, setCreateDataInferenceService]);

  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const namespace =
    projectContext?.currentProject.metadata.name || createDataInferenceService.project;

  // Serving Runtime Validation
  const baseInputValueValid =
    createDataServingRuntime.numReplicas >= 0 &&
    resourcesArePositive(createDataServingRuntime.modelSize.resources) &&
    requestsUnderLimits(createDataServingRuntime.modelSize.resources);

  const isDisabledServingRuntime = namespace === '' || actionInProgress || !baseInputValueValid;

  // Inference Service Validation
  const storageCanCreate = (): boolean => {
    if (createDataInferenceService.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      return createDataInferenceService.storage.dataConnection !== '';
    }
    return isAWSValid(createDataInferenceService.storage.awsData, [AWS_KEYS.AWS_S3_BUCKET]);
  };

  const isDisabledInferenceService =
    actionInProgress ||
    createDataInferenceService.name.trim() === '' ||
    createDataInferenceService.project === '' ||
    createDataInferenceService.format.name === '' ||
    createDataInferenceService.storage.path.includes('//') ||
    createDataInferenceService.storage.path === '' ||
    createDataInferenceService.storage.path === '/' ||
    !storageCanCreate();

  const servingRuntimeSelected = React.useMemo(
    () =>
      editInfo?.servingRuntimeEditInfo?.servingRuntime ||
      getServingRuntimeFromName(
        createDataServingRuntime.servingRuntimeTemplateName,
        servingRuntimeTemplates,
      ),
    [editInfo, servingRuntimeTemplates, createDataServingRuntime.servingRuntimeTemplateName],
  );

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setError(undefined);
    setActionInProgress(false);
    resetDataServingRuntime();
    resetDataInferenceService();
    resetAcceleratorData();
  };

  const setErrorModal = (error: Error) => {
    setError(error);
    setActionInProgress(false);
  };

  const onSuccess = () => {
    setActionInProgress(false);
    onBeforeClose(true);
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    const servingRuntimeName =
      editInfo?.inferenceServiceEditInfo?.spec.predictor.model.runtime ||
      translateDisplayNameForK8s(createDataInferenceService.name);

    Promise.all([
      submitServingRuntimeResources(
        servingRuntimeSelected,
        createDataServingRuntime,
        customServingRuntimesEnabled,
        namespace,
        editInfo?.servingRuntimeEditInfo,
        true,
        acceleratorState,
        NamespaceApplicationCase.KSERVE_PROMOTION,
        projectContext?.currentProject,
        servingRuntimeName,
        false,
      ),
      submitInferenceServiceResource(
        createDataInferenceService,
        editInfo?.inferenceServiceEditInfo,
        servingRuntimeName,
        false,
        acceleratorState,
      ),
    ])
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
          isSubmitDisabled={isDisabledServingRuntime || isDisabledInferenceService}
          error={error}
          alertTitle="Error creating model server"
        />
      }
      showClose
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
              projectName={
                (projectContext?.currentProject &&
                  getProjectDisplayName(projectContext?.currentProject)) ||
                editInfo?.inferenceServiceEditInfo?.metadata.namespace ||
                ''
              }
            />
          </StackItem>
          <StackItem>
            <StackItem>
              <InferenceServiceNameSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
              />
            </StackItem>
          </StackItem>
          <StackItem>
            <ServingRuntimeTemplateSection
              data={createDataServingRuntime}
              setData={setCreateDataServingRuntime}
              templates={servingRuntimeTemplates || []}
              isEditing={!!editInfo}
              acceleratorState={acceleratorState}
            />
          </StackItem>
          <StackItem>
            <InferenceServiceFrameworkSection
              data={createDataInferenceService}
              setData={setCreateDataInferenceService}
              modelContext={servingRuntimeSelected?.spec.supportedModelFormats}
            />
          </StackItem>
          <StackItem>
            <ServingRuntimeReplicaSection
              data={createDataServingRuntime}
              setData={setCreateDataServingRuntime}
            />
          </StackItem>
          <StackItem>
            <ServingRuntimeSizeSection
              data={createDataServingRuntime}
              setData={setCreateDataServingRuntime}
              sizes={sizes}
              servingRuntimeSelected={servingRuntimeSelected}
              acceleratorState={acceleratorState}
              setAcceleratorState={setAcceleratorState}
            />
          </StackItem>
          <StackItem>
            <FormSection title="Model location" id="model-location">
              <DataConnectionSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                dataConnectionContext={projectContext?.dataConnections}
              />
            </FormSection>
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageKServeModal;
