import React from 'react';
import {
  Bullseye,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { loadRemote } from '@module-federation/runtime';

interface MlflowTraceDetailWrapperProps {
  traceId: string;
  experimentId: string;
  workspace?: string;
}

const MlflowUnavailable: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={ExclamationTriangleIcon}
    titleText="MLflow is currently unavailable"
    variant={EmptyStateVariant.lg}
    data-testid="mlflow-trace-unavailable"
  >
    <EmptyStateBody>
      The MLflow trace view could not be loaded. Please check that MLflow is deployed and running,
      then try again.
    </EmptyStateBody>
  </EmptyState>
);

const MlflowTraceDetail = React.lazy(() =>
  loadRemote<{ default: React.ComponentType<MlflowTraceDetailWrapperProps> }>(
    'mlflowEmbedded/MlflowTraceDetailWrapper',
  )
    .then((mod) => mod ?? { default: MlflowUnavailable })
    .catch(() => ({ default: MlflowUnavailable })),
);

interface TracePanelProps {
  isOpen: boolean;
  traceId: string;
  experimentId: string;
  workspace?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const TracePanel: React.FC<TracePanelProps> = ({
  isOpen,
  traceId,
  experimentId,
  workspace,
  onClose,
  children,
}) => {
  const panelContent = (
    <DrawerPanelContent widths={{ default: 'width_75' }} data-testid="trace-panel">
      <DrawerHead>
        <Title headingLevel="h3" size="lg">
          Trace Details
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <div style={{ height: '100%', overflow: 'auto' }}>
        <React.Suspense
          fallback={
            <Bullseye>
              <Spinner />
            </Bullseye>
          }
        >
          <MlflowTraceDetail
            key={traceId}
            traceId={traceId}
            experimentId={experimentId}
            workspace={workspace}
          />
        </React.Suspense>
      </div>
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isOpen} position="end">
      <DrawerContent panelContent={isOpen ? panelContent : undefined}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default TracePanel;
