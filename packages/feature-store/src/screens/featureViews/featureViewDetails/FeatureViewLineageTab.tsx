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
      <FlexItem style={{ height: '50vh' }}>
        <Title headingLevel="h3" style={{ margin: '1em 0' }}>
          Lineage
        </Title>
        <FeatureViewLineage featureView={featureView} />
      </FlexItem>
      <FlexItem>
        <Title headingLevel="h3" data-testid="feature-view-lineage" style={{ margin: '1em 0' }}>
          Schema
        </Title>
        <FeatureViewSchemaTable featureView={featureView} />
      </FlexItem>
    </Flex>
  </PageSection>
);

export default FeatureViewLineageTab;
