import * as React from 'react';
import {
  Form,
  getUniqueId,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  createNIMPVC,
  createNIMSecret,
  getSubmitInferenceServiceResourceFn,
  getSubmitServingRuntimeResourcesFn,
  useCreateInferenceServiceObject,
  useCreateServingRuntimeObject,
  validateEnvVarName,
} from '#~/pages/modelServing/screens/projects/utils';
import {
  AccessReviewResourceAttributes,
  InferenceServiceKind,
  ProjectKind,
  SecretKind,
  ServingRuntimeKind,
} from '#~/k8sTypes';
import {
  createNIMService,
  getSecret,
  patchInferenceServiceStoppedStatus,
  updateNIMService,
  updatePvc,
  useAccessReview,
} from '#~/api';
import type { CreateNIMServiceParams } from '#~/api';
import { useNIMServicesEnabled } from '#~/pages/modelServing/screens/projects/useNIMServicesEnabled';
import { EMPTY_AWS_SECRET_DATA } from '#~/pages/projects/dataConnections/const';
import {
  isNIMOperatorManaged,
  getNIMServiceName,
} from '#~/pages/modelServing/screens/global/nimOperatorUtils';
import useCustomServingRuntimesEnabled from '#~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import {
  InferenceServiceStorageType,
  ServingRuntimeEditInfo,
} from '#~/pages/modelServing/screens/types';
import DeploymentHardwareProfileSection from '#~/pages/modelServing/screens/projects/ServingRuntimeModal/DeploymentHardwareProfileSection';
import NIMModelListSection from '#~/pages/modelServing/screens/projects/nim/NIMServiceModal/NIMModelListSection';
import NIMModelDeploymentNameSection from '#~/pages/modelServing/screens/projects/nim/NIMServiceModal/NIMModelDeploymentNameSection';
import ProjectSection from '#~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSection';
import { NamespaceApplicationCase } from '#~/pages/projects/types';
import {
  getDisplayNameFromK8sResource,
  translateDisplayNameForK8s,
  translateDisplayNameForK8sAndReport,
} from '#~/concepts/k8s/utils';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import KServeAutoscalerReplicaSection from '#~/pages/modelServing/screens/projects/kServeModal/KServeAutoscalerReplicaSection';
import NIMPVCSizeSection, {
  PVCMode,
} from '#~/pages/modelServing/screens/projects/nim/NIMServiceModal/NIMPVCSizeSection';
import {
  getNIMServingRuntimeTemplate,
  updateServingRuntimeTemplate,
} from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import { useDashboardNamespace } from '#~/redux/selectors';
import { getServingRuntimeFromTemplate } from '#~/pages/modelServing/customServingRuntimes/utils';
import { useNIMPVC } from '#~/pages/modelServing/screens/projects/nim/NIMServiceModal/useNIMPVC';
import AuthServingRuntimeSection from '#~/pages/modelServing/screens/projects/ServingRuntimeModal/AuthServingRuntimeSection';
import { useNIMTemplateName } from '#~/pages/modelServing/screens/projects/nim/useNIMTemplateName';
import StorageClassSelect from '#~/pages/projects/screens/spawner/storage/StorageClassSelect';
import { useDefaultStorageClass } from '#~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import { useModelDeploymentNotification } from '#~/pages/modelServing/screens/projects/useModelDeploymentNotification';
import { useGetStorageClassConfig } from '#~/pages/projects/screens/spawner/storage/useGetStorageClassConfig';
import { getKServeContainerEnvVarStrs } from '#~/pages/modelServing/utils';
import EnvironmentVariablesSection from '#~/pages/modelServing/screens/projects/kServeModal/EnvironmentVariablesSection';
import { useAssignHardwareProfile } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';
import {
  MODEL_SERVING_VISIBILITY,
  getInferenceServiceHardwareProfilePaths,
} from '#~/concepts/hardwareProfiles/const';

const NIM_SECRET_NAME = 'nvidia-nim-secrets';
const NIM_NGC_SECRET_NAME = 'ngc-secret';
const DEFAULT_MODEL_PATH = '/mnt/models/cache';

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
  const { storageClasses, storageClassesLoaded, selectedStorageClassConfig } =
    useGetStorageClassConfig();

  // Check if NIM Operator integration is enabled
  // When enabled, we create NIMService instead of ServingRuntime + InferenceService
  const { nimServicesEnabled } = useNIMServicesEnabled();

  const [createDataServingRuntime, setCreateDataServingRuntime, resetDataServingRuntime] =
    useCreateServingRuntimeObject(editInfo?.servingRuntimeEditInfo);
  const [createDataInferenceService, setCreateDataInferenceService, resetDataInferenceService] =
    useCreateInferenceServiceObject(
      editInfo?.inferenceServiceEditInfo,
      editInfo?.servingRuntimeEditInfo?.servingRuntime,
      editInfo?.secrets,
    );

  const currentProjectName = projectContext?.currentProject.metadata.name;
  const namespace = currentProjectName || createDataInferenceService.project;

  const { watchDeployment } = useModelDeploymentNotification(
    namespace,
    createDataInferenceService.k8sName,
  );

  const { podSpecOptionsState, validateHardwareProfileForm, applyToResource } =
    useAssignHardwareProfile(editInfo?.inferenceServiceEditInfo, {
      visibleIn: MODEL_SERVING_VISIBILITY,
      paths: getInferenceServiceHardwareProfilePaths(editInfo?.inferenceServiceEditInfo),
    });

  const servingRuntimeParamsEnabled = useIsAreaAvailable(
    SupportedArea.SERVING_RUNTIME_PARAMS,
  ).status;

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
  const { pvcSize, setPvcSize, pvc } = useNIMPVC(
    editInfo?.inferenceServiceEditInfo?.metadata.namespace,
    editInfo?.servingRuntimeEditInfo?.servingRuntime,
  );

  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const [defaultSc] = useDefaultStorageClass();
  const defaultStorageClassName = defaultSc?.metadata.name ?? '';
  const deployedStorageClassName = pvc?.spec.storageClassName || '';
  const [storageClassName, setStorageClassName] = React.useState(
    deployedStorageClassName || defaultStorageClassName,
  );
  const [pvcMode, setPvcMode] = React.useState<PVCMode>('create-new');
  const [existingPvcName, setExistingPvcName] = React.useState<string>('');
  const [modelPath, setModelPath] = React.useState<string>(DEFAULT_MODEL_PATH);
  const [pvcSubPath, setPvcSubPath] = React.useState<string>('');
  const [selectedModelName, setSelectedModelName] = React.useState<string>('');

  // Add useEffect to track selected model from inference service data
  React.useEffect(() => {
    const modelName = createDataInferenceService.format.name || '';
    setSelectedModelName(modelName);
  }, [createDataInferenceService.format]);

  React.useEffect(() => {
    if (pvc?.spec.storageClassName) {
      // If a deployed storage class exists, use it.
      if (storageClassName !== pvc.spec.storageClassName) {
        setStorageClassName(pvc.spec.storageClassName);
      }
    } else if (defaultStorageClassName && storageClassName === '') {
      // Otherwise, if the default storage class is available and state is empty, use it.
      setStorageClassName(defaultStorageClassName);
    }
  }, [pvc, defaultStorageClassName, storageClassName]);

  React.useEffect(() => {
    if (currentProjectName) {
      setCreateDataInferenceService('project', currentProjectName);
    }
  }, [currentProjectName, setCreateDataInferenceService]);

  // Serving Runtime Validation
  const isDisabledServingRuntime =
    namespace === '' || actionInProgress || createDataServingRuntime.imageName === undefined;

  const baseInputValueValid = createDataInferenceService.minReplicas >= 1;

  const isExistingPvcValid =
    pvcMode === 'create-new' || (existingPvcName.trim() !== '' && modelPath.trim() !== '');

  const isDisabledInferenceService =
    actionInProgress ||
    createDataInferenceService.name.trim() === '' ||
    createDataInferenceService.project === '' ||
    !translatedName ||
    !baseInputValueValid ||
    !validateHardwareProfileForm() ||
    !isExistingPvcValid ||
    createDataInferenceService.servingRuntimeEnvVars?.some(
      (envVar) => !envVar.name || !!validateEnvVarName(envVar.name),
    );

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

  // For NIM Operator edit mode, extract image from InferenceService container
  React.useEffect(() => {
    if (
      editInfo?.inferenceServiceEditInfo &&
      isNIMOperatorManaged(editInfo.inferenceServiceEditInfo)
    ) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      const predictor = editInfo.inferenceServiceEditInfo.spec.predictor as any;
      const containerImage = predictor?.containers?.[0]?.image;

      if (containerImage && !createDataServingRuntime.imageName) {
        // Set the image name so validation passes
        setCreateDataServingRuntime('imageName', containerImage);
      }
    }
  }, [editInfo, createDataServingRuntime.imageName, setCreateDataServingRuntime]);

  // Extract and initialize pvcSubPath from existing serving runtime in edit mode
  React.useEffect(() => {
    const { servingRuntime } = editInfo?.servingRuntimeEditInfo || {};
    if (servingRuntime) {
      // Find the volumeMount with mountPath '/mnt/models/cache' and extract its subPath
      const { containers } = servingRuntime.spec;
      for (const container of containers) {
        const volumeMounts = container.volumeMounts || [];
        for (const volumeMount of volumeMounts) {
          if (volumeMount.mountPath === '/mnt/models/cache' && volumeMount.subPath) {
            setPvcSubPath(volumeMount.subPath);
            return; // Found it, exit early
          }
        }
      }
    }
  }, [editInfo]);

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
    podSpecOptionsState.hardwareProfile.resetFormData();
    setPvcMode('create-new');
    setExistingPvcName('');
    setModelPath(DEFAULT_MODEL_PATH);
    setPvcSubPath('');
  };

  const setErrorModal = (e: Error) => {
    setError(e);
    setActionInProgress(false);
  };

  const onSuccess = () => {
    setActionInProgress(false);
    onBeforeClose(true);
  };

  /**
   * Submit handler for NIM Operator mode.
   * Creates or updates NIMService resource - the NIM Operator will automatically create/update InferenceService.
   * No ServingRuntime is needed.
   */
  const submitNIMService = async (nimPVCName: string): Promise<void> => {
    // Check if we're editing an existing NIM Operator deployment
    const isEditingNIMOperator =
      editInfo?.inferenceServiceEditInfo && isNIMOperatorManaged(editInfo.inferenceServiceEditInfo);

    // Extract image info from the serving runtime template
    const imageRepository = createDataServingRuntime.imageName?.split(':')[0] || '';
    const imageTag = createDataServingRuntime.imageName?.split(':')[1] || 'latest';

    // Build NIMService parameters
    const nimServiceParams: CreateNIMServiceParams = {
      name: createDataInferenceService.name,
      k8sName: createDataInferenceService.k8sName,
      namespace,
      imageRepository,
      imageTag,
      imagePullSecrets: [NIM_NGC_SECRET_NAME],
      authSecretName: NIM_SECRET_NAME,
      pvcName: nimPVCName,
      pvcSubPath: pvcSubPath || undefined,
      replicas: createDataInferenceService.minReplicas,
      servicePort: 8000,
      tokenAuth: createDataInferenceService.tokenAuth,
      externalRoute: createDataInferenceService.externalRoute,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      envVars: createDataInferenceService.servingRuntimeEnvVars?.filter(
        (ev) => ev.name && ev.value,
      ) as { name: string; value: string }[] | undefined,
    };

    // Add resources from hardware profile if available
    const { podSpecOptions } = podSpecOptionsState;
    if (podSpecOptions.resources) {
      nimServiceParams.resources = {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        limits: podSpecOptions.resources.limits as Record<string, string>,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        requests: podSpecOptions.resources.requests as Record<string, string>,
      };
    }

    // Add node selector and tolerations if available
    if (podSpecOptions.nodeSelector) {
      nimServiceParams.nodeSelector = podSpecOptions.nodeSelector;
    }
    if (podSpecOptions.tolerations) {
      nimServiceParams.tolerations = podSpecOptions.tolerations;
    }

    if (isEditingNIMOperator) {
      // Edit mode: Update the existing NIMService
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const nimServiceName = getNIMServiceName(editInfo.inferenceServiceEditInfo!);
      if (!nimServiceName) {
        throw new Error('Could not determine NIMService name from InferenceService');
      }

      // Fetch the existing NIMService
      const { getNIMService } = await import('#~/api/k8s/nimServices');
      const existingNIMService = await getNIMService(nimServiceName, namespace);

      // Use the existing updateNIMService function with params
      await updateNIMService(nimServiceParams, existingNIMService, { dryRun: true });
      await updateNIMService(nimServiceParams, existingNIMService, { dryRun: false });
    } else {
      // Create mode: Create new NIMService
      await createNIMService(nimServiceParams, { dryRun: true });
      await createNIMService(nimServiceParams, { dryRun: false });
    }
  };

  /**
   * Submit handler for legacy mode.
   * Creates ServingRuntime + InferenceService directly.
   */
  const submitLegacyMode = async (
    nimPVCName: string,
    servingRuntimeName: string,
  ): Promise<void> => {
    const finalServingRuntime =
      !editInfo && servingRuntimeSelected
        ? updateServingRuntimeTemplate(servingRuntimeSelected, nimPVCName, pvcSubPath || undefined)
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
    );

    const inferenceServiceName = createDataInferenceService.k8sName;
    if (pvcMode === 'use-existing') {
      // For existing PVC, configure storage to use local path instead of remote URI
      setCreateDataInferenceService('storage', {
        type: InferenceServiceStorageType.EXISTING_URI,
        path: modelPath,
        dataConnection: '',
        uri: modelPath,
        awsData: EMPTY_AWS_SECRET_DATA,
      });
    }
    const submitInferenceServiceResource = getSubmitInferenceServiceResourceFn(
      createDataInferenceService,
      editInfo?.inferenceServiceEditInfo,
      editInfo?.servingRuntimeEditInfo?.servingRuntime?.metadata.name || servingRuntimeName,
      editInfo?.inferenceServiceEditInfo?.metadata.name || inferenceServiceName,
      applyToResource,
      allowCreate,
      editInfo?.secrets,
      false,
    );

    // Dry run first
    await Promise.all([
      submitServingRuntimeResources({ dryRun: true }),
      submitInferenceServiceResource({ dryRun: true }),
    ]);

    // Actual submission
    await Promise.all([
      submitServingRuntimeResources({ dryRun: false }),
      submitInferenceServiceResource({ dryRun: false }),
    ]);

    // Handle edit mode - restart the inference service
    if (editInfo?.inferenceServiceEditInfo) {
      await patchInferenceServiceStoppedStatus(editInfo.inferenceServiceEditInfo, 'false');
    }
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    const servingRuntimeName =
      editInfo?.inferenceServiceEditInfo?.spec.predictor.model?.runtime ||
      translateDisplayNameForK8s(createDataInferenceService.name, { safeK8sPrefix: 'nim-' });

    const nimPVCName = pvcMode === 'create-new' ? getUniqueId('nim-pvc') : existingPvcName;

    const submitDeployment = async () => {
      // Create secrets if needed (common to both modes)
      if (!editInfo) {
        if (await isSecretNeeded(namespace, NIM_SECRET_NAME)) {
          await createNIMSecret(namespace, 'apiKeySecret', false, false);
        }
        if (await isSecretNeeded(namespace, NIM_NGC_SECRET_NAME)) {
          await createNIMSecret(namespace, 'nimPullSecret', true, false);
        }
        if (pvcMode === 'create-new') {
          await createNIMPVC(namespace, nimPVCName, pvcSize, false, storageClassName);
        }
      } else if (pvc && pvc.spec.resources.requests.storage !== pvcSize) {
        // Update PVC size if changed
        const updatePvcData = {
          size: pvcSize,
          name: pvc.metadata.name,
          description: pvc.metadata.annotations?.description || '',
          storageClassName: pvc.spec.storageClassName,
        };
        await updatePvc(updatePvcData, pvc, namespace, { dryRun: false }, false, {
          'runtimes.opendatahub.io/force-redeploy': new Date().toISOString(),
        });
      }

      // Choose deployment mode based on feature flag and edit context
      const isEditingNIMOperator =
        editInfo?.inferenceServiceEditInfo &&
        isNIMOperatorManaged(editInfo.inferenceServiceEditInfo);

      if (nimServicesEnabled && !editInfo) {
        // NIM Operator mode - Create: Create NIMService only (no ServingRuntime needed)
        await submitNIMService(nimPVCName);
      } else if (isEditingNIMOperator) {
        // NIM Operator mode - Edit: Update existing NIMService
        await submitNIMService(nimPVCName);
      } else {
        // Legacy mode: Create or update ServingRuntime + InferenceService
        await submitLegacyMode(nimPVCName, servingRuntimeName);
      }
    };

    submitDeployment()
      .then(() => {
        onSuccess();
        watchDeployment();
      })
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
    <Modal variant="medium" isOpen onClose={() => onBeforeClose(false)}>
      <ModalHeader
        title={`${editInfo ? 'Edit' : 'Deploy'} model with NVIDIA NIM`}
        description="Configure properties for deploying your model using an NVIDIA NIM."
      />
      <ModalBody>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Stack hasGutter>
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
              {isStorageClassesAvailable && (
                <StorageClassSelect
                  storageClasses={storageClasses}
                  storageClassesLoaded={storageClassesLoaded}
                  selectedStorageClassConfig={selectedStorageClassConfig}
                  storageClassName={storageClassName}
                  setStorageClassName={setStorageClassName}
                  isRequired
                  disableStorageClassSelect={!!editInfo}
                  showDefaultWhenNoConfig
                />
              )}
            </StackItem>
            <StackItem>
              <NIMPVCSizeSection
                pvcSize={pvcSize}
                setPvcSize={setPvcSize}
                pvcMode={pvcMode}
                setPvcMode={setPvcMode}
                existingPvcName={existingPvcName}
                setExistingPvcName={setExistingPvcName}
                modelPath={modelPath}
                setModelPath={setModelPath}
                pvcSubPath={pvcSubPath}
                setPvcSubPath={setPvcSubPath}
                isEditing={!!editInfo}
                selectedModel={selectedModelName}
                namespace={namespace}
              />
            </StackItem>
            <StackItem>
              <KServeAutoscalerReplicaSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                infoContent="A replica is an independent instance of your model server.
                Multiple replicas improve availability and handle higher traffic loads. 
                Consider network traffic and failover scenarios when specifying the number of model server replicas.
                More replicas enhance fault tolerance but use additional resources."
              />
            </StackItem>
            <DeploymentHardwareProfileSection
              isEditing={!!editInfo}
              projectName={namespace}
              servingRuntimeSelected={servingRuntimeSelected}
              podSpecOptionState={podSpecOptionsState}
            />
            <AuthServingRuntimeSection
              data={createDataInferenceService}
              setData={setCreateDataInferenceService}
              allowCreate={allowCreate}
            />
            {servingRuntimeParamsEnabled && (
              <EnvironmentVariablesSection
                predefinedVars={getKServeContainerEnvVarStrs(servingRuntimeSelected)}
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
              />
            )}
          </Stack>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={editInfo ? 'Redeploy' : 'Deploy'}
          onSubmit={submit}
          onCancel={() => onBeforeClose(false)}
          isSubmitDisabled={isDisabledServingRuntime || isDisabledInferenceService}
          error={error}
          alertTitle="Error creating model server"
        />
      </ModalFooter>
    </Modal>
  );
};

export default ManageNIMServingModal;
