import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormSection,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ImageStreamAndVersion } from '~/types';
import GenericSidebar from '~/components/GenericSidebar';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NotebookKind } from '~/k8sTypes';
import useNotebookImageData from '~/pages/projects/screens/detail/notebooks/useNotebookImageData';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { LimitNameResourceType } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import useConnectionTypesEnabled from '~/concepts/connectionTypes/useConnectionTypesEnabled';
import { Connection } from '~/concepts/connectionTypes/types';
import useNotebookAcceleratorProfileFormState from '~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfileFormState';
import { SpawnerPageSectionID } from './types';
import { ScrollableSelectorID, SpawnerPageSectionTitles } from './const';
import SpawnerFooter from './SpawnerFooter';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import StorageField from './storage/StorageField';
import EnvironmentVariables from './environmentVariables/EnvironmentVariables';
import { useStorageDataObject } from './storage/utils';
import { getCompatibleAcceleratorIdentifiers, useMergeDefaultPVCName } from './spawnerUtils';
import { useNotebookEnvVariables } from './environmentVariables/useNotebookEnvVariables';
import DataConnectionField from './dataConnection/DataConnectionField';
import { useNotebookDataConnection } from './dataConnection/useNotebookDataConnection';
import { useNotebookSizeState } from './useNotebookSizeState';
import useDefaultStorageClass from './storage/useDefaultStorageClass';
import usePreferredStorageClass from './storage/usePreferredStorageClass';
import { ConnectionsFormSection } from './connections/ConnectionsFormSection';
import { getConnectionsFromNotebook } from './connections/utils';
import AlertWarningText from './environmentVariables/AlertWarningText';

type SpawnerPageProps = {
  existingNotebook?: NotebookKind;
};

const SpawnerPage: React.FC<SpawnerPageProps> = ({ existingNotebook }) => {
  const {
    currentProject,
    dataConnections,
    connections: { data: projectConnections, refresh: refreshProjectConnections },
  } = React.useContext(ProjectDetailsContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);

  const k8sNameDescriptionData = useK8sNameDescriptionFieldData({
    initialData: existingNotebook,
    limitNameResourceType: LimitNameResourceType.WORKBENCH,
    safePrefix: 'wb-',
  });
  const [selectedImage, setSelectedImage] = React.useState<ImageStreamAndVersion>({
    imageStream: undefined,
    imageVersion: undefined,
  });
  const { selectedSize, setSelectedSize, sizes } = useNotebookSizeState(existingNotebook);
  const [supportedAcceleratorProfiles, setSupportedAcceleratorProfiles] = React.useState<
    string[] | undefined
  >();
  const [storageDataWithoutDefault, setStorageData] = useStorageDataObject(existingNotebook);

  const [defaultStorageClass] = useDefaultStorageClass();
  const preferredStorageClass = usePreferredStorageClass();
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const defaultStorageClassName = isStorageClassesAvailable
    ? defaultStorageClass?.metadata.name
    : preferredStorageClass?.metadata.name;
  const storageData = useMergeDefaultPVCName(
    storageDataWithoutDefault,
    k8sNameDescriptionData.data.name,
    defaultStorageClassName,
  );

  const [dataConnectionData, setDataConnectionData] = useNotebookDataConnection(
    dataConnections.data,
    existingNotebook,
  );

  const isConnectionTypesEnabled = useConnectionTypesEnabled();
  const [notebookConnections, setNotebookConnections] = React.useState<Connection[]>(
    isConnectionTypesEnabled && existingNotebook
      ? getConnectionsFromNotebook(existingNotebook, projectConnections)
      : [],
  );

  const [envVariables, setEnvVariables, envVariablesLoaded, deletedConfigMaps, deletedSecrets] =
    useNotebookEnvVariables(existingNotebook, [
      ...notebookConnections.map((connection) => connection.metadata.name),
      dataConnectionData.existing?.secretRef.name || '',
    ]);

  const restartNotebooks = useWillNotebooksRestart([existingNotebook?.metadata.name || '']);

  const [data, loaded, loadError] = useNotebookImageData(existingNotebook);
  React.useEffect(() => {
    if (loaded) {
      if (data.imageAvailability === NotebookImageAvailability.ENABLED) {
        const { imageStream, imageVersion } = data;
        setSelectedImage({ imageStream, imageVersion });
      }
    }
  }, [data, loaded, loadError]);

  const {
    initialState: acceleratorProfileInitialState,
    formData: acceleratorProfileFormData,
    setFormData: setAcceleratorProfileFormData,
  } = useNotebookAcceleratorProfileFormState(existingNotebook);

  React.useEffect(() => {
    if (selectedImage.imageStream) {
      setSupportedAcceleratorProfiles(
        getCompatibleAcceleratorIdentifiers(selectedImage.imageStream),
      );
    } else {
      setSupportedAcceleratorProfiles(undefined);
    }
  }, [selectedImage.imageStream]);

  const editNotebookDisplayName = existingNotebook
    ? getDisplayNameFromK8sResource(existingNotebook)
    : '';

  const sectionIDs = Object.values(SpawnerPageSectionID);

  return (
    <ApplicationsPage
      title={existingNotebook ? `Edit ${editNotebookDisplayName}` : 'Create workbench'}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Data Science Projects</Link>} />
          <BreadcrumbItem
            render={() => (
              <Link to={`/projects/${currentProject.metadata.name}`}>{displayName}</Link>
            )}
          />
          {existingNotebook && <BreadcrumbItem>{editNotebookDisplayName}</BreadcrumbItem>}
          <BreadcrumbItem>{existingNotebook ? 'Edit' : 'Create'} workbench</BreadcrumbItem>
        </Breadcrumb>
      }
      description={
        existingNotebook
          ? 'Modify properties for your workbench.'
          : 'Configure properties for your workbench.'
      }
      loaded
      empty={false}
    >
      <PageSection
        isFilled
        id={ScrollableSelectorID}
        aria-label="spawner-page-spawner-section"
        variant="light"
      >
        <GenericSidebar sections={sectionIDs} titles={SpawnerPageSectionTitles}>
          <Form style={{ maxWidth: 625 }}>
            <FormSection
              id={SpawnerPageSectionID.NAME_DESCRIPTION}
              aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.NAME_DESCRIPTION]}
            >
              <K8sNameDescriptionField
                dataTestId="workbench"
                {...k8sNameDescriptionData}
                autoFocusName
              />
            </FormSection>
            <FormSection
              title={SpawnerPageSectionTitles[SpawnerPageSectionID.NOTEBOOK_IMAGE]}
              id={SpawnerPageSectionID.NOTEBOOK_IMAGE}
              aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.NOTEBOOK_IMAGE]}
            >
              <ImageSelectorField
                selectedImage={selectedImage}
                setSelectedImage={setSelectedImage}
                compatibleAcceleratorIdentifier={
                  acceleratorProfileInitialState.acceleratorProfile?.spec.identifier
                }
              />
            </FormSection>
            <FormSection
              title={SpawnerPageSectionTitles[SpawnerPageSectionID.DEPLOYMENT_SIZE]}
              id={SpawnerPageSectionID.DEPLOYMENT_SIZE}
              aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.DEPLOYMENT_SIZE]}
            >
              <ContainerSizeSelector
                sizes={sizes}
                setValue={setSelectedSize}
                value={selectedSize}
              />
              <AcceleratorProfileSelectField
                supportedAcceleratorProfiles={supportedAcceleratorProfiles}
                initialState={acceleratorProfileInitialState}
                formData={acceleratorProfileFormData}
                setFormData={setAcceleratorProfileFormData}
              />
            </FormSection>
            <FormSection
              title={SpawnerPageSectionTitles[SpawnerPageSectionID.ENVIRONMENT_VARIABLES]}
              id={SpawnerPageSectionID.ENVIRONMENT_VARIABLES}
              aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.ENVIRONMENT_VARIABLES]}
            >
              {envVariablesLoaded && (
                <AlertWarningText
                  deletedConfigMaps={deletedConfigMaps}
                  deletedSecrets={deletedSecrets}
                />
              )}
              <EnvironmentVariables envVariables={envVariables} setEnvVariables={setEnvVariables} />
            </FormSection>
            <FormSection
              title={SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
              id={SpawnerPageSectionID.CLUSTER_STORAGE}
              aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
            >
              <Alert
                data-testid="cluster-storage-alert"
                component="h2"
                variant="info"
                isPlain
                isInline
                title="Cluster storage will mount to /"
              />
              <StorageField storageData={storageData} setStorageData={setStorageData} />
            </FormSection>
            {isConnectionTypesEnabled ? (
              <ConnectionsFormSection
                project={currentProject}
                projectConnections={projectConnections}
                refreshProjectConnections={refreshProjectConnections}
                notebook={existingNotebook}
                notebookDisplayName={k8sNameDescriptionData.data.name}
                selectedConnections={notebookConnections}
                setSelectedConnections={setNotebookConnections}
              />
            ) : (
              <FormSection
                title={SpawnerPageSectionTitles[SpawnerPageSectionID.DATA_CONNECTIONS]}
                id={SpawnerPageSectionID.DATA_CONNECTIONS}
                aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.DATA_CONNECTIONS]}
              >
                <DataConnectionField
                  dataConnectionData={dataConnectionData}
                  setDataConnectionData={setDataConnectionData}
                />
              </FormSection>
            )}
          </Form>
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <Stack hasGutter>
          {restartNotebooks.length !== 0 && (
            <StackItem>
              <NotebookRestartAlert notebooks={restartNotebooks} isCurrent />
            </StackItem>
          )}
          <StackItem>
            <CanEnableElyraPipelinesCheck namespace={currentProject.metadata.name}>
              {(canEnablePipelines) => (
                <SpawnerFooter
                  startNotebookData={{
                    notebookData: k8sNameDescriptionData.data,
                    projectName: currentProject.metadata.name,
                    image: selectedImage,
                    notebookSize: selectedSize,
                    initialAcceleratorProfile: acceleratorProfileInitialState,
                    selectedAcceleratorProfile: acceleratorProfileFormData,
                    volumes: [],
                    volumeMounts: [],
                    existingTolerations: existingNotebook?.spec.template.spec.tolerations || [],
                    existingResources: existingNotebook?.spec.template.spec.containers[0].resources,
                  }}
                  storageData={storageData}
                  envVariables={envVariables}
                  dataConnection={dataConnectionData}
                  isConnectionTypesEnabled={isConnectionTypesEnabled}
                  connections={notebookConnections}
                  canEnablePipelines={canEnablePipelines}
                />
              )}
            </CanEnableElyraPipelinesCheck>
          </StackItem>
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default SpawnerPage;
