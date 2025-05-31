import * as React from 'react';
import { PageSection, Stack, Content } from '@patternfly/react-core';
import { SectionType, sectionTypeBorderColor } from '#~/concepts/design/utils';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '#~/concepts/areas';
import EvenlySpacedGallery from '#~/components/EvenlySpacedGallery';
import { CreateAndTrainIcon, ModelIcon, ProjectIcon } from '#~/images/icons';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import ProjectsGallery from './ProjectsGallery';
import CreateAndTrainGallery from './CreateAndTrainGallery';
import DeployAndMonitorGallery from './DeployAndMonitorGallery';
import AIFlowCard from './AIFlowCard';
import AIFlowHint from './AIFlowHint';

export const useAIFlows = (): React.ReactNode => {
  const { status: workbenchesAvailable } = useIsAreaAvailable(SupportedArea.WORKBENCHES);
  const { status: pipelinesAvailable } = useIsAreaAvailable(SupportedArea.DS_PIPELINES);
  const { status: projectsAvailable } = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW);
  const { status: modelServingAvailable } = useIsAreaAvailable(SupportedArea.MODEL_SERVING);
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);
  const { status: fineTuningAvailable } = useIsAreaAvailable(SupportedArea.FINE_TUNING);

  const servingPlatformStatuses = useServingPlatformStatuses();
  const [selected, setSelected] = React.useState<string | undefined>();

  return React.useMemo(() => {
    const hasModelServingPlatforms =
      modelServingAvailable && servingPlatformStatuses.platformEnabledCount > 0;

    const cards = [];
    if (projectsAvailable) {
      cards.push(
        <AIFlowCard
          key="projects"
          data-testid="ai-flow-projects-card"
          title="Organize your work with projects"
          image={
            <ProjectIcon
              aria-hidden="true"
              style={{ color: sectionTypeBorderColor(SectionType.organize), width: 42, height: 42 }}
            />
          }
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
          image={
            <CreateAndTrainIcon
              aria-hidden="true"
              style={{ color: sectionTypeBorderColor(SectionType.training), width: 42, height: 42 }}
            />
          }
          sectionType={SectionType.training}
          selected={selected === 'train'}
          onSelect={() => setSelected((prev) => (prev === 'train' ? undefined : 'train'))}
        />,
      );
    }
    if (hasModelServingPlatforms || modelRegistryAvailable) {
      cards.push(
        <AIFlowCard
          key="models"
          data-testid="ai-flow-models-card"
          title="Manage models"
          image={
            <ModelIcon
              aria-hidden="true"
              style={{ color: sectionTypeBorderColor(SectionType.serving), width: 42, height: 42 }}
            />
          }
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
      <PageSection hasBodyWrapper={false} data-testid="home-page-ai-flows">
        <Stack hasGutter>
          <Content>
            <Content component="h1">Train, serve, monitor, and manage AI/ML models</Content>
          </Content>
          <AIFlowHint isDisplayed={fineTuningAvailable} />
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
    modelRegistryAvailable,
    pipelinesAvailable,
    projectsAvailable,
    selected,
    workbenchesAvailable,
    servingPlatformStatuses.platformEnabledCount,
    fineTuningAvailable,
  ]);
};
