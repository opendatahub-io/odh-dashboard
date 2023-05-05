import * as React from 'react';
import {
  EmptyState,
  EmptyStateIcon,
  Title,
  EmptyStateBody,
  EmptyStateVariant,
  Bullseye,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

const PipelinesDependencyMissing: React.FC = () => (
  <Bullseye>
    <EmptyState variant={EmptyStateVariant.large}>
      <EmptyStateIcon color="var(--pf-global--danger-color--100)" icon={ExclamationCircleIcon} />
      <Title headingLevel="h2" size="2xl">
        Operator dependency is missing
      </Title>
      <EmptyStateBody>
        In order to use Data Science Pipelines it has a hard dependency on the Red Hat OpenShift
        Pipelines Operator which is not currently installed.
      </EmptyStateBody>
    </EmptyState>
  </Bullseye>
);

export default PipelinesDependencyMissing;
