import * as React from 'react';
import { Form, FormSection, Modal, Stack, StackItem } from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  getSubmitInferenceServiceResourceFn,
  getSubmitServingRuntimeResourcesFn,
  useCreateInferenceServiceObject,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import { TemplateKind, ProjectKind, InferenceServiceKind } from '~/k8sTypes';
import { requestsUnderLimits, resourcesArePositive } from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getServingRuntimeFromName } from '~/pages/modelServing/customServingRuntimes/utils';
import useServingAcceleratorProfile from '~/pages/modelServing/screens/projects/useServingAcceleratorProfile';
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
import { containsOnlySlashes, removeLeadingSlashes } from '~/utilities/string';

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
  const [acceleratorProfileState, setAcceleratorProfileState, resetAcceleratorProfileData] =
    useServingAcceleratorProfile(
      editInfo?.servingRuntimeEditInfo?.servingRuntime,
      editInfo?.inferenceServiceEditInfo,
    );

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const isInferenceServiceNameWithinLimit =
    translateDisplayNameForK8s(createDataInferenceService.name).length <= 253;

  React.useEffect(() => {
    if (projectContext?.currentProject) {
      setCreateDataInferenceService('project', projectContext.currentProject.metadata.name);
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
    removeLeadingSlashes(createDataInferenceService.storage.path).includes('//') ||
    containsOnlySlashes(createDataInferenceService.storage.path) ||
    createDataInferenceService.storage.path === '' ||
    !isInferenceServiceNameWithinLimit ||
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
    resetAcceleratorProfileData();
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

    const replicaCount = createDataServingRuntime.numReplicas;

    const submitServingRuntimeResources = getSubmitServingRuntimeResourcesFn(
      servingRuntimeSelected,
      createDataServingRuntime,
      customServingRuntimesEnabled,
      namespace,
      editInfo?.servingRuntimeEditInfo,
      true,
      acceleratorProfileState,
      NamespaceApplicationCase.KSERVE_PROMOTION,
      projectContext?.currentProject,
      servingRuntimeName,
      false,
    );

    const submitInferenceServiceResource = getSubmitInferenceServiceResourceFn(
      createDataInferenceService,
      editInfo?.inferenceServiceEditInfo,
      servingRuntimeName,
      false,
      acceleratorProfileState,
      replicaCount,
    );

    // TODO mturley add unit test coverage to make sure we don't create any resources if there's an error
    Promise.all([
      submitServingRuntimeResources({ dryRun: true }),
      submitInferenceServiceResource({ dryRun: true }),
    ])
      .then(() =>
        Promise.all([
          submitServingRuntimeResources({ dryRun: false }),
          submitInferenceServiceResource({ dryRun: false }),
        ]),
      )
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
                  getProjectDisplayName(projectContext.currentProject)) ||
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
                isNameValid={isInferenceServiceNameWithinLimit}
              />
            </StackItem>
          </StackItem>
          <StackItem>
            <ServingRuntimeTemplateSection
              data={createDataServingRuntime}
              setData={setCreateDataServingRuntime}
              templates={servingRuntimeTemplates || []}
              isEditing={!!editInfo}
              acceleratorProfileState={acceleratorProfileState}
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
              infoContent="Consider network traffic and failover scenarios when specifying the number of model
                server replicas."
            />
          </StackItem>
          <StackItem>
            <ServingRuntimeSizeSection
              data={createDataServingRuntime}
              setData={setCreateDataServingRuntime}
              sizes={sizes}
              servingRuntimeSelected={servingRuntimeSelected}
              acceleratorProfileState={acceleratorProfileState}
              setAcceleratorProfileState={setAcceleratorProfileState}
              infoContent="Select a server size that will accommodate your largest model. See the product documentation for more information."
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
