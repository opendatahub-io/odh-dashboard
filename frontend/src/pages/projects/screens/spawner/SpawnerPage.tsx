import * as React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Form, FormSection, PageSection } from '@patternfly/react-core';
import ApplicationsPage from '../../../../pages/ApplicationsPage';
import { ImageStreamAndVersion } from '../../../../types';
import GenericSidebar from '../../components/GenericSidebar';
import NameDescriptionField from '../../components/NameDescriptionField';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import { EnvVariable, NameDescType, StorageType } from '../../types';
import { getProjectDisplayName } from '../../utils';
import { SpawnerPageSectionID } from './types';
import { ScrollableSelectorID, SpawnerPageSectionTitles } from './const';
import SpawnerFooter from './SpawnerFooter';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import { useNotebookSize } from './useNotebookSize';
import StorageField from './storage/StorageField';
import EnvironmentVariables from './environmentVariables/EnvironmentVariables';
import { useStorageDataObject } from './storage/utils';

const SpawnerPage: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);

  const [nameDesc, setNameDesc] = React.useState<NameDescType>({ name: '', description: '' });
  const [selectedImage, setSelectedImage] = React.useState<ImageStreamAndVersion>({
    imageStream: undefined,
    imageVersion: undefined,
  });
  const { selectedSize, setSelectedSize, sizes } = useNotebookSize();
  const [storageData, setStorageData] = useStorageDataObject(StorageType.EPHEMERAL);
  const [envVariables, setEnvVariables] = React.useState<EnvVariable[]>([]);

  return (
    <ApplicationsPage
      title="Create data science workspace"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Data science projects</Link>} />
          <BreadcrumbItem
            render={() => (
              <Link to={`/projects/${currentProject.metadata.name}`}>{displayName}</Link>
            )}
          />
          <BreadcrumbItem>Create workspace</BreadcrumbItem>
        </Breadcrumb>
      }
      description="Configure properties for your data science workspace."
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
          sections={Object.values(SpawnerPageSectionID)}
          titles={SpawnerPageSectionTitles}
          scrollableSelector={`#${ScrollableSelectorID}`}
        >
          <Form style={{ maxWidth: 600, marginBottom: 'var(--pf-global--spacer--lg)' }}>
            <FormSection id={SpawnerPageSectionID.NAME_DESCRIPTION}>
              <NameDescriptionField
                nameFieldId="workspace-name"
                descriptionFieldId="workspace-description"
                data={nameDesc}
                setData={setNameDesc}
                autoFocusName
              />
            </FormSection>
            <ImageSelectorField selectedImage={selectedImage} setSelectedImage={setSelectedImage} />
            <FormSection title="Deployment size" id={SpawnerPageSectionID.DEPLOYMENT_SIZE}>
              <ContainerSizeSelector
                sizes={sizes}
                setValue={setSelectedSize}
                value={selectedSize}
              />
            </FormSection>
            <FormSection
              title={SpawnerPageSectionTitles[SpawnerPageSectionID.ENVIRONMENT_VARIABLES]}
              id={SpawnerPageSectionID.ENVIRONMENT_VARIABLES}
            >
              <EnvironmentVariables envVariables={envVariables} setEnvVariables={setEnvVariables} />
            </FormSection>
            <StorageField
              storageData={storageData}
              setStorageData={setStorageData}
              availableSize={20}
            />
          </Form>
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <SpawnerFooter
          startNotebookData={{
            notebookName: nameDesc.name,
            description: nameDesc.description,
            projectName: currentProject.metadata.name,
            image: selectedImage,
            notebookSize: selectedSize,
            gpus: 0,
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
