import * as React from 'react';
import { Alert, AlertActionCloseButton, Form, FormSection, Modal } from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  getCreateInferenceServiceLabels,
  getSubmitInferenceServiceResourceFn,
  getSubmitServingRuntimeResourcesFn,
  isConnectionPathValid,
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
import useServingAcceleratorProfileFormState from '~/pages/modelServing/screens/projects/useServingAcceleratorProfileFormState';
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
import InferenceServiceFrameworkSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/InferenceServiceFrameworkSection';
import DataConnectionSection from '~/pages/modelServing/screens/projects/InferenceServiceModal/DataConnectionSection';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import AuthServingRuntimeSection from '~/pages/modelServing/screens/projects/ServingRuntimeModal/AuthServingRuntimeSection';
import { useAccessReview } from '~/api';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { RegisteredModelDeployInfo } from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployInfo';
import usePrefillDeployModalFromModelRegistry from '~/pages/modelRegistry/screens/RegisteredModels/usePrefillDeployModalFromModelRegistry';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '~/concepts/analyticsTracking/trackingProperties';
import useConnectionTypesEnabled from '~/concepts/connectionTypes/useConnectionTypesEnabled';
import { Connection } from '~/concepts/connectionTypes/types';
import { ConnectionSection } from '~/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionSection';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import KServeAutoscalerReplicaSection from './KServeAutoscalerReplicaSection';
import EnvironmentVariablesSection from './EnvironmentVariablesSection';
import ServingRuntimeArgsSection from './ServingRuntimeArgsSection';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

type ManageKServeModalProps = {
  onClose: (submit: boolean) => void;
  servingRuntimeTemplates?: TemplateKind[];
  registeredModelDeployInfo?: RegisteredModelDeployInfo;
  shouldFormHidden?: boolean;
  projectSection?: React.ReactNode;
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
  onClose,
  servingRuntimeTemplates,
  projectContext,
  editInfo,
  projectSection,
  registeredModelDeployInfo,
  shouldFormHidden: hideForm,
}) => {
  const [createDataServingRuntime, setCreateDataServingRuntime, , sizes] =
    useCreateServingRuntimeObject(editInfo?.servingRuntimeEditInfo);
  const [createDataInferenceService, setCreateDataInferenceService] =
    useCreateInferenceServiceObject(
      editInfo?.inferenceServiceEditInfo,
      editInfo?.servingRuntimeEditInfo?.servingRuntime,
      editInfo?.secrets,
    );
  const { data: kServeNameDesc, onDataChange: setKserveNameDesc } = useK8sNameDescriptionFieldData({
    initialData: editInfo?.inferenceServiceEditInfo,
  });
  const [dataConnections, dataConnectionsLoaded, dataConnectionsLoadError] =
    usePrefillDeployModalFromModelRegistry(
      projectContext,
      createDataInferenceService,
      setCreateDataInferenceService,
      registeredModelDeployInfo,
    );

  const isConnectionTypesEnabled = useConnectionTypesEnabled();
  const [connection, setConnection] = React.useState<Connection>();
  const [isConnectionValid, setIsConnectionValid] = React.useState(false);

  const isAuthorinoEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_AUTH).status;
  const currentProjectName = projectContext?.currentProject.metadata.name;
  const namespace = currentProjectName || createDataInferenceService.project;

  const {
    initialState: initialAcceleratorProfileState,
    formData: selectedAcceleratorProfile,
    setFormData: setSelectedAcceleratorProfile,
  } = useServingAcceleratorProfileFormState(
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
  const servingRuntimeParamsEnabled = useIsAreaAvailable(
    SupportedArea.SERVING_RUNTIME_PARAMS,
  ).status;

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

  // Serving Runtime Validation
  const isDisabledServingRuntime = namespace === '' || actionInProgress;

  // Inference Service Validation
  const storageCanCreate = (): boolean => {
    if (createDataInferenceService.storage.type === InferenceServiceStorageType.EXISTING_URI) {
      return !!createDataInferenceService.storage.uri;
    }
    if (createDataInferenceService.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
      if (isConnectionTypesEnabled) {
        return isConnectionValid;
      }
      return (
        createDataInferenceService.storage.dataConnection !== '' &&
        isConnectionPathValid(createDataInferenceService.storage.path)
      );
    }
    // NEW_STORAGE
    if (isConnectionTypesEnabled) {
      return isConnectionValid;
    }
    return (
      isAWSValid(createDataInferenceService.storage.awsData, [AwsKeys.AWS_S3_BUCKET]) &&
      isConnectionPathValid(createDataInferenceService.storage.path)
    );
  };

  const baseInputValueValid =
    createDataInferenceService.maxReplicas >= 0 &&
    resourcesArePositive(createDataInferenceService.modelSize.resources) &&
    requestsUnderLimits(createDataInferenceService.modelSize.resources);

  const isDisabledInferenceService =
    actionInProgress ||
    !isK8sNameDescriptionDataValid(kServeNameDesc) ||
    createDataInferenceService.project === '' ||
    createDataInferenceService.format.name === '' ||
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
      initialAcceleratorProfileState,
      selectedAcceleratorProfile,
      NamespaceApplicationCase.KSERVE_PROMOTION,
      projectContext?.currentProject,
      servingRuntimeName,
      false,
    );

    const inferenceServiceName = servingRuntimeName;

    const submitInferenceServiceResource = getSubmitInferenceServiceResourceFn(
      {
        ...createDataInferenceService,
        ...getCreateInferenceServiceLabels(registeredModelDeployInfo),
      },
      editInfo?.inferenceServiceEditInfo,
      servingRuntimeName,
      inferenceServiceName,
      false,
      initialAcceleratorProfileState,
      selectedAcceleratorProfile,
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
      })
      .catch((e) => {
        props.success = false;
        props.errorMessage = e;
        setErrorModal(e);
        fireFormTrackingEvent(editInfo ? 'Model Updated' : 'Model Deployed', props);
      });
  };

  return (
    <Modal
      title={editInfo ? 'Edit model' : 'Deploy model'}
      description="Configure properties for deploying your model"
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
      {!isAuthorinoEnabled && alertVisible && (
        <Alert
          id="no-authorino-installed-alert"
          className="pf-v5-u-mb-md"
          data-testid="no-authorino-installed-alert"
          isExpandable
          isInline
          variant="warning"
          title="Token authentication service not installed"
          actionClose={<AlertActionCloseButton onClose={() => setAlertVisible(false)} />}
        >
          <p>
            The single model serving platform used by this project allows deployed models to be
            accessible via external routes. It is recommended that token authentication be enabled
            to protect these routes. The serving platform requires the Authorino operator be
            installed on the cluster for token authentication. Contact a cluster administrator to
            install the operator.
          </p>
        </Alert>
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
          {!hideForm && (
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
                isEditing={!!editInfo}
                selectedAcceleratorProfile={selectedAcceleratorProfile}
                resetModelFormat={() => setCreateDataInferenceService('format', { name: '' })}
              />
              <InferenceServiceFrameworkSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                servingRuntimeName={servingRuntimeSelected?.metadata.name}
                modelContext={servingRuntimeSelected?.spec.supportedModelFormats}
                registeredModelFormat={registeredModelDeployInfo?.modelFormat}
              />
              <KServeAutoscalerReplicaSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                infoContent="Consider network traffic and failover scenarios when specifying the number of model
                server replicas."
              />
              <ServingRuntimeSizeSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                sizes={sizes}
                servingRuntimeSelected={servingRuntimeSelected}
                acceleratorProfileState={initialAcceleratorProfileState}
                selectedAcceleratorProfile={selectedAcceleratorProfile}
                setSelectedAcceleratorProfile={setSelectedAcceleratorProfile}
                infoContent="Select a server size that will accommodate your largest model. See the product documentation for more information."
              />
              {isAuthorinoEnabled && (
                <AuthServingRuntimeSection
                  data={createDataInferenceService}
                  setData={setCreateDataInferenceService}
                  allowCreate={allowCreate}
                  publicRoute
                />
              )}
            </>
          )}
        </FormSection>
        {!hideForm && (
          <FormSection title="Source model location" id="model-location">
            {isConnectionTypesEnabled ? (
              <ConnectionSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                setConnection={setConnection}
                setIsConnectionValid={setIsConnectionValid}
              />
            ) : (
              <DataConnectionSection
                data={createDataInferenceService}
                setData={setCreateDataInferenceService}
                loaded={!!projectContext?.dataConnections || dataConnectionsLoaded}
                loadError={dataConnectionsLoadError}
                dataConnections={dataConnections}
              />
            )}
          </FormSection>
        )}
        {servingRuntimeParamsEnabled && (
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
    </Modal>
  );
};

export default ManageKServeModal;
