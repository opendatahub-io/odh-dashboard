import * as React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  Bullseye,
  Spinner,
  EmptyStateHeader,
} from '@patternfly/react-core';
import NoPipelineServer from './NoPipelineServer';
import { usePipelinesAPI } from './context';

type EnsureCompatiblePipelineServerProps = {
  children: React.ReactNode;
};

const EnsureCompatiblePipelineServer: React.FC<EnsureCompatiblePipelineServerProps> = ({
  children,
}) => {
  const { pipelinesServer } = usePipelinesAPI();

  if (pipelinesServer.initializing) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!pipelinesServer.installed) {
    return <NoPipelineServer variant="secondary" />;
  }

  if (!pipelinesServer.compatible) {
    return (
      <Bullseye data-testid="incompatible-pipelines-server">
        <EmptyState variant={EmptyStateVariant.lg}>
          <EmptyStateHeader>
            This data science project contains an unsupported version of Data Science Pipelines.
            Delete the pipeline server and recreate it.
          </EmptyStateHeader>
        </EmptyState>
      </Bullseye>
    );
  }

  return <>{children}</>;
};

export default EnsureCompatiblePipelineServer;
