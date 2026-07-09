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
import ROCCurveChart, {
  getAucValue,
} from '~/app/components/run-results/AutomlModelDetailsModal/components/ROCCurveChart';

const ROCCurveTab: React.FC<TabContentProps> = ({ curves, isArtifactsLoading }) => {
  if (isArtifactsLoading) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label="Loading ROC curve data" />
      </Bullseye>
    );
  }

  if (!curves) {
    return (
      <EmptyState
        data-testid="roc-curve-no-data"
        variant={EmptyStateVariant.sm}
        icon={ChartLineIcon}
        titleText="ROC curve unavailable"
        headingLevel="h4"
      >
        <EmptyStateBody>
          This data may be generated if the training run is submitted again.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="automl-roc-curve-section" data-testid="roc-curve-section">
      <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className="pf-v6-u-mb-md">
        <FlexItem>
          <Label>{`Area under curve = ${getAucValue(curves).toFixed(3)}`}</Label>
        </FlexItem>
      </Flex>
      <ROCCurveChart rocCurveData={curves} />
    </div>
  );
};

export default ROCCurveTab;
