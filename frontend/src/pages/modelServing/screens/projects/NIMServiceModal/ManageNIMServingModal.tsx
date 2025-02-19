import * as React from 'react';
import { Form, getUniqueId, Stack, StackItem } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  createNIMPVC,
  createNIMSecret,
  getSubmitInferenceServiceResourceFn,
  getSubmitServingRuntimeResourcesFn,
  useCreateInferenceServiceObject,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import {
  AccessReviewResourceAttributes,
  InferenceServiceKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
  ServingRuntimeKind,
} from '~/k8sTypes';
import { requestsUnderLimits, resourcesArePositive } from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { ServingRuntimeEditInfo } from '~/pages/modelServing/screens/types';
import ServingRuntimeSizeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeSizeSection';
import NIMModelListSection from '~/pages/modelServing/screens/projects/NIMServiceModal/NIMModelListSection';
import NIMModelDeploymentNameSection from '~/pages/modelServing/screens/projects/NIMServiceModal/NIMModelDeploymentNameSection';
import ProjectSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSection';
import { DataConnection, NamespaceApplicationCase } from '~/pages/projects/types';
import {
  getDisplayNameFromK8sResource,
  translateDisplayNameForK8s,
  translateDisplayNameForK8sAndReport,
} from '~/concepts/k8s/utils';
import { getSecret, updatePvc, useAccessReview } from '~/api';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import KServeAutoscalerReplicaSection from '~/pages/modelServing/screens/projects/kServeModal/KServeAutoscalerReplicaSection';
import NIMPVCSizeSection from '~/pages/modelServing/screens/projects/NIMServiceModal/NIMPVCSizeSection';
import {
  getNIMServingRuntimeTemplate,
  updateServingRuntimeTemplate,
} from '~/pages/modelServing/screens/projects/nimUtils';
import { useDashboardNamespace } from '~/redux/selectors';
import { getServingRuntimeFromTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import { useNIMPVC } from '~/pages/modelServing/screens/projects/NIMServiceModal/useNIMPVC';
import AuthServingRuntimeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/AuthServingRuntimeSection';
import { useNIMTemplateName } from '~/pages/modelServing/screens/projects/useNIMTemplateName';
import { KServeDeploymentModeDropdown } from '~/pages/modelServing/screens/projects/kServeModal/KServeDeploymentModeDropdown';
import { useModelServingPodSpecOptionsState } from '~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { useKServeDeploymentMode } from '~/pages/modelServing/useKServeDeploymentMode';
import { NoAuthAlert } from './NoAuthAlert';

const NIM_SECRET_NAME = 'nvidia-nim-secrets';
const NIM_NGC_SECRET_NAME = 'ngc-secret';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

type ManageNIMServingModalProps = {
  onClose: (submit: boolean) => void;
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

const ManageNIMServingModal: React.FC<ManageNIMServingModalProps> = ({
  onClose,
  projectContext,
  editInfo,
}) => {
  const { isRawAvailable, isServerlessAvailable } = useKServeDeploymentMode();

  const [createDataServingRuntime, setCreateDataServingRuntime, resetDataServingRuntime] =
    useCreateServingRuntimeObject(editInfo?.servingRuntimeEditInfo);
  const [createDataInferenceService, setCreateDataInferenceService, resetDataInferenceService] =
    useCreateInferenceServiceObject(
      editInfo?.inferenceServiceEditInfo,
      editInfo?.servingRuntimeEditInfo?.servingRuntime,
      editInfo?.secrets,
    );

  const podSpecOptionsState = useModelServingPodSpecOptionsState(
    editInfo?.servingRuntimeEditInfo?.servingRuntime,
    editInfo?.inferenceServiceEditInfo,
  );

  const isAuthAvailable =
    useIsAreaAvailable(SupportedArea.K_SERVE_AUTH).status ||
    createDataInferenceService.isKServeRawDeployment;
  const currentProjectName = projectContext?.currentProject.metadata.name;
  const namespace = currentProjectName || createDataInferenceService.project;

  const [translatedName] = translateDisplayNameForK8sAndReport(createDataInferenceService.name, {
    maxLength: 253,
  });

  const [servingRuntimeSelected, setServingRuntimeSelected] = React.useState<
    ServingRuntimeKind | undefined
  >(undefined);

  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();
  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace,
  });

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [alertVisible, setAlertVisible] = React.useState(true);
  const { pvcSize, setPvcSize, pvc } = useNIMPVC(
    editInfo?.inferenceServiceEditInfo?.metadata.namespace,
    editInfo?.servingRuntimeEditInfo?.servingRuntime,
  );

  React.useEffect(() => {
    if (currentProjectName) {
      setCreateDataInferenceService('project', currentProjectName);
    }
  }, [currentProjectName, setCreateDataInferenceService]);

  React.useEffect(() => {
    podSpecOptionsState.modelSize.setSelectedSize({
      name: 'Custom',
      resources: {
        limits: {
          cpu: '16',
          memory: '64Gi',
        },
        requests: {
          cpu: '8',
          memory: '32Gi',
        },
      },
    });
  }, [podSpecOptionsState]);

  // Serving Runtime Validation
  const isDisabledServingRuntime =
    namespace === '' || actionInProgress || createDataServingRuntime.imageName === undefined;

  const baseInputValueValid =
    createDataServingRuntime.numReplicas >= 0 &&
    resourcesArePositive(podSpecOptionsState.podSpecOptions.resources) &&
    requestsUnderLimits(podSpecOptionsState.podSpecOptions.resources);

  const isDisabledInferenceService =
    actionInProgress ||
    createDataInferenceService.name.trim() === '' ||
    createDataInferenceService.project === '' ||
    !translatedName ||
    !baseInputValueValid ||
    !podSpecOptionsState.hardwareProfile.isFormDataValid;

  const { dashboardNamespace } = useDashboardNamespace();
  const templateName = useNIMTemplateName();

  React.useEffect(() => {
    if (editInfo?.servingRuntimeEditInfo?.servingRuntime) {
      setServingRuntimeSelected(editInfo.servingRuntimeEditInfo.servingRuntime);
    } else {
      const fetchNIMServingRuntimeTemplate = async () => {
        if (templateName) {
          const nimTemplate = await getNIMServingRuntimeTemplate(dashboardNamespace, templateName);
          setServingRuntimeSelected(getServingRuntimeFromTemplate(nimTemplate));
        }
      };

      fetchNIMServingRuntimeTemplate();
    }
  }, [templateName, dashboardNamespace, editInfo]);

  const isSecretNeeded = async (ns: string, secretName: string): Promise<boolean> => {
    try {
      await getSecret(ns, secretName);
      return false; // Secret exists, no need to create
    } catch {
      return true; // Secret does not exist, needs to be created
    }
  };

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setError(undefined);
    setActionInProgress(false);
    resetDataServingRuntime();
    resetDataInferenceService();
    podSpecOptionsState.acceleratorProfile.resetFormData();
    podSpecOptionsState.hardwareProfile.resetFormData();
    podSpecOptionsState.modelSize.setSelectedSize(podSpecOptionsState.modelSize.sizes[0]);
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
      editInfo?.inferenceServiceEditInfo?.spec.predictor.model?.runtime ||
      translateDisplayNameForK8s(createDataInferenceService.name, { safeK8sPrefix: 'nim-' });

    const nimPVCName = getUniqueId('nim-pvc');
    const finalServingRuntime =
      !editInfo && servingRuntimeSelected
        ? updateServingRuntimeTemplate(servingRuntimeSelected, nimPVCName)
        : servingRuntimeSelected;

    const submitServingRuntimeResources = getSubmitServingRuntimeResourcesFn(
      finalServingRuntime,
      createDataServingRuntime,
      customServingRuntimesEnabled,
      namespace,
      editInfo?.servingRuntimeEditInfo,
      false,
      podSpecOptionsState.podSpecOptions,
      NamespaceApplicationCase.KSERVE_NIM_PROMOTION,
      projectContext?.currentProject,
      servingRuntimeName,
      false,
    );

    const inferenceServiceName = createDataInferenceService.k8sName;
    const submitInferenceServiceResource = getSubmitInferenceServiceResourceFn(
      createDataInferenceService,
      editInfo?.inferenceServiceEditInfo,
      servingRuntimeName,
      inferenceServiceName,
      false,
      podSpecOptionsState.podSpecOptions,
      allowCreate,
      editInfo?.secrets,
      false,
    );

    Promise.all([
      submitServingRuntimeResources({ dryRun: true }),
      submitInferenceServiceResource({ dryRun: true }),
    ])
      .then(async () => {
        const promises: Promise<void | SecretKind | PersistentVolumeClaimKind>[] = [
          submitServingRuntimeResources({ dryRun: false }).then(() => undefined),
          submitInferenceServiceResource({ dryRun: false }).then(() => undefined),
        ];

        if (!editInfo) {
          if (await isSecretNeeded(namespace, NIM_SECRET_NAME)) {
            promises.push(createNIMSecret(namespace, 'apiKeySecret', false, false));
          }
          if (await isSecretNeeded(namespace, NIM_NGC_SECRET_NAME)) {
            promises.push(createNIMSecret(namespace, 'nimPullSecret', true, false));
          }
          promises.push(createNIMPVC(namespace, nimPVCName, pvcSize, false));
        } else if (pvc && pvc.spec.resources.requests.storage !== pvcSize) {
          const updatePvcData = {
            size: pvcSize, // New size
            name: pvc.metadata.name,
            description: pvc.metadata.annotations?.description || '',
            storageClassName: pvc.spec.storageClassName,
          };
          promises.push(updatePvc(updatePvcData, pvc, namespace, { dryRun: false }));
        }
        return Promise.all(promises);
      })
      .then(() => onSuccess())
      .catch((e) => {
        setErrorModal(e);
      });
  };
  const getProjectName = () => {
    const currentName = projectContext?.currentProject
      ? getDisplayNameFromK8sResource(projectContext.currentProject)
      : '';
    const namespaceName = editInfo?.inferenceServiceEditInfo?.metadata.namespace || '';
    return currentName || namespaceName || '';
  };

  return (
    <Modal
      title={`${editInfo ? 'Edit' : 'Deploy'} model with NVIDIA NIM`}
      description="Configure properties for deploying your model using an NVIDIA NIM."
      variant="medium"
      isOpen
      onClose={() => onBeforeClose(false)}
      footer={
        <DashboardModalFooter
          submitLabel={editInfo ? 'Redeploy' : 'Deploy'}
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
          {!isAuthAvailable && alertVisible && !isRawAvailable && (
            <NoAuthAlert onClose={() => setAlertVisible(false)} />
          )}
          <StackItem>
            <ProjectSection projectName={getProjectName()} />
          </StackItem>
          <StackItem>
            <NIMModelDeploymentNameSection
              data={createDataInferenceService}
              setData={setCreateDataInferenceService}
            />
          </StackItem>
          <StackItem>
            <StackItem>
              <NIMModelListSection
                inferenceServiceData={createDataInferenceService}
                setInferenceServiceData={setCreateDataInferenceService}
                setServingRuntimeData={setCreateDataServingRuntime}
                isEditing={!!editInfo}
              />
            </StackItem>
          </StackItem>
          <StackItem>
            <NIMPVCSizeSection pvcSize={pvcSize} setPvcSize={setPvcSize} />
          </StackItem>
          {isRawAvailable && isServerlessAvailable && (
            <StackItem>
              <KServeDeploymentModeDropdown
                isRaw={!!createDataInferenceService.isKServeRawDeployment}
                setIsRaw={(isRaw) => setCreateDataInferenceService('isKServeRawDeployment', isRaw)}
                isDisabled={!!editInfo}
              />
            </StackItem>
          )}
          {!isAuthAvailable && alertVisible && isRawAvailable && (
            <NoAuthAlert onClose={() => setAlertVisible(false)} />
          )}
          <StackItem>
            <KServeAutoscalerReplicaSection
              data={createDataInferenceService}
              setData={setCreateDataInferenceService}
              infoContent="Consider network traffic and failover scenarios when specifying the number of model
                server replicas."
            />
          </StackItem>
          <ServingRuntimeSizeSection
            isEditing={!!editInfo}
            servingRuntimeSelected={servingRuntimeSelected}
            podSpecOptionState={podSpecOptionsState}
            infoContent="Select CPU and memory resources large enough to support the NIM being deployed."
          />
          {isAuthAvailable && (
            <AuthServingRuntimeSection
              data={createDataInferenceService}
              setData={setCreateDataInferenceService}
              allowCreate={allowCreate}
              publicRoute
            />
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageNIMServingModal;
