import * as React from 'react';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import OverviewCard from '#~/pages/projects/screens/detail/overview/components/OverviewCard';

type PipelinesOverviewCardProps = {
  children: React.ReactNode;
  pipelinesCount: number;
};

const PipelinesOverviewCard: React.FC<PipelinesOverviewCardProps> = ({
  children,
  pipelinesCount,
}) => (
  <OverviewCard
    id="Pipelines"
    objectType={ProjectObjectType.pipeline}
    sectionType={pipelinesCount ? SectionType.training : SectionType.organize}
    title="Pipelines"
    popoverHeaderContent="About pipelines"
    popoverBodyContent="Pipelines are platforms for building and deploying portable and scalable machine-learning (ML) workflows. You can import a pipeline or create one in a workbench."
    data-testid="section-pipelines"
  >
    {children}
  </OverviewCard>
);
export default PipelinesOverviewCard;
