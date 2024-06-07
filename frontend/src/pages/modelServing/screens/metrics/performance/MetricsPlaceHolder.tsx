import * as React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

type MetricsPlaceHolderProps = {
  title: string;
};
const MetricsPlaceHolder: React.FC<MetricsPlaceHolderProps> = ({ title }) => (
  <Card data-testid={`metrics-card-${title}`}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardBody style={{ height: 200, padding: 0 }}>
      <EmptyState>
        <EmptyStateIcon icon={CubesIcon} />
        <Title headingLevel="h4" size="lg" data-testid="metrics-chart-place-holder">
          Metrics coming soon
        </Title>
      </EmptyState>
    </CardBody>
  </Card>
);

export default MetricsPlaceHolder;
