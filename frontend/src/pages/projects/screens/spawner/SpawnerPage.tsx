import * as React from 'react';
import ApplicationsPage from '../../../../pages/ApplicationsPage';
import { Form, FormSection, PageSection } from '@patternfly/react-core';
import GenericSidebar from '../../components/GenericSidebar';
import { SpawnerPageSectionID } from './types';
import { ScrollableSelectorID, SpawnerPageSectionTitles } from './const';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import SpawnerFooter from './SpawnerFooter';
import NameDescriptionField from '../../components/NameDescriptionField';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import { useDashboardNamespace, useUser } from '../../../../redux/selectors';
import useBuildStatuses from './useBuildStatuses';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import { useNotebookSize } from './useNotebookSize';
import { ImageStreamAndVersion } from '../../../../types';
import StorageField from './storage/StorageField';
import EnvironmentVariables from './environmentVariables/EnvironmentVariables';
import { EnvVariable, NameDescType } from '../../types';
import { useStorageDataObject } from './storage/utils';

const SpawnerPage: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { username } = useUser();
  const buildStatuses = useBuildStatuses(dashboardNamespace);

  const [nameDesc, setNameDesc] = React.useState<NameDescType>({ name: '', description: '' });

  // Image selector field
  const [selectedImage, setSelectedImage] = React.useState<ImageStreamAndVersion>({
    imageStream: undefined,
    imageVersion: undefined,
  });

  // Deployment size field
  const { selectedSize, setSelectedSize, sizes } = useNotebookSize();

  const [storageData, setStorageData] = useStorageDataObject(
    'ephemeral',
    undefined,
    currentProject.metadata.name,
  );
  const [envVariables, setEnvVariables] = React.useState<EnvVariable[]>([]);

   return (
    <ApplicationsPage
      title={`Create data science workspace`}
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
          <Form maxWidth="50%">
            <FormSection id={SpawnerPageSectionID.NAME_DESCRIPTION}>
              <NameDescriptionField
                nameFieldId="workspace-name"
                descriptionFieldId="workspace-description"
                data={nameDesc}
                setData={setNameDesc}
              />
            </FormSection>
            <ImageSelectorField
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              buildStatuses={buildStatuses}
            />
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
              <EnvironmentVariables envVariables={envVariables} setEnvVariables={setEnvVariables}/>
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
            username,
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
