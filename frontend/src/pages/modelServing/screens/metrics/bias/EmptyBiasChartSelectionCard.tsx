import React, { ReactElement } from 'react';
import { Card, CardBody, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import {
  EMPTY_BIAS_CHART_SELECTION_DESC,
  EMPTY_BIAS_CHART_SELECTION_TITLE,
} from '#~/pages/modelServing/screens/metrics/const';

const EmptyBiasChartSelectionCard = (): ReactElement => (
  <Card>
    <CardBody>
      <EmptyState headingLevel="h2" icon={SearchIcon} titleText={EMPTY_BIAS_CHART_SELECTION_TITLE}>
        <EmptyStateBody>{EMPTY_BIAS_CHART_SELECTION_DESC}</EmptyStateBody>
      </EmptyState>
    </CardBody>
  </Card>
);

export default EmptyBiasChartSelectionCard;
