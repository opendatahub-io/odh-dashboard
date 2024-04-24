import * as React from 'react';
import { PageSection, Stack, Text, TextContent } from '@patternfly/react-core';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-Color.svg';
import pipelineIcon from '~/images/UI_icon-Red_Hat-Branch-Color.svg';
import chartIcon from '~/images/UI_icon-Red_Hat-Chart-Color.svg';
import { SectionType } from '~/concepts/design/utils';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '~/concepts/areas';
import EvenlySpacedGallery from '~/components/EvenlySpacedGallery';
import ProjectsGallery from './ProjectsGallery';
import CreateAndTrainGallery from './CreateAndTrainGallery';
import DeployAndMonitorGallery from './DeployAndMonitorGallery';
import AIFlowCard from './AIFlowCard';

export const useAIFlows = (): React.ReactNode => {
  const { status: workbenchesAvailable } = useIsAreaAvailable(SupportedArea.WORKBENCHES);
  const { status: pipelinesAvailable } = useIsAreaAvailable(SupportedArea.DS_PIPELINES);
  const { status: projectsAvailable } = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW);
  const { status: modelServingAvailable } = useIsAreaAvailable(SupportedArea.MODEL_SERVING);
  const [selected, setSelected] = React.useState<string | undefined>();

  return React.useMemo(() => {
    const cards = [];
    if (projectsAvailable) {
      cards.push(
        <AIFlowCard
          key="projects"
          data-testid="ai-flow-projects-card"
          title="Organize your work with projects"
          imgSrc={projectIcon}
          imgAlt="organizing your work"
          sectionType={SectionType.organize}
          selected={selected === 'organize'}
          onSelect={() => setSelected((prev) => (prev === 'organize' ? undefined : 'organize'))}
        />,
      );
    }
    if (workbenchesAvailable || pipelinesAvailable) {
      cards.push(
        <AIFlowCard
          key="train"
          data-testid="ai-flow-train-card"
          title="Create and train models"
          imgSrc={pipelineIcon}
          imgAlt="train your models"
          sectionType={SectionType.training}
          selected={selected === 'train'}
          onSelect={() => setSelected((prev) => (prev === 'train' ? undefined : 'train'))}
        />,
      );
    }
    if (modelServingAvailable) {
      cards.push(
        <AIFlowCard
          key="models"
          data-testid="ai-flow-models-card"
          title="Deploy and monitor models"
          imgSrc={chartIcon}
          imgAlt="deploy models"
          sectionType={SectionType.serving}
          selected={selected === 'serving'}
          onSelect={() => setSelected((prev) => (prev === 'serving' ? undefined : 'serving'))}
        />,
      );
    }

    if (!cards.length) {
      return null;
    }

    return (
      <PageSection data-testid="home-page-ai-flows" variant="light">
        <Stack hasGutter>
          <TextContent>
            <Text component="h1">Train, serve, monitor, and manage AI/ML models</Text>
          </TextContent>
          <EvenlySpacedGallery itemCount={cards.length} hasGutter>
            {cards}
          </EvenlySpacedGallery>
          {selected === 'organize' ? (
            <ProjectsGallery onClose={() => setSelected(undefined)} />
          ) : null}
          {selected === 'train' ? (
            <CreateAndTrainGallery onClose={() => setSelected(undefined)} />
          ) : null}
          {selected === 'serving' ? (
            <DeployAndMonitorGallery onClose={() => setSelected(undefined)} />
          ) : null}
        </Stack>
      </PageSection>
    );
  }, [
    modelServingAvailable,
    pipelinesAvailable,
    projectsAvailable,
    selected,
    workbenchesAvailable,
  ]);
};
