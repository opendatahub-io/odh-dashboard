import * as React from 'react';
import {
  Card,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  CardBody,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';

export const NoWorkloadState: React.FC = () => (
  <CardBody>
    <EmptyState>
      <EmptyStateHeader
        titleText="No distributed workloads"
        headingLevel="h4"
        icon={<EmptyStateIcon icon={CubesIcon} />}
      />
      <EmptyStateBody>
        Select another project or create a distributed workload in the selected project.
      </EmptyStateBody>
    </EmptyState>
  </CardBody>
);

export const ErrorWorkloadState: React.FC<{ message: string }> = ({ message }) => (
  <CardBody>
    <EmptyStateErrorMessage title="Error loading workloads" bodyText={message} />
  </CardBody>
);

export const LoadingWorkloadState: React.FC = () => (
  <Card isFullHeight>
    <Bullseye style={{ minHeight: 150 }}>
      <Spinner />
    </Bullseye>
  </Card>
);
