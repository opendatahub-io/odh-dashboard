import * as React from 'react';
import {
  Gallery,
  PageSection,
  PageSectionProps,
  Stack,
  Text,
  TextContent,
} from '@patternfly/react-core';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-Color.svg';
import pipelineIcon from '~/images/UI_icon-Red_Hat-Branch-Color.svg';
import chartIcon from '~/images/UI_icon-Red_Hat-Chart-Color.svg';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { SectionType } from '~/concepts/design/utils';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '~/concepts/areas';
import OrganizeGallery from './OrganizeGallery';
import PipelinesGallery from './PipelinesGallery';
import ServingGallery from './ServingGallery';
import OrganizeCard from './OrganizeCard';

type OrganizeSectionProps = PageSectionProps & {
  allowCreateProjects: boolean;
};

const OrganizeSection: React.FC<OrganizeSectionProps> = ({ allowCreateProjects, ...rest }) => {
  const { status: pipelinesAvailable } = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS);
  const { status: projectsAvailable } = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW);
  const servingPlatformStatuses = useServingPlatformStatuses();
  const [selected, setSelected] = React.useState<string | undefined>();

  const modelServersEnabled =
    servingPlatformStatuses.kServe.enabled || servingPlatformStatuses.modelMesh.enabled;

  return (
    <PageSection data-testid="landing-page-organize" variant="light" {...rest}>
      <Stack hasGutter>
        <TextContent>
          <Text component="h1">
            Train, serve, monitor, and manage AI/ML models and AI-enabled applications
          </Text>
        </TextContent>
        <Gallery
          hasGutter
          minWidths={{ default: '100%', md: 'calc(33.33% - 2rem / 3)' }}
          maxWidths={{ default: '100%', md: 'calc(33.33% - 2rem / 3)' }}
        >
          {projectsAvailable && allowCreateProjects ? (
            <OrganizeCard
              title="Organize your work with projects"
              imgSrc={projectIcon}
              imgAlt="organizing your work"
              sectionType={SectionType.organize}
              selected={selected === 'organize'}
              onSelect={() => setSelected((prev) => (prev === 'organize' ? undefined : 'organize'))}
            />
          ) : null}
          {pipelinesAvailable ? (
            <OrganizeCard
              title="Train models with pipelines"
              imgSrc={pipelineIcon}
              imgAlt="train your models"
              sectionType={SectionType.training}
              selected={selected === 'train'}
              onSelect={() => setSelected((prev) => (prev === 'train' ? undefined : 'train'))}
            />
          ) : null}
          {modelServersEnabled ? (
            <OrganizeCard
              title="Deploy models and monitor for performance"
              imgSrc={chartIcon}
              imgAlt="deploy models"
              sectionType={SectionType.serving}
              selected={selected === 'serving'}
              onSelect={() => setSelected((prev) => (prev === 'serving' ? undefined : 'serving'))}
            />
          ) : null}
        </Gallery>
        {selected === 'organize' ? (
          <OrganizeGallery onClose={() => setSelected(undefined)} />
        ) : null}
        {selected === 'train' ? <PipelinesGallery onClose={() => setSelected(undefined)} /> : null}
        {selected === 'serving' ? <ServingGallery onClose={() => setSelected(undefined)} /> : null}
      </Stack>
    </PageSection>
  );
};

export default OrganizeSection;
