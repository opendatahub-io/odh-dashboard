import React from 'react';
import { DeploymentMode, useModularArchContext } from 'mod-arch-core';

interface SafeNavigationBlockerProps {
  hasUnsavedChanges: boolean;
  onDiscardEditsClick?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class NavigationBlockerErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const LazyNavigationBlockerModal = React.lazy(() =>
  import('@odh-dashboard/internal/components/NavigationBlockerModal').then((module) => ({
    default: module.default,
  })),
);

const SafeNavigationBlocker: React.FC<SafeNavigationBlockerProps> = (props) => {
  const { config } = useModularArchContext();

  if (config.deploymentMode === DeploymentMode.Standalone) {
    return null;
  }

  return (
    <NavigationBlockerErrorBoundary>
      <React.Suspense fallback={null}>
        <LazyNavigationBlockerModal {...props} />
      </React.Suspense>
    </NavigationBlockerErrorBoundary>
  );
};

export default SafeNavigationBlocker;
