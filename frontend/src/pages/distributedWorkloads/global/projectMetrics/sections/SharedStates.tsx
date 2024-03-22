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
import { CubesIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';

export const NoWorkloadState: React.FC<{ title?: string; subTitle?: string; warn?: boolean }> = ({
  title = 'No distributed workloads',
  subTitle = 'No distributed workloads in the selected project are currently consuming resources.',
  warn = false,
}) => (
  <CardBody>
    <EmptyState>
      <EmptyStateHeader
        titleText={title}
        headingLevel="h4"
        icon={<EmptyStateIcon icon={warn ? ExclamationTriangleIcon : CubesIcon} />}
      />
      <EmptyStateBody>{subTitle}</EmptyStateBody>
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
