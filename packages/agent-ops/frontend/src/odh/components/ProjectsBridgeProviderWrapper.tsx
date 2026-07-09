import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import * as React from 'react';
import type { AgentOpsProjectRef, ProjectsBridgeData } from '~/odh/extension-points';
import { isProjectsBridgeProviderExtension } from '~/odh/extension-points';
import { ProjectsBridgeContext } from '~/odh/context/ProjectsBridgeContext';
import { logAgentOpsProjectsLoadError } from '~/app/hooks/useAgentOpsProjectNamespaces';

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
  onError: (error: Error) => void;
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

  componentDidCatch(error: Error): void {
    this.props.onError(error);
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
  const [bridgeLoadError, setBridgeLoadError] = React.useState<Error | null>(null);
  const [errorBoundaryKey, setErrorBoundaryKey] = React.useState(0);

  const handleBridgeData = React.useCallback((data: ProjectsBridgeData | null) => {
    setBridgeData(data);
    if (data) {
      setBridgeLoadError(null);
    }
  }, []);

  const contextValue = React.useMemo(() => {
    if (bridgeData) {
      return { ...bridgeData, bridgeActive: true as const };
    }
    if (bridgeLoadError) {
      return { ...INACTIVE_BRIDGE_CONTEXT, loadError: bridgeLoadError };
    }
    return INACTIVE_BRIDGE_CONTEXT;
  }, [bridgeData, bridgeLoadError]);

  const DataProvider =
    loaded && extensions.length > 0 ? extensions[0].properties.component.default : null;
  const hadDataProviderRef = React.useRef(false);

  React.useEffect(() => {
    if (!DataProvider) {
      setBridgeData(null);
      setBridgeLoadError(null);
      hadDataProviderRef.current = false;
      return;
    }
    if (hadDataProviderRef.current) {
      setErrorBoundaryKey((key) => key + 1);
    }
    hadDataProviderRef.current = true;
  }, [DataProvider]);

  const handleBridgeError = React.useCallback((error: Error) => {
    logAgentOpsProjectsLoadError(error);
    setBridgeData(null);
    setBridgeLoadError(error);
  }, []);

  return (
    <ProjectsBridgeContext.Provider value={contextValue}>
      {DataProvider ? (
        <BridgeProviderErrorBoundary key={errorBoundaryKey} onError={handleBridgeError}>
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
