import * as React from 'react';
import usePipelineNamespaceCR from './usePipelineNamespaceCR';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import { PipelineAPIs } from '../types';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';
import CreateCR from './CreateCR';
import useProject from '../../../pages/projects/useProject';

type PipelineContext = {
  hasCR: boolean;
  hostPath: string | null;
  namespace: string;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  hostPath: null,
  namespace: '',
});

type PipelineContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};

export const PipelineContextProvider: React.FC<PipelineContextProviderProps> = ({
  children,
  namespace,
}) => {
  const [, projectLoaded, projectLoadError] = useProject(namespace);
  const [pipelineNamespaceCR, crLoaded, crLoadError] = usePipelineNamespaceCR(namespace);
  // TODO: Do we need more than just knowing it exists?
  const isCRPresent = !!pipelineNamespaceCR;
  const [pipelineAPIRoute, routeLoaded, routeLoadError] = usePipelinesAPIRoute(
    isCRPresent,
    namespace,
  );

  if (projectLoadError) {
    return (
      <Bullseye>
        <Alert title="Project does not exist" variant="danger" isInline>
          {projectLoadError.message}
        </Alert>
      </Bullseye>
    );
  }

  if (crLoadError || routeLoadError) {
    return (
      <Bullseye>
        <Alert title="Pipelines load error" variant="danger" isInline>
          {crLoadError?.message || routeLoadError?.message}
        </Alert>
      </Bullseye>
    );
  }

  const isLoading = !projectLoaded || !crLoaded || (isCRPresent && !routeLoaded);
  if (isLoading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <PipelinesContext.Provider
      value={{
        hasCR: isCRPresent,
        hostPath: pipelineAPIRoute?.spec.host || null,
        namespace,
      }}
    >
      {children}
    </PipelinesContext.Provider>
  );
};

type UsePipelinesAPI = {
  isLoaded: boolean;
  loadingComponent: React.FC;
  api: PipelineAPIs;
};

export const usePipelinesAPI = (): UsePipelinesAPI => {
  const { hasCR, hostPath, namespace } = React.useContext(PipelinesContext);

  console.debug('usePipelinesAPI on', hostPath);

  return {
    isLoaded: !!hostPath,
    loadingComponent: () =>
      !hasCR || !hostPath ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : (
        <CreateCR namespace={namespace} />
      ),
    api: {
      // TODO: apis!
      // eg uploadPipeline: (content: string) => uploadPipeline(hostPath, content),
    },
  };
};
