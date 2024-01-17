import * as React from 'react';
import { Skeleton } from '@patternfly/react-core';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import { useAppSelector } from '~/redux/hooks';
import { NotebookState } from './types';
import NotebookRouteLink from './NotebookRouteLink';
import NotebookStatusToggle from './NotebookStatusToggle';

import './ListNotebookState.scss';

type ListNotebookStateProps = {
  notebookStates: NotebookState[];
  loaded: boolean;
  error?: Error;
  namespace: string;
};

const ListNotebookState: React.FC<ListNotebookStateProps> = ({
  notebookStates,
  loaded,
  error,
  namespace,
}) => {
  const alternateUI = useAppSelector((state) => state.alternateUI);

  if (!loaded) {
    return <Skeleton />;
  }

  if (error) {
    return <>{error.message}</>;
  }

  if (notebookStates.length === 0) {
    return <>-</>;
  }

  return (
    <CanEnableElyraPipelinesCheck namespace={namespace}>
      {(canEnablePipelines) => (
        <div className="odh-list-notebook-state">
          {notebookStates.map((state) =>
            alternateUI ? (
              <React.Fragment key={state.notebook.metadata.name}>
                <NotebookRouteLink
                  className="odh-list-notebook-state__notebook"
                  notebook={state.notebook}
                  isRunning={state.isRunning}
                />
                <NotebookStatusToggle
                  notebookState={state}
                  doListen
                  enablePipelines={canEnablePipelines}
                />
              </React.Fragment>
            ) : (
              <React.Fragment key={state.notebook.metadata.name}>
                <NotebookStatusToggle
                  notebookState={state}
                  doListen
                  enablePipelines={canEnablePipelines}
                />
                <NotebookRouteLink notebook={state.notebook} isRunning={state.isRunning} />
              </React.Fragment>
            ),
          )}
        </div>
      )}
    </CanEnableElyraPipelinesCheck>
  );
};

export default ListNotebookState;
