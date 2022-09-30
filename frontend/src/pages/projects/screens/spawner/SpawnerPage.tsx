import * as React from 'react';
import ApplicationsPage from '../../../../pages/ApplicationsPage';
import { Divider, Form, FormSection, PageSection, Stack, StackItem } from '@patternfly/react-core';
import GenericSidebar from '../../components/GenericSidebar';
import { NameDescType, SpawnerPageSectionID } from './types';
import { ScrollableSelectorID, SpawnerPageSectionTitles } from './const';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import FormFooter from './FormFooter';
import NameDescriptionField from './NameDescriptionField';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import useImageStreams from './useImageStreams';
import { useDashboardNamespace, useUser } from '../../../../redux/selectors';
import useBuildStatuses from './useBuildStatuses';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import { useNotebookSize } from './useNotebookSize';
import { ImageStreamAndVersion } from '../../../../types';

const SpawnerPage: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { username } = useUser();
  const [nameDesc, setNameDesc] = React.useState<NameDescType>({ name: '', description: '' });
  const [imageStreams, imageStreamsLoaded, imageStreamsLoadError] =
    useImageStreams(dashboardNamespace);
  const [selectedImage, setSelectedImage] = React.useState<ImageStreamAndVersion>({
    imageStream: undefined,
    imageVersion: undefined,
  });
  const buildStatuses = useBuildStatuses(dashboardNamespace);
  const { selectedSize, setSelectedSize, sizes } = useNotebookSize();

  return (
    <ApplicationsPage
      title={`Create data science workspace`}
      description="Configure properties for your data science workspace."
      loaded
      empty={false}
    >
      <div id="spawner-page-wrapper">
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
              <Stack hasGutter>
                <StackItem>
                  <NameDescriptionField nameDesc={nameDesc} setNameDesc={setNameDesc} />
                </StackItem>
                <Divider />
                <StackItem>
                  <ImageSelectorField
                    selectedImage={selectedImage}
                    setSelectedImage={setSelectedImage}
                    imageStreams={imageStreams}
                    loaded={imageStreamsLoaded}
                    error={imageStreamsLoadError}
                    buildStatuses={buildStatuses}
                  />
                </StackItem>
                <Divider />
                <StackItem>
                  <FormSection title="Deployment size" id={SpawnerPageSectionID.DEPLOYMENT_SIZE}>
                    <ContainerSizeSelector
                      sizes={sizes}
                      setValue={setSelectedSize}
                      value={selectedSize}
                    />
                  </FormSection>
                </StackItem>
              </Stack>
            </Form>
          </GenericSidebar>
        </PageSection>
        <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
          <FormFooter
            project={currentProject}
            startData={{
              notebookName: nameDesc.name,
              description: nameDesc.description,
              projectName: currentProject.metadata.name,
              username,
              image: selectedImage,
              notebookSize: selectedSize,
              gpus: 0,
            }}
          />
        </PageSection>
      </div>
    </ApplicationsPage>
  );
};

export default SpawnerPage;
