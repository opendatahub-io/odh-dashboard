import * as React from 'react';
import { CardBody, FlexItem, Content } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '@odh-dashboard/internal/concepts/design/utils';
import OverviewCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/components/OverviewCard';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';

const EmptyModelServingPlatformSection: React.FC = () => (
  <CollapsibleSection title="Serve models" data-testid="section-model-server">
    <FlexItem data-testid="no-model-serving-platform-selected">
      <OverviewCard
        objectType={ProjectObjectType.modelServer}
        sectionType={SectionType.setup}
        title="No model serving platform selected"
      >
        <CardBody>
          <Content>
            <Content component="small">
              To enable model serving, an administrator must first select a model serving platform
              in the cluster settings
            </Content>
          </Content>
        </CardBody>
      </OverviewCard>
    </FlexItem>
  </CollapsibleSection>
);

export default EmptyModelServingPlatformSection;
