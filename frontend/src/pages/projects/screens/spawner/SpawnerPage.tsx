import * as React from 'react';
import ApplicationsPage from '../../../../pages/ApplicationsPage';
import { Form, FormSection, PageSection } from '@patternfly/react-core';
import GenericSidebar from '../../components/GenericSidebar';
import { SpawnerPageSectionID } from './types';
import { ScrollableSelectorID, SpawnerPageSectionTitles } from './const';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import SpawnerFooter from './SpawnerFooter';
import NameDescriptionField from './NameDescriptionField';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import useImageStreams from './useImageStreams';
import { useDashboardNamespace, useUser } from '../../../../redux/selectors';
import useBuildStatuses from './useBuildStatuses';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import { useNotebookSize } from './useNotebookSize';
import { ImageStreamAndVersion } from '../../../../types';
import StorageField from './storage/StorageField';
import useGenericSet from '../../useGenericSet';
import { useCreatingStorageObject, useExistingStorageObject } from '../../utils';
import { NameDescType, StorageData } from '../../types';

const SpawnerPage: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { username } = useUser();
  const buildStatuses = useBuildStatuses(dashboardNamespace);
  // Name and description field
  const [nameDesc, setNameDesc] = React.useState<NameDescType>({ name: '', description: '' });

  // Image selector field
  const [imageStreams, imageStreamsLoaded, imageStreamsLoadError] =
    useImageStreams(dashboardNamespace);
  const [selectedImage, setSelectedImage] = React.useState<ImageStreamAndVersion>({
    imageStream: undefined,
    imageVersion: undefined,
  });

  // Deployment size field
  const { selectedSize, setSelectedSize, sizes } = useNotebookSize();

  // Storage field
  const [storageType, setStorageType] = React.useState<'ephemeral' | 'persistent'>('ephemeral');
  const [storageBindingType, setStorageBindingType] = useGenericSet<'new' | 'existing'>(['new']);
  const [creatingObject, setCreatingObject] = useCreatingStorageObject();
  const [existingObject, setExistingObject] = useExistingStorageObject();

  const storageData: StorageData = React.useMemo(
    () => ({
      storageType,
      storageBindingType,
      creatingObject,
      existingObject,
    }),
    [storageType, storageBindingType, creatingObject, existingObject],
  );

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
            <NameDescriptionField data={nameDesc} setData={setNameDesc} />
            <ImageSelectorField
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              imageStreams={imageStreams}
              loaded={imageStreamsLoaded}
              error={imageStreamsLoadError}
              buildStatuses={buildStatuses}
            />
            <FormSection title="Deployment size" id={SpawnerPageSectionID.DEPLOYMENT_SIZE}>
              <ContainerSizeSelector
                sizes={sizes}
                setValue={setSelectedSize}
                value={selectedSize}
              />
            </FormSection>
            <StorageField
              projects={[currentProject]} // set only current project as projects for now
              storageType={storageType}
              setStorageType={setStorageType}
              storageBindingType={storageBindingType}
              setStorageBindingType={setStorageBindingType}
              creatingObject={creatingObject}
              setCreatingObject={setCreatingObject}
              existingObject={existingObject}
              setExistingObject={setExistingObject}
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
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default SpawnerPage;
