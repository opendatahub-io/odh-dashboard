import * as React from 'react';
import ApplicationsPage from '../../../../pages/ApplicationsPage';
import { Divider, Form, FormSection, PageSection, Stack, StackItem } from '@patternfly/react-core';
import GenericSidebar from '../../components/GenericSidebar';
import { ImageStreamAndVersion, NameDescType, SpawnerPageSectionID } from './types';
import { SpawnerPageSectionTitles } from './const';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import FormFooter from './FormFooter';
import NameDescriptionField from './NameDescriptionField';
import ImageSelectorField from './imageSelector/ImageSelectorField';
import useImageStreams from './useImageStreams';
import { useDashboardNamespace } from '../../../../redux/selectors';
import useBuildStatuses from './useBuildStatuses';
import ContainerSizeSelector from './deploymentSize/ContainerSizeSelector';
import { useNotebookSize } from './useNotebookSize';

const SpawnerPage: React.FC = () => {
  const scrollableSelectorID = 'workspace-spawner-page';
  const { dashboardNamespace } = useDashboardNamespace();
  const { currentProject } = React.useContext(ProjectDetailsContext);
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
          id={scrollableSelectorID}
          aria-label="spawner-page-spawner-section"
          hasOverflowScroll
          variant="light"
        >
          <GenericSidebar
            sections={Object.values(SpawnerPageSectionID)}
            titles={SpawnerPageSectionTitles}
            scrollableSelector={`#${scrollableSelectorID}`}
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
          <FormFooter project={currentProject} />
        </PageSection>
      </div>
    </ApplicationsPage>
  );
};

export default SpawnerPage;
