import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Form,
  FormSection,
  Modal,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  getSubmitInferenceServiceResourceFn,
  getSubmitServingRuntimeResourcesFn,
  useCreateInferenceServiceObject,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import {
  TemplateKind,
  ProjectKind,
  InferenceServiceKind,
  AccessReviewResourceAttributes,
  SecretKind,
} from '~/k8sTypes';
import { requestsUnderLimits, resourcesArePositive } from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getServingRuntimeFromName } from '~/pages/modelServing/customServingRuntimes/utils';
import useServingAcceleratorProfile from '~/pages/modelServing/screens/projects/useServingAcceleratorProfile';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import {
  InferenceServiceStorageType,
  ServingRuntimeEditInfo,
} from '~/pages/modelServing/screens/types';
import ServingRuntimeSizeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeSizeSection';
import ServingRuntimeTemplateSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeTemplateSection';
import ProjectSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSection';
import { DataConnection, NamespaceApplicationCase } from '~/pages/projects/types';
import { AwsKeys } from '~/pages/projects/dataConnections/const';
import { isAWSValid } from '~/pages/projects/screens/spawner/spawnerUtils';
import InferenceServiceNameSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/InferenceServiceNameSection';
import InferenceServiceFrameworkSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/InferenceServiceFrameworkSection';
import DataConnectionSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/DataConnectionSection';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { containsOnlySlashes, isS3PathValid } from '~/utilities/string';
import AuthServingRuntimeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/AuthServingRuntimeSection';
import { useAccessReview } from '~/api';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import KServeAutoscalerReplicaSection from './KServeAutoscalerReplicaSection';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

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
      secrets?: SecretKind[];
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
    useCreateInferenceServiceObject(
      editInfo?.inferenceServiceEditInfo,
      editInfo?.servingRuntimeEditInfo?.servingRuntime,
      editInfo?.secrets,
    );

  const isAuthorinoEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_AUTH).status;
  const currentProjectName = projectContext?.currentProject.metadata.name;
  const namespace = currentProjectName || createDataInferenceService.project;
  const isInferenceServiceNameWithinLimit =
    translateDisplayNameForK8s(createDataInferenceService.name).length <= 253;

  const [acceleratorProfileState, setAcceleratorProfileState, resetAcceleratorProfileData] =
    useServingAcceleratorProfile(
      editInfo?.servingRuntimeEditInfo?.servingRuntime,
      editInfo?.inferenceServiceEditInfo,
    );
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();
  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace,
  });

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [alertVisible, setAlertVisible] = React.useState(true);

  React.useEffect(() => {
    if (currentProjectName && isOpen) {
      setCreateDataInferenceService('project', currentProjectName);
    }
  }, [currentProjectName, setCreateDataInferenceService, isOpen]);

  // Serving Runtime Validation
  const isDisabledServingRuntime = namespace === '' || actionInProgress;

  // Inference Service Validation
  const storageCanCreate = (): boolean => {
    if (createDataInferenceService.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      return createDataInferenceService.storage.dataConnection !== '';
    }
    return isAWSValid(createDataInferenceService.storage.awsData, [AwsKeys.AWS_S3_BUCKET]);
  };

  const baseInputValueValid =
    createDataInferenceService.maxReplicas >= 0 &&
    resourcesArePositive(createDataInferenceService.modelSize.resources) &&
    requestsUnderLimits(createDataInferenceService.modelSize.resources);

  const isDisabledInferenceService =
    actionInProgress ||
    createDataInferenceService.name.trim() === '' ||
    createDataInferenceService.project === '' ||
    createDataInferenceService.format.name === '' ||
    containsOnlySlashes(createDataInferenceService.storage.path) ||
    !isS3PathValid(createDataInferenceService.storage.path) ||
    createDataInferenceService.storage.path === '' ||
    !isInferenceServiceNameWithinLimit ||
    !storageCanCreate() ||
    !baseInputValueValid;

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
    setAlertVisible(true);
  };

  const setErrorModal = (e: Error) => {
    setError(e);
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

    const submitServingRuntimeResources = getSubmitServingRuntimeResourcesFn(
      servingRuntimeSelected,
      createDataServingRuntime,
      customServingRuntimesEnabled,
      namespace,
      editInfo?.servingRuntimeEditInfo,
      false,
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
      allowCreate,
      editInfo?.secrets,
    );

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
          {!isAuthorinoEnabled && alertVisible && (
            <StackItem>
              <Alert
                id="no-authorino-installed-alert"
                data-testid="no-authorino-installed-alert"
                isExpandable
                isInline
                variant="warning"
                title="Token authorization service not installed"
                actionClose={<AlertActionCloseButton onClose={() => setAlertVisible(false)} />}
              >
                <p>
                  The single model serving platform used by this project allows deployed models to
                  be accessible via external routes. It is recommended that token authorization be
                  enabled to protect these routes. The serving platform requires the Authorino
                  operator be installed on the cluster for token authorization. Contact a cluster
                  administrator to install the operator.
                </p>
              </Alert>
            </StackItem>
          )}
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
            <KServeAutoscalerReplicaSection
              data={createDataInferenceService}
              setData={setCreateDataInferenceService}
              infoContent="Consider network traffic and failover scenarios when specifying the number of model
                server replicas."
            />
          </StackItem>
          <StackItem>
            <ServingRuntimeSizeSection
              data={createDataInferenceService}
              setData={setCreateDataInferenceService}
              sizes={sizes}
              servingRuntimeSelected={servingRuntimeSelected}
              acceleratorProfileState={acceleratorProfileState}
              setAcceleratorProfileState={setAcceleratorProfileState}
              infoContent="Select a server size that will accommodate your largest model. See the product documentation for more information."
            />
          </StackItem>
          {isAuthorinoEnabled && (
            <StackItem>
              <AuthServingRuntimeSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                allowCreate={allowCreate}
              />
            </StackItem>
          )}
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
