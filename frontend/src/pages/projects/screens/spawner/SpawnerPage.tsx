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
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NameDescType } from '~/pages/projects/types';
import { getNotebookDescription, getNotebookDisplayName } from '~/pages/projects/utils';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { NotebookKind } from '~/k8sTypes';
import useNotebookImageData from '~/pages/projects/screens/detail/notebooks/useNotebookImageData';
import useNotebookDeploymentSize from '~/pages/projects/screens/detail/notebooks/useNotebookDeploymentSize';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import useNotebookAcceleratorProfile from '~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfile';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';
import { SpawnerPageSectionID } from './types';
import { ScrollableSelectorID, SpawnerPageSectionTitles } from './const';
import SpawnerFooter from './SpawnerFooter';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import { useNotebookSize } from './useNotebookSize';
import StorageField from './storage/StorageField';
import EnvironmentVariables from './environmentVariables/EnvironmentVariables';
import { useStorageDataObject } from './storage/utils';
import {
  getCompatibleAcceleratorIdentifiers,
  getRootVolumeName,
  useMergeDefaultPVCName,
} from './spawnerUtils';
import { useNotebookEnvVariables } from './environmentVariables/useNotebookEnvVariables';
import DataConnectionField from './dataConnection/DataConnectionField';
import { useNotebookDataConnection } from './dataConnection/useNotebookDataConnection';

type SpawnerPageProps = {
  existingNotebook?: NotebookKind;
};

const SpawnerPage: React.FC<SpawnerPageProps> = ({ existingNotebook }) => {
  const { currentProject, dataConnections } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);

  const [nameDesc, setNameDesc] = React.useState<NameDescType>({
    name: '',
    k8sName: undefined,
    description: '',
  });
  const [selectedImage, setSelectedImage] = React.useState<ImageStreamAndVersion>({
    imageStream: undefined,
    imageVersion: undefined,
  });
  const { selectedSize, setSelectedSize, sizes } = useNotebookSize();
  const [supportedAcceleratorProfiles, setSupportedAcceleratorProfiles] = React.useState<
    string[] | undefined
  >();
  const [storageDataWithoutDefault, setStorageData] = useStorageDataObject(existingNotebook);
  const storageData = useMergeDefaultPVCName(storageDataWithoutDefault, nameDesc.name);
  const [envVariables, setEnvVariables] = useNotebookEnvVariables(existingNotebook);
  const [dataConnectionData, setDataConnectionData] = useNotebookDataConnection(
    dataConnections.data,
    existingNotebook,
  );

  const restartNotebooks = useWillNotebooksRestart([existingNotebook?.metadata.name || '']);

  React.useEffect(() => {
    if (existingNotebook) {
      setNameDesc({
        name: getNotebookDisplayName(existingNotebook),
        k8sName: existingNotebook.metadata.name,
        description: getNotebookDescription(existingNotebook),
      });
    }
  }, [existingNotebook, setStorageData]);

  const [data, loaded, loadError] = useNotebookImageData(existingNotebook);
  React.useEffect(() => {
    if (loaded) {
      if (data.imageAvailability === NotebookImageAvailability.ENABLED) {
        const { imageStream, imageVersion } = data;
        setSelectedImage({ imageStream, imageVersion });
      }
    }
  }, [data, loaded, loadError]);

  const { size: notebookSize } = useNotebookDeploymentSize(existingNotebook);
  React.useEffect(() => {
    if (notebookSize) {
      setSelectedSize(notebookSize.name);
    }
  }, [notebookSize, setSelectedSize]);

  const [notebookAcceleratorProfileState, setNotebookAcceleratorProfileState] =
    useNotebookAcceleratorProfile(existingNotebook);

  React.useEffect(() => {
    if (selectedImage.imageStream) {
      setSupportedAcceleratorProfiles(
        getCompatibleAcceleratorIdentifiers(selectedImage.imageStream),
      );
    } else {
      setSupportedAcceleratorProfiles(undefined);
    }
  }, [selectedImage.imageStream]);

  const editNotebookDisplayName = existingNotebook ? getNotebookDisplayName(existingNotebook) : '';

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
              <NameDescriptionField
                nameFieldId="workbench-name"
                descriptionFieldId="workbench-description"
                data={nameDesc}
                setData={setNameDesc}
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
                  notebookAcceleratorProfileState.acceleratorProfile?.spec.identifier
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
                acceleratorProfileState={notebookAcceleratorProfileState}
                setAcceleratorProfileState={setNotebookAcceleratorProfileState}
                supportedAcceleratorProfiles={supportedAcceleratorProfiles}
              />
            </FormSection>
            <FormSection
              title={SpawnerPageSectionTitles[SpawnerPageSectionID.ENVIRONMENT_VARIABLES]}
              id={SpawnerPageSectionID.ENVIRONMENT_VARIABLES}
              aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.ENVIRONMENT_VARIABLES]}
            >
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
              <StorageField
                storageData={storageData}
                setStorageData={setStorageData}
                editStorage={getRootVolumeName(existingNotebook)}
              />
            </FormSection>
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
                    notebookName: nameDesc.name,
                    description: nameDesc.description,
                    projectName: currentProject.metadata.name,
                    image: selectedImage,
                    notebookSize: selectedSize,
                    acceleratorProfile: notebookAcceleratorProfileState,
                    volumes: [],
                    volumeMounts: [],
                    existingTolerations: existingNotebook?.spec.template.spec.tolerations || [],
                    existingResources: existingNotebook?.spec.template.spec.containers[0].resources,
                  }}
                  storageData={storageData}
                  envVariables={envVariables}
                  dataConnection={dataConnectionData}
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
