import * as React from 'react';
import {
  Form,
  FormSection,
  Spinner,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  getCreateInferenceServiceLabels,
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
import {
  getKServeContainerArgs,
  getKServeContainerEnvVarStrs,
  requestsUnderLimits,
  resourcesArePositive,
} from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getServingRuntimeFromName } from '~/pages/modelServing/customServingRuntimes/utils';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import {
  InferenceServiceStorageType,
  ServingRuntimeEditInfo,
} from '~/pages/modelServing/screens/types';
import ServingRuntimeSizeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeSizeSection';
import ServingRuntimeTemplateSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ServingRuntimeTemplateSection';
import ProjectSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSection';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import InferenceServiceFrameworkSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/InferenceServiceFrameworkSection';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import AuthServingRuntimeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/AuthServingRuntimeSection';
import { useAccessReview, useTemplates } from '~/api';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '~/concepts/analyticsTracking/trackingProperties';
import { Connection } from '~/concepts/connectionTypes/types';
import { ConnectionSection } from '~/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionSection';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import { useProfileIdentifiers } from '~/concepts/hardwareProfiles/utils';
import { useModelServingPodSpecOptionsState } from '~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { validateEnvVarName } from '~/concepts/connectionTypes/utils';
import usePrefillModelDeployModal, {
  ModelDeployPrefillInfo,
} from '~/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import { useKServeDeploymentMode } from '~/pages/modelServing/useKServeDeploymentMode';
import { SERVING_RUNTIME_SCOPE } from '~/pages/modelServing/screens/const';
import { useModelDeploymentNotification } from '~/pages/modelServing/screens/projects/useModelDeploymentNotification';
import KServeAutoscalerReplicaSection from './KServeAutoscalerReplicaSection';
import EnvironmentVariablesSection from './EnvironmentVariablesSection';
import ServingRuntimeArgsSection from './ServingRuntimeArgsSection';
import { KServeDeploymentModeDropdown } from './KServeDeploymentModeDropdown';
import { NoAuthAlert } from './NoAuthAlert';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

type ManageKServeModalProps = {
  onClose: (submit: boolean) => void;
  servingRuntimeTemplates?: TemplateKind[];
  modelDeployPrefillInfo?: ModelDeployPrefillInfo;
  shouldFormHidden?: boolean;
  projectSection?: React.ReactNode;
  existingUriOption?: string;
} & EitherOrNone<
  {
    projectContext?: {
      currentProject: ProjectKind;
      connections: Connection[];
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
  onClose,
  servingRuntimeTemplates,
  projectContext,
  editInfo,
  projectSection,
  modelDeployPrefillInfo,
  shouldFormHidden: hideForm,
  existingUriOption,
}) => {
  const { isRawAvailable, isServerlessAvailable } = useKServeDeploymentMode();

  const [createDataServingRuntime, setCreateDataServingRuntime] = useCreateServingRuntimeObject(
    editInfo?.servingRuntimeEditInfo,
  );
  const [createDataInferenceService, setCreateDataInferenceService] =
    useCreateInferenceServiceObject(
      editInfo?.inferenceServiceEditInfo,
      editInfo?.servingRuntimeEditInfo?.servingRuntime,
      editInfo?.secrets,
    );
  const podSpecOptionsState = useModelServingPodSpecOptionsState(
    editInfo?.servingRuntimeEditInfo?.servingRuntime,
    editInfo?.inferenceServiceEditInfo,
  );
  const { data: kServeNameDesc, onDataChange: setKserveNameDesc } = useK8sNameDescriptionFieldData({
    initialData: editInfo?.inferenceServiceEditInfo,
  });

  const [connection, setConnection] = React.useState<Connection>();
  const [isConnectionValid, setIsConnectionValid] = React.useState(false);

  const isAuthAvailable =
    useIsAreaAvailable(SupportedArea.K_SERVE_AUTH).status ||
    createDataInferenceService.isKServeRawDeployment;
  const currentProjectName = projectContext?.currentProject.metadata.name;
  const namespace = currentProjectName || createDataInferenceService.project;

  const projectTemplates = useTemplates(namespace);

  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();
  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace,
  });

  const profileIdentifiers = useProfileIdentifiers(
    podSpecOptionsState.acceleratorProfile.formData.profile,
    podSpecOptionsState.hardwareProfile.formData.selectedProfile,
  );

  const {
    initialNewConnectionType,
    initialNewConnectionValues,
    connections,
    connectionsLoaded,
    connectionsLoadError,
  } = usePrefillModelDeployModal(
    projectContext,
    createDataInferenceService,
    setCreateDataInferenceService,
    modelDeployPrefillInfo,
  );

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [alertVisible, setAlertVisible] = React.useState(true);
  const servingRuntimeParamsEnabled = useIsAreaAvailable(
    SupportedArea.SERVING_RUNTIME_PARAMS,
  ).status;

  const { watchDeployment } = useModelDeploymentNotification(
    namespace,
    createDataInferenceService.k8sName,
    true,
  );

  React.useEffect(() => {
    if (currentProjectName) {
      setCreateDataInferenceService('project', currentProjectName);
    }
  }, [currentProjectName, setCreateDataInferenceService]);

  React.useEffect(() => {
    setCreateDataInferenceService('name', kServeNameDesc.name);
    setCreateDataInferenceService('k8sName', kServeNameDesc.k8sName.value);
  }, [kServeNameDesc, setCreateDataInferenceService]);

  React.useEffect(() => {
    if (
      createDataInferenceService.name &&
      createDataInferenceService.name !== kServeNameDesc.name
    ) {
      setKserveNameDesc('name', createDataInferenceService.name);
    }
    // Don't update if kServeNameDesc changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createDataInferenceService.name, setKserveNameDesc]);

  const isDataReady =
    !modelDeployPrefillInfo ||
    (!!kServeNameDesc.name &&
      Array.isArray(servingRuntimeTemplates) &&
      servingRuntimeTemplates.length > 0 &&
      (!projectContext || connectionsLoaded) &&
      (podSpecOptionsState.acceleratorProfile.loaded ||
        podSpecOptionsState.hardwareProfile.profilesLoaded));

  const isLoading = !isDataReady;

  // Serving Runtime Validation
  const isDisabledServingRuntime = namespace === '' || actionInProgress;

  // Inference Service Validation
  const storageCanCreate = (): boolean => {
    if (createDataInferenceService.storage.type === InferenceServiceStorageType.EXISTING_URI) {
      return !!createDataInferenceService.storage.uri;
    }
    return isConnectionValid;
  };

  const baseInputValueValid =
    createDataInferenceService.maxReplicas >= 0 &&
    podSpecOptionsState.podSpecOptions.resources &&
    resourcesArePositive(podSpecOptionsState.podSpecOptions.resources) &&
    requestsUnderLimits(podSpecOptionsState.podSpecOptions.resources);

  const isDisabledInferenceService = () =>
    !isK8sNameDescriptionDataValid(kServeNameDesc) ||
    createDataInferenceService.project === '' ||
    createDataInferenceService.format.name === '' ||
    !storageCanCreate() ||
    !baseInputValueValid ||
    createDataInferenceService.servingRuntimeEnvVars?.some(
      (envVar) => !envVar.name || !!validateEnvVarName(envVar.name),
    ) ||
    !podSpecOptionsState.hardwareProfile.isFormDataValid;

  const servingRuntimeSelected = React.useMemo(() => {
    const templates =
      createDataServingRuntime.scope === SERVING_RUNTIME_SCOPE.Project
        ? projectTemplates[0]
        : servingRuntimeTemplates;
    return (
      editInfo?.servingRuntimeEditInfo?.servingRuntime ||
      getServingRuntimeFromName(createDataServingRuntime.servingRuntimeTemplateName, templates)
    );
  }, [
    createDataServingRuntime.scope,
    createDataServingRuntime.servingRuntimeTemplateName,
    editInfo?.servingRuntimeEditInfo?.servingRuntime,
    projectTemplates,
    servingRuntimeTemplates,
  ]);

  const servingRuntimeArgsInputRef = React.useRef<HTMLTextAreaElement>(null);

  const onBeforeClose = (submitted: boolean) => {
    fireFormTrackingEvent(editInfo ? 'Model Updated' : 'Model Deployed', {
      outcome: TrackingOutcome.cancel,
    });
    onClose(submitted);
  };

  const setErrorModal = (e: Error) => {
    setError(e);
    setActionInProgress(false);
  };

  const onSuccess = (tProps: FormTrackingEventProperties) => {
    setActionInProgress(false);
    onBeforeClose(true);
    fireFormTrackingEvent(editInfo ? 'Model Updated' : 'Model Deployed', tProps);
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    const servingRuntimeName =
      editInfo?.inferenceServiceEditInfo?.spec.predictor.model?.runtime ||
      createDataInferenceService.k8sName;

    const submitServingRuntimeResources = getSubmitServingRuntimeResourcesFn(
      servingRuntimeSelected,
      createDataServingRuntime,
      customServingRuntimesEnabled,
      namespace,
      editInfo?.servingRuntimeEditInfo,
      false,
      podSpecOptionsState.podSpecOptions,
      NamespaceApplicationCase.KSERVE_PROMOTION,
      projectContext?.currentProject,
      servingRuntimeName,
      false,
    );

    const inferenceServiceName = servingRuntimeName;

    const submitInferenceServiceResource = getSubmitInferenceServiceResourceFn(
      {
        ...createDataInferenceService,
        ...getCreateInferenceServiceLabels(modelDeployPrefillInfo),
      },
      editInfo?.inferenceServiceEditInfo,
      servingRuntimeName,
      inferenceServiceName,
      false,
      podSpecOptionsState.podSpecOptions,
      allowCreate,
      editInfo?.secrets,
      undefined,
      connection,
    );

    const props: FormTrackingEventProperties = {
      outcome: TrackingOutcome.submit,
      type: 'single',
      runtime: servingRuntimeName,
      isCustomRuntime: customServingRuntimesEnabled,
      servingRuntimeName: createDataServingRuntime.servingRuntimeTemplateName,
      servingRuntimeFormat: createDataInferenceService.format.name,
      numReplicas: createDataServingRuntime.servingRuntimeTemplateName,
    };
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
      .then(() => {
        props.success = true;
        fireFormTrackingEvent(editInfo ? 'Model Updated' : 'Model Deployed', props);
        onSuccess(props);
        watchDeployment();
      })
      .catch((e) => {
        props.success = false;
        props.errorMessage = e;
        setErrorModal(e);
        fireFormTrackingEvent(editInfo ? 'Model Updated' : 'Model Deployed', props);
      });
  };

  return (
    <Modal variant="medium" isOpen onClose={() => onBeforeClose(false)}>
      <ModalHeader
        title={editInfo ? 'Edit model' : 'Deploy model'}
        description="Configure properties for deploying your model"
      />
      <ModalBody>
        {!isAuthAvailable && alertVisible && !isRawAvailable && (
          <NoAuthAlert onClose={() => setAlertVisible(false)} />
        )}
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormSection title="Model deployment">
            {projectSection || (
              <ProjectSection
                projectName={
                  (projectContext?.currentProject &&
                    getDisplayNameFromK8sResource(projectContext.currentProject)) ||
                  editInfo?.inferenceServiceEditInfo?.metadata.namespace ||
                  ''
                }
              />
            )}
            {!hideForm && isLoading && <Spinner data-testid="spinner" />}
            {!hideForm && !isLoading && (
              <>
                <K8sNameDescriptionField
                  data={kServeNameDesc}
                  onDataChange={setKserveNameDesc}
                  dataTestId="inference-service"
                  nameLabel="Model deployment name"
                  nameHelperText="This is the name of the inference service created when the model is deployed"
                  hideDescription
                />
                <ServingRuntimeTemplateSection
                  data={createDataServingRuntime}
                  onConfigureParamsClick={
                    servingRuntimeParamsEnabled
                      ? () =>
                          requestAnimationFrame(() => {
                            servingRuntimeArgsInputRef.current?.focus();
                          })
                      : undefined
                  }
                  setData={setCreateDataServingRuntime}
                  templates={servingRuntimeTemplates || []}
                  projectSpecificTemplates={projectTemplates}
                  isEditing={!!editInfo}
                  compatibleIdentifiers={profileIdentifiers}
                  resetModelFormat={() => setCreateDataInferenceService('format', { name: '' })}
                />
                <InferenceServiceFrameworkSection
                  data={createDataInferenceService}
                  setData={setCreateDataInferenceService}
                  servingRuntimeName={servingRuntimeSelected?.metadata.name}
                  modelContext={servingRuntimeSelected?.spec.supportedModelFormats}
                  registeredModelFormat={modelDeployPrefillInfo?.modelFormat}
                />
                {isRawAvailable && isServerlessAvailable && (
                  <KServeDeploymentModeDropdown
                    isRaw={!!createDataInferenceService.isKServeRawDeployment}
                    setIsRaw={(isRaw) => {
                      setCreateDataInferenceService('isKServeRawDeployment', isRaw);
                      if (isRaw) {
                        setCreateDataInferenceService(
                          'maxReplicas',
                          createDataInferenceService.minReplicas,
                        );
                      }
                    }}
                    isDisabled={!!editInfo}
                  />
                )}
                {!isAuthAvailable && alertVisible && isRawAvailable && (
                  <NoAuthAlert onClose={() => setAlertVisible(false)} />
                )}
                <KServeAutoscalerReplicaSection
                  data={createDataInferenceService}
                  setData={setCreateDataInferenceService}
                  infoContent="Consider network traffic and failover scenarios when specifying the number of model
                server replicas."
                />
                <ServingRuntimeSizeSection
                  podSpecOptionState={podSpecOptionsState}
                  projectName={namespace}
                  servingRuntimeSelected={servingRuntimeSelected}
                  infoContent="Select a server size that will accommodate your largest model. See the product documentation for more information."
                  isEditing={!!editInfo}
                />
                <AuthServingRuntimeSection
                  data={createDataInferenceService}
                  setData={setCreateDataInferenceService}
                  allowCreate={allowCreate}
                  publicRoute
                  showModelRoute={isAuthAvailable}
                />
              </>
            )}
          </FormSection>
          {!hideForm && !isLoading && (
            <FormSection title="Source model location" id="model-location">
              <ConnectionSection
                existingUriOption={
                  existingUriOption ||
                  editInfo?.inferenceServiceEditInfo?.spec.predictor.model?.storageUri
                }
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                initialNewConnectionType={initialNewConnectionType}
                initialNewConnectionValues={initialNewConnectionValues}
                loaded={
                  modelDeployPrefillInfo
                    ? !!projectContext?.connections && connectionsLoaded
                    : !!projectContext?.connections || connectionsLoaded
                }
                loadError={connectionsLoadError}
                connection={connection}
                setConnection={setConnection}
                setIsConnectionValid={setIsConnectionValid}
                connections={connections}
              />
            </FormSection>
          )}
          {servingRuntimeParamsEnabled && !isLoading && (
            <FormSection
              title="Configuration parameters"
              id="configuration-params"
              data-testid="configuration-params"
            >
              <ServingRuntimeArgsSection
                predefinedArgs={getKServeContainerArgs(servingRuntimeSelected)}
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                inputRef={servingRuntimeArgsInputRef}
              />
              <EnvironmentVariablesSection
                predefinedVars={getKServeContainerEnvVarStrs(servingRuntimeSelected)}
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
              />
            </FormSection>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={editInfo ? 'Redeploy' : 'Deploy'}
          onSubmit={submit}
          onCancel={() => onBeforeClose(false)}
          isSubmitDisabled={isDisabledServingRuntime || isDisabledInferenceService()}
          error={error}
          alertTitle="Error creating model server"
        />
      </ModalFooter>
    </Modal>
  );
};

export default ManageKServeModal;
