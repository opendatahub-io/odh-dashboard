import React from 'react';
import {
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import {
  EMPTY_BIAS_CHART_SELECTION_DESC,
  EMPTY_BIAS_CHART_SELECTION_TITLE,
} from '~/pages/modelServing/screens/metrics/const';

const EmptyBiasChartSelectionCard: React.FC = () => (
  <Card>
    <CardBody>
      <EmptyState>
        <EmptyStateHeader
          titleText={<>{EMPTY_BIAS_CHART_SELECTION_TITLE}</>}
          icon={<EmptyStateIcon icon={SearchIcon} />}
          headingLevel="h2"
        />
        <EmptyStateBody>{EMPTY_BIAS_CHART_SELECTION_DESC}</EmptyStateBody>
      </EmptyState>
    </CardBody>
  </Card>
);

export default EmptyBiasChartSelectionCard;
