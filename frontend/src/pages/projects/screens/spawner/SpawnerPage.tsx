import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Flex,
  FlexItem,
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
import { StorageData, StorageType } from '~/pages/projects/types';
import useNotebookPVCItems from '~/pages/projects/pvc/useNotebookPVCItems';
import { getNotebookPVCMountPathMap } from '~/pages/projects/notebook/utils';
import { getNotebookPVCNames } from '~/pages/projects/pvc/utils';
import { SpawnerPageSectionID } from './types';
import {
  K8_NOTEBOOK_RESOURCE_NAME_VALIDATOR,
  ScrollableSelectorID,
  SpawnerPageSectionTitles,
} from './const';
import SpawnerFooter from './SpawnerFooter';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import EnvironmentVariables from './environmentVariables/EnvironmentVariables';
import { getCompatibleAcceleratorIdentifiers } from './spawnerUtils';
import { useNotebookEnvVariables } from './environmentVariables/useNotebookEnvVariables';
import { useNotebookDataConnection } from './dataConnection/useNotebookDataConnection';
import { useNotebookSizeState } from './useNotebookSizeState';
import useDefaultStorageClass from './storage/useDefaultStorageClass';
import usePreferredStorageClass from './storage/usePreferredStorageClass';
import { ConnectionsFormSection } from './connections/ConnectionsFormSection';
import { getConnectionsFromNotebook } from './connections/utils';
import AlertWarningText from './environmentVariables/AlertWarningText';
import { ClusterStorageTable } from './storage/ClusterStorageTable';
import useDefaultPvcSize from './storage/useDefaultPvcSize';
import { defaultClusterStorage } from './storage/constants';
import { ClusterStorageEmptyState } from './storage/ClusterStorageEmptyState';
import AttachExistingStorageModal from './storage/AttachExistingStorageModal';
import WorkbenchStorageModal from './storage/WorkbenchStorageModal';
import DataConnectionField from './dataConnection/DataConnectionField';

type SpawnerPageProps = {
  existingNotebook?: NotebookKind;
};

const SpawnerPage: React.FC<SpawnerPageProps> = ({ existingNotebook }) => {
  const {
    currentProject,
    dataConnections,
    connections: { data: projectConnections, refresh: refreshProjectConnections },
    notebooks: { data: notebooks },
  } = React.useContext(ProjectDetailsContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);

  const k8sNameDescriptionData = useK8sNameDescriptionFieldData({
    initialData: existingNotebook,
    limitNameResourceType: LimitNameResourceType.WORKBENCH,
    safePrefix: 'wb-',
    regexp: K8_NOTEBOOK_RESOURCE_NAME_VALIDATOR,
  });
  const [isAttachStorageModalOpen, setIsAttachStorageModalOpen] = React.useState(false);
  const [isCreateStorageModalOpen, setIsCreateStorageModalOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<ImageStreamAndVersion>({
    imageStream: undefined,
    imageVersion: undefined,
  });
  const { selectedSize, setSelectedSize, sizes } = useNotebookSizeState(existingNotebook);
  const [supportedAcceleratorProfiles, setSupportedAcceleratorProfiles] = React.useState<
    string[] | undefined
  >();
  const [defaultStorageClass] = useDefaultStorageClass();
  const preferredStorageClass = usePreferredStorageClass();
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const defaultStorageClassName = isStorageClassesAvailable
    ? defaultStorageClass?.metadata.name
    : preferredStorageClass?.metadata.name;
  const defaultNotebookSize = useDefaultPvcSize();

  const [existingPvcs] = useNotebookPVCItems(existingNotebook);
  const [storageData, setStorageData] = React.useState<StorageData[]>(
    existingNotebook
      ? existingPvcs.map((existingPvc) => ({
          storageType: StorageType.EXISTING_PVC,
          existingPvc,
          name:
            existingPvc.metadata.annotations?.['openshift.io/display-name'] ||
            existingPvc.metadata.name,
          description: existingPvc.metadata.annotations?.['openshift.io/description'],
          size: existingPvc.spec.resources.requests.storage,
          storageClassName: existingPvc.spec.storageClassName,
          mountPath: getNotebookPVCMountPathMap(existingNotebook)[existingPvc.metadata.name],
        }))
      : [
          {
            storageType: StorageType.NEW_PVC,
            name: k8sNameDescriptionData.data.name || defaultClusterStorage.name,
            description: defaultClusterStorage.description,
            size: defaultClusterStorage.size || defaultNotebookSize,
            storageClassName: defaultStorageClassName,
            mountPath: defaultClusterStorage.mountPath,
          },
        ],
  );

  const existingMountPaths = storageData.reduce(
    (acc: string[], storageDataEntry) =>
      storageDataEntry.mountPath ? acc.concat(storageDataEntry.mountPath) : acc,
    [],
  );
  const existingStorageNames = storageData.map((storageDataEntry) => storageDataEntry.name);

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

  const notebooksUsingPVCsWithSizeChanges = React.useMemo(() => {
    const attachedPVCs = storageData.filter((storage) => storage.existingPvc !== undefined);

    return attachedPVCs.flatMap((storage) =>
      notebooks
        .filter(
          ({ notebook }) =>
            getNotebookPVCNames(notebook).includes(storage.existingPvc?.metadata.name || '') &&
            storage.existingPvc?.spec.resources.requests.storage !== storage.size,
        )
        .map(({ notebook }) => notebook.metadata.name),
    );
  }, [storageData, notebooks]);

  const restartNotebooks = useWillNotebooksRestart([
    existingNotebook?.metadata.name || '',
    ...notebooksUsingPVCsWithSizeChanges,
  ]);

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
        hasBodyWrapper={false}
        isFilled
        id={ScrollableSelectorID}
        aria-label="spawner-page-spawner-section"
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
              title={
                <Flex
                  spaceItems={{ default: 'spaceItemsMd' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem spacer={{ default: 'spacerLg' }}>
                    {SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
                  </FlexItem>

                  <Button
                    variant="secondary"
                    data-testid="existing-storage-button"
                    onClick={() => setIsAttachStorageModalOpen(true)}
                  >
                    Attach existing storage
                  </Button>

                  <Button
                    variant="secondary"
                    data-testid="create-storage-button"
                    onClick={() => setIsCreateStorageModalOpen(true)}
                  >
                    Create storage
                  </Button>
                </Flex>
              }
              id={SpawnerPageSectionID.CLUSTER_STORAGE}
              aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
            >
              {storageData.length ? (
                <ClusterStorageTable
                  storageData={storageData.map((formData, index) => ({ ...formData, id: index }))}
                  existingStorageNames={existingStorageNames}
                  existingMountPaths={existingMountPaths}
                  setStorageData={setStorageData}
                  workbenchName={k8sNameDescriptionData.data.k8sName.value}
                />
              ) : (
                <ClusterStorageEmptyState />
              )}
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
              <FormSection title="Data connections">
                <DataConnectionField
                  dataConnectionData={dataConnectionData}
                  setDataConnectionData={setDataConnectionData}
                />
              </FormSection>
            )}
          </Form>
        </GenericSidebar>
      </PageSection>
      <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
        <Stack hasGutter>
          {restartNotebooks.length !== 0 && (
            <StackItem>
              <NotebookRestartAlert notebooks={restartNotebooks} />
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

      {isAttachStorageModalOpen && (
        <AttachExistingStorageModal
          existingMountPaths={existingMountPaths}
          existingStorageNames={existingStorageNames}
          onClose={(submit, attachData) => {
            if (submit && attachData?.storage) {
              setStorageData((prevData) =>
                prevData.concat([
                  {
                    storageType: StorageType.EXISTING_PVC,
                    id: storageData.length + 1,
                    name: attachData.pvc
                      ? getDisplayNameFromK8sResource(attachData.pvc)
                      : attachData.storage,
                    existingPvc: attachData.pvc,
                    mountPath: attachData.mountPath.value,
                    description: attachData.pvc?.metadata.annotations?.['openshift.io/description'],
                    size: attachData.pvc?.spec.resources.requests.storage,
                    storageClassName: attachData.pvc?.spec.storageClassName,
                  },
                ]),
              );
            }

            setIsAttachStorageModalOpen(false);
          }}
        />
      )}

      {isCreateStorageModalOpen && (
        <WorkbenchStorageModal
          onSubmit={(newStorageData) =>
            setStorageData((prevData) =>
              prevData.concat([
                {
                  ...newStorageData,
                  storageType: StorageType.NEW_PVC,
                  id: storageData.length + 1,
                },
              ]),
            )
          }
          existingStorageNames={existingStorageNames}
          existingMountPaths={existingMountPaths}
          onClose={() => setIsCreateStorageModalOpen(false)}
        />
      )}
    </ApplicationsPage>
  );
};

export default SpawnerPage;
