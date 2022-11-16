import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormSection,
  PageSection,
} from '@patternfly/react-core';
import ApplicationsPage from '../../../../pages/ApplicationsPage';
import { ImageStreamAndVersion } from '../../../../types';
import GenericSidebar from '../../components/GenericSidebar';
import NameDescriptionField from '../../components/NameDescriptionField';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import { EnvVariable, NameDescType, StorageType } from '../../types';
import { getNotebookDescription, getNotebookDisplayName, getProjectDisplayName } from '../../utils';
import { SpawnerPageSectionID } from './types';
import { ScrollableSelectorID, SpawnerPageSectionTitles } from './const';
import SpawnerFooter from './SpawnerFooter';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import { useNotebookSize } from './useNotebookSize';
import StorageField from './storage/StorageField';
import EnvironmentVariables from './environmentVariables/EnvironmentVariables';
import { useStorageDataObject } from './storage/utils';
import GPUSelectField from '../../../notebookController/screens/server/GPUSelectField';
import { NotebookKind } from '../../../../k8sTypes';
import useNotebookImageData from '../detail/notebooks/useNotebookImageData';
import useNotebookDeploymentSize from '../detail/notebooks/useNotebookDeploymentSize';
import { useMergeDefaultPVCName } from './spawnerUtils';

type SpawnerPageProps = {
  existingNotebook?: NotebookKind;
};

const SpawnerPage: React.FC<SpawnerPageProps> = ({ existingNotebook }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
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
  const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
  const [storageDataWithoutDefault, setStorageData] = useStorageDataObject(StorageType.NEW_PVC);
  const storageData = useMergeDefaultPVCName(storageDataWithoutDefault, nameDesc.name);
  const [envVariables, setEnvVariables] = React.useState<EnvVariable[]>([]);

  React.useEffect(() => {
    if (existingNotebook) {
      setNameDesc({
        name: getNotebookDisplayName(existingNotebook),
        k8sName: existingNotebook.metadata.name,
        description: getNotebookDescription(existingNotebook),
      });
    }
  }, [existingNotebook]);

  const [data, loaded] = useNotebookImageData(existingNotebook);
  React.useEffect(() => {
    const { imageStream, imageVersion } = data || {};
    if (loaded && imageStream && imageVersion) {
      setSelectedImage({ imageStream, imageVersion });
    }
  }, [data, loaded]);

  const notebookSize = useNotebookDeploymentSize(existingNotebook);
  React.useEffect(() => {
    if (notebookSize) {
      setSelectedSize(notebookSize.name);
    }
  }, [notebookSize, setSelectedSize]);

  const editNotebookDisplayName = existingNotebook ? getNotebookDisplayName(existingNotebook) : '';

  const sectionIDs = Object.values(SpawnerPageSectionID);

  // TODO: Remove this after we support the related sections
  const filteredSectionIDs = existingNotebook
    ? sectionIDs.filter(
        (id) =>
          id !== SpawnerPageSectionID.ENVIRONMENT_VARIABLES &&
          id !== SpawnerPageSectionID.CLUSTER_STORAGE,
      )
    : sectionIDs;

  return (
    <ApplicationsPage
      title={existingNotebook ? `Edit ${editNotebookDisplayName}` : 'Create workbench'}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Data science projects</Link>} />
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
        hasOverflowScroll
        variant="light"
      >
        <GenericSidebar
          sections={filteredSectionIDs}
          titles={SpawnerPageSectionTitles}
          scrollableSelector={`#${ScrollableSelectorID}`}
        >
          <Form style={{ maxWidth: 600 }}>
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
              <GPUSelectField
                value={selectedGpu}
                setValue={(value: string) => setSelectedGpu(value)}
              />
            </FormSection>
            {!existingNotebook && ( // TODO: Support these functionalities
              <>
                <FormSection
                  title={SpawnerPageSectionTitles[SpawnerPageSectionID.ENVIRONMENT_VARIABLES]}
                  id={SpawnerPageSectionID.ENVIRONMENT_VARIABLES}
                  aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.ENVIRONMENT_VARIABLES]}
                >
                  <EnvironmentVariables
                    envVariables={envVariables}
                    setEnvVariables={setEnvVariables}
                  />
                </FormSection>
                <FormSection
                  title={SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
                  id={SpawnerPageSectionID.CLUSTER_STORAGE}
                  aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.CLUSTER_STORAGE]}
                >
                  <Alert variant="info" isPlain isInline title="Cluster storages will mount to /" />
                  <StorageField storageData={storageData} setStorageData={setStorageData} />
                </FormSection>
              </>
            )}
          </Form>
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <SpawnerFooter
          editNotebook={existingNotebook}
          startNotebookData={{
            notebookName: nameDesc.name,
            description: nameDesc.description,
            projectName: currentProject.metadata.name,
            image: selectedImage,
            notebookSize: selectedSize,
            gpus: parseInt(selectedGpu),
            volumes: [],
            volumeMounts: [],
          }}
          storageData={storageData}
          envVariables={envVariables}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default SpawnerPage;
