import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import * as React from 'react';
import type { AgentOpsProjectRef, ProjectsBridgeData } from '~/odh/extension-points';
import { isProjectsBridgeProviderExtension } from '~/odh/extension-points';
import { ProjectsBridgeContext } from '~/odh/context/ProjectsBridgeContext';

type ProjectsBridgeProviderWrapperProps = {
  children: React.ReactNode;
};

const EMPTY_BRIDGE_PROJECTS: AgentOpsProjectRef[] = [];

const INACTIVE_BRIDGE_CONTEXT = {
  bridgeActive: false as const,
  projects: EMPTY_BRIDGE_PROJECTS,
  preferredProject: null,
  updatePreferredProject: () => undefined,
  loaded: false,
  loadError: null,
};

type BridgeDataSyncProps = {
  data: ProjectsBridgeData;
  onBridgeData: (data: ProjectsBridgeData | null) => void;
};

const BridgeDataSync: React.FC<BridgeDataSyncProps> = ({ data, onBridgeData }) => {
  React.useEffect(() => {
    onBridgeData(data);
  }, [data, onBridgeData]);

  React.useEffect(
    () => () => {
      onBridgeData(null);
    },
    [onBridgeData],
  );

  return null;
};

type BridgeProviderErrorBoundaryProps = {
  onError: () => void;
  children: React.ReactNode;
};

type BridgeProviderErrorBoundaryState = {
  hasError: boolean;
};

class BridgeProviderErrorBoundary extends React.Component<
  BridgeProviderErrorBoundaryProps,
  BridgeProviderErrorBoundaryState
> {
  state: BridgeProviderErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): BridgeProviderErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const ProjectsBridgeProviderWrapper: React.FC<ProjectsBridgeProviderWrapperProps> = ({
  children,
}) => {
  const [extensions, loaded] = useResolvedExtensions(isProjectsBridgeProviderExtension);
  const [bridgeData, setBridgeData] = React.useState<ProjectsBridgeData | null>(null);

  const handleBridgeData = React.useCallback((data: ProjectsBridgeData | null) => {
    setBridgeData(data);
  }, []);

  const contextValue = React.useMemo(() => {
    if (bridgeData) {
      return { ...bridgeData, bridgeActive: true as const };
    }
    return INACTIVE_BRIDGE_CONTEXT;
  }, [bridgeData]);

  const DataProvider =
    loaded && extensions.length > 0 ? extensions[0].properties.component.default : null;

  React.useEffect(() => {
    if (!DataProvider) {
      setBridgeData(null);
    }
  }, [DataProvider]);

  const handleBridgeError = React.useCallback(() => {
    setBridgeData(null);
  }, []);

  return (
    <ProjectsBridgeContext.Provider value={contextValue}>
      {DataProvider ? (
        <BridgeProviderErrorBoundary onError={handleBridgeError}>
          <DataProvider>
            {(data: ProjectsBridgeData) => (
              <BridgeDataSync data={data} onBridgeData={handleBridgeData} />
            )}
          </DataProvider>
        </BridgeProviderErrorBoundary>
      ) : null}
      {children}
    </ProjectsBridgeContext.Provider>
  );
};

export default ProjectsBridgeProviderWrapper;
