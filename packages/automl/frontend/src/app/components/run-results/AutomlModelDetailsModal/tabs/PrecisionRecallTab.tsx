import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from '@patternfly/react-core';
import { ChartLineIcon } from '@patternfly/react-icons';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import PrecisionRecallChart, {
  getApValue,
} from '~/app/components/run-results/AutomlModelDetailsModal/components/PrecisionRecallChart';

const PrecisionRecallTab: React.FC<TabContentProps> = ({ curves, isArtifactsLoading }) => {
  if (isArtifactsLoading) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label="Loading precision-recall curve data" />
      </Bullseye>
    );
  }

  if (!curves) {
    return (
      <EmptyState
        data-testid="precision-recall-no-data"
        variant={EmptyStateVariant.sm}
        icon={ChartLineIcon}
        titleText="Precision-recall curve unavailable"
        headingLevel="h4"
      >
        <EmptyStateBody>
          This data may be generated if the training run is submitted again.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="automl-roc-curve-section">
      <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className="pf-v6-u-mb-md">
        <FlexItem>
          <Label>{`Average precision = ${getApValue(curves).toFixed(3)}`}</Label>
        </FlexItem>
      </Flex>
      <PrecisionRecallChart prData={curves} />
    </div>
  );
};

export default PrecisionRecallTab;
