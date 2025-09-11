import { Flex, FlexItem, PageSection, Title } from '@patternfly/react-core';
import React from 'react';
import FeatureViewSchemaTable from './FeatureViewSchemaTable';
import FeatureViewLineage from './FeatureViewLineage';
import { FeatureView } from '../../../types/featureView';

type FeatureViewLineageTabProps = {
  featureView: FeatureView;
};

const FeatureViewLineageTab: React.FC<FeatureViewLineageTabProps> = ({ featureView }) => (
  <PageSection hasBodyWrapper={false} isFilled padding={{ default: 'noPadding' }} isWidthLimited>
    <Flex direction={{ default: 'column' }} spacer={{ default: 'spacer2xl' }}>
      <FlexItem style={{ height: '65vh', minHeight: '400px', overflow: 'hidden' }}>
        <Title headingLevel="h3" style={{ margin: '1rem 0' }}>
          Lineage
        </Title>
        <div style={{ height: 'calc(100% - 3rem)', overflow: 'hidden' }}>
          <FeatureViewLineage featureView={featureView} />
        </div>
      </FlexItem>
      <FlexItem>
        <Title headingLevel="h3" data-testid="feature-view-lineage" style={{ margin: '1rem 0' }}>
          Schema
        </Title>
        <FeatureViewSchemaTable featureView={featureView} />
      </FlexItem>
    </Flex>
  </PageSection>
);

export default FeatureViewLineageTab;
