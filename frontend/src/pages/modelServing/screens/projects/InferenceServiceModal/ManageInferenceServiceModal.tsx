import * as React from 'react';
import {
  Form,
  FormSection,
  HelperTextItem,
  Spinner,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  getCreateInferenceServiceLabels,
  submitInferenceServiceResourceWithDryRun,
  useCreateInferenceServiceObject,
} from '#~/pages/modelServing/screens/projects/utils';
import { InferenceServiceKind, ProjectKind, ServingRuntimeKind } from '#~/k8sTypes';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { InferenceServiceStorageType } from '#~/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { Connection } from '#~/concepts/connectionTypes/types';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import usePrefillModelDeployModal, {
  ModelDeployPrefillInfo,
} from '#~/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '#~/concepts/connectionTypes/utils';
import { useModelDeploymentNotification } from '#~/pages/modelServing/screens/projects/useModelDeploymentNotification';
import ProjectSection from './ProjectSection';
import InferenceServiceFrameworkSection from './InferenceServiceFrameworkSection';
import InferenceServiceServingRuntimeSection from './InferenceServiceServingRuntimeSection';
import { ConnectionSection } from './ConnectionSection';

type ManageInferenceServiceModalProps = {
  onClose: (submit: boolean) => void;
  modelDeployPrefillInfo?: ModelDeployPrefillInfo;
  shouldFormHidden?: boolean;
  projectSection?: React.ReactNode;
} & EitherOrNone<
  { editInfo?: InferenceServiceKind },
  {
    projectContext?: {
      currentProject: ProjectKind;
      currentServingRuntime?: ServingRuntimeKind;
      connections: Connection[];
    };
  }
>;

const ManageInferenceServiceModal: React.FC<ManageInferenceServiceModalProps> = ({
  onClose,
  editInfo,
  projectContext,
  projectSection,
  modelDeployPrefillInfo,
  shouldFormHidden,
}) => {
  const [createData, setCreateData] = useCreateInferenceServiceObject(editInfo);
  const { data: inferenceServiceNameDesc, onDataChange: setInferenceServiceNameDesc } =
    useK8sNameDescriptionFieldData({ initialData: editInfo });
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const { watchDeployment } = useModelDeploymentNotification(
    createData.project,
    createData.k8sName,
    false,
  );

  const currentProjectName = projectContext?.currentProject.metadata.name || '';
  const currentServingRuntimeName = projectContext?.currentServingRuntime?.metadata.name || '';

  const {
    initialNewConnectionType,
    initialNewConnectionValues,
    connections,
    connectionsLoaded,
    connectionsLoadError,
  } = usePrefillModelDeployModal(projectContext, createData, setCreateData, modelDeployPrefillInfo);

  const isDataReady =
    !modelDeployPrefillInfo ||
    (!!inferenceServiceNameDesc.name && (!projectContext || connectionsLoaded));
  const isLoading = !isDataReady;

  const modelMeshConnections = React.useMemo(
    () =>
      connections.filter(
        (c) => !isModelServingCompatible(c.connection, ModelServingCompatibleTypes.OCI),
      ),
    [connections],
  );

  const [connection, setConnection] = React.useState<Connection>();
  const [isConnectionValid, setIsConnectionValid] = React.useState(false);

  const hasEditInfo = !!editInfo;
  React.useEffect(() => {
    if (!hasEditInfo) {
      setCreateData('project', currentProjectName);
      setCreateData('servingRuntimeName', currentServingRuntimeName);
    }
  }, [setCreateData, currentProjectName, currentServingRuntimeName, hasEditInfo]);

  React.useEffect(() => {
    setCreateData('name', inferenceServiceNameDesc.name);
    setCreateData('k8sName', inferenceServiceNameDesc.k8sName.value);
  }, [inferenceServiceNameDesc, setCreateData]);

  const storageCanCreate = (): boolean => {
    if (createData.storage.type === InferenceServiceStorageType.EXISTING_URI) {
      return !!createData.storage.uri;
    }
    return isConnectionValid;
  };

  React.useEffect(() => {
    if (createData.name) {
      setInferenceServiceNameDesc('name', createData.name);
    }
  }, [createData.name, setInferenceServiceNameDesc]);

  const isDisabled =
    actionInProgress ||
    !isK8sNameDescriptionDataValid(inferenceServiceNameDesc) ||
    createData.project === '' ||
    createData.format.name === '' ||
    createData.servingRuntimeName === '' ||
    !storageCanCreate();

  const onSuccess = () => {
    onClose(true);
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
        ...getCreateInferenceServiceLabels(modelDeployPrefillInfo),
      },
      editInfo,
      createData.servingRuntimeName,
      createData.k8sName,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      connection,
    )
      .then(() => {
        onSuccess();
        watchDeployment();
      })
      .catch((e) => {
        setActionInProgress(false);
        setErrorModal(e);
      });
  };

  return (
    <Modal variant="medium" isOpen onClose={() => onClose(false)}>
      <ModalHeader
        title={editInfo ? 'Edit model' : 'Deploy model'}
        description="Configure properties for deploying your model"
      />
      <ModalBody>
        <Form>
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
          {!shouldFormHidden && isLoading && <Spinner />}
          {!shouldFormHidden && !isLoading && (
            <>
              <K8sNameDescriptionField
                data={inferenceServiceNameDesc}
                onDataChange={setInferenceServiceNameDesc}
                dataTestId="inference-service"
                nameLabel="Model deployment name"
                nameHelperText={
                  <HelperTextItem>
                    This is the name of the inference service created when the model is deployed.
                  </HelperTextItem>
                }
                hideDescription
              />
              <InferenceServiceServingRuntimeSection
                data={createData}
                setData={setCreateData}
                currentServingRuntime={projectContext?.currentServingRuntime}
              />
              <InferenceServiceFrameworkSection
                data={createData}
                setData={setCreateData}
                servingRuntimeName={projectContext?.currentServingRuntime?.metadata.name}
                modelContext={projectContext?.currentServingRuntime?.spec.supportedModelFormats}
                registeredModelFormat={modelDeployPrefillInfo?.modelFormat}
              />
              <FormSection title="Source model location" id="model-location">
                <ConnectionSection
                  existingUriOption={editInfo?.spec.predictor.model?.storageUri}
                  data={createData}
                  setData={setCreateData}
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
                  connections={modelMeshConnections}
                  connectionTypeFilter={(ct) =>
                    !isModelServingCompatible(ct, ModelServingCompatibleTypes.OCI)
                  }
                />
              </FormSection>
            </>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={editInfo ? 'Redeploy' : 'Deploy'}
          onSubmit={submit}
          onCancel={() => onClose(false)}
          isSubmitDisabled={isDisabled}
          error={error}
          alertTitle="Error creating model server"
        />
      </ModalFooter>
    </Modal>
  );
};

export default ManageInferenceServiceModal;
