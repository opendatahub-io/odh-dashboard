import React from 'react';
import {
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import {
  EMPTY_BIAS_CHART_SELECTION_DESC,
  EMPTY_BIAS_CHART_SELECTION_TITLE,
} from '~/pages/modelServing/screens/metrics/const';

const EmptyBiasChartSelectionCard = () => (
  <Card>
    <CardBody>
      <EmptyState>
        <EmptyStateIcon icon={SearchIcon} />
        <Title headingLevel="h2" size="lg">
          {EMPTY_BIAS_CHART_SELECTION_TITLE}
        </Title>
        <EmptyStateBody>{EMPTY_BIAS_CHART_SELECTION_DESC}</EmptyStateBody>
      </EmptyState>
    </CardBody>
  </Card>
);

export default EmptyBiasChartSelectionCard;
