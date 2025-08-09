import { Flex, FlexItem, PageSection, Title } from '@patternfly/react-core';
import React from 'react';
import { FeatureView } from '#~/pages/featureStore/types/featureView.ts';
import FeatureViewSchemaTable from './FeatureViewSchemaTable';

type FeatureViewLineageTabProps = {
  featureView: FeatureView;
};

const FeatureViewLineageTab: React.FC<FeatureViewLineageTabProps> = ({ featureView }) => (
  <PageSection
    hasBodyWrapper={false}
    isFilled
    padding={{ default: 'noPadding' }}
    isWidthLimited
    style={{ maxWidth: '75%' }}
    className="pf-v6-u-mt-xl"
  >
    <Flex direction={{ default: 'column' }} spacer={{ default: 'spacer2xl' }}>
      <FlexItem>
        <Title headingLevel="h3" data-testid="feature-view-lineage" style={{ margin: '1em 0' }}>
          Schema
        </Title>
      </FlexItem>
      <FlexItem>
        <FeatureViewSchemaTable featureView={featureView} />
      </FlexItem>
    </Flex>
  </PageSection>
);

export default FeatureViewLineageTab;
