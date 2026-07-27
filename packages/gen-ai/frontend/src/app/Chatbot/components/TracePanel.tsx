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
  workspace?: string;
}

class MlflowErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <MlflowUnavailable />;
    }
    return this.props.children;
  }
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
    .then((mod) => (typeof mod?.default === 'function' ? mod : { default: MlflowUnavailable }))
    .catch(() => ({ default: MlflowUnavailable })),
);

interface TracePanelProps {
  isOpen: boolean;
  traceId: string;
  workspace?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const TracePanel: React.FC<TracePanelProps> = ({
  isOpen,
  traceId,
  workspace,
  onClose,
  children,
}) => {
  const panelContent = (
    <DrawerPanelContent isResizable defaultSize="75%" minSize="30%" data-testid="trace-panel">
      <DrawerHead>
        <Title headingLevel="h3" size="lg">
          Trace Details
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <div className="pf-v6-u-h-100 pf-v6-u-overflow-auto">
        <MlflowErrorBoundary key={traceId}>
          <React.Suspense
            fallback={
              <Bullseye>
                <Spinner />
              </Bullseye>
            }
          >
            <MlflowTraceDetail key={traceId} traceId={traceId} workspace={workspace} />
          </React.Suspense>
        </MlflowErrorBoundary>
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
