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
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
  ServingRuntimeKind,
} from '#~/k8sTypes';
import { EMPTY_AWS_SECRET_DATA } from '#~/pages/projects/dataConnections/const';
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
import { getSecret, updatePvc, useAccessReview, patchInferenceServiceStoppedStatus } from '#~/api';
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
  INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
  MODEL_SERVING_VISIBILITY,
} from '#~/concepts/hardwareProfiles/const';
import { useNIMAccountConfig } from '#~/pages/modelServing/screens/projects/nim/useNIMAccountConfig';

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

  // Read NIM account configuration for air-gapped registry support
  const accountConfig = useNIMAccountConfig();

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
      paths: INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
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

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    const servingRuntimeName =
      editInfo?.inferenceServiceEditInfo?.spec.predictor.model?.runtime ||
      translateDisplayNameForK8s(createDataInferenceService.name, { safeK8sPrefix: 'nim-' });

    const nimPVCName = pvcMode === 'create-new' ? getUniqueId('nim-pvc') : existingPvcName;

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
      accountConfig.imagePullSecret, // Pass imagePullSecret from air-gapped config
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
          // Detect air-gapped mode: if custom registry or imagePullSecret is configured
          const isAirGapped = !!(accountConfig.registry || accountConfig.imagePullSecret);

          // Create NGC secrets (with dummy values in air-gapped mode)
          if (await isSecretNeeded(namespace, NIM_SECRET_NAME)) {
            promises.push(createNIMSecret(namespace, 'apiKeySecret', false, false, isAirGapped));
          }
          if (await isSecretNeeded(namespace, NIM_NGC_SECRET_NAME)) {
            promises.push(createNIMSecret(namespace, 'nimPullSecret', true, false, isAirGapped));
          }
          if (pvcMode === 'create-new') {
            promises.push(createNIMPVC(namespace, nimPVCName, pvcSize, false, storageClassName));
          }
        } else if (pvc && pvc.spec.resources.requests.storage !== pvcSize) {
          const updatePvcData = {
            size: pvcSize, // New size
            name: pvc.metadata.name,
            description: pvc.metadata.annotations?.description || '',
            storageClassName: pvc.spec.storageClassName,
          };
          promises.push(
            updatePvc(updatePvcData, pvc, namespace, { dryRun: false }, false, {
              'runtimes.opendatahub.io/force-redeploy': new Date().toISOString(),
            }),
          );
        }
        return Promise.all(promises);
      })
      .then(async () => {
        if (editInfo?.inferenceServiceEditInfo) {
          await patchInferenceServiceStoppedStatus(editInfo.inferenceServiceEditInfo, 'false');
        }
      })
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
