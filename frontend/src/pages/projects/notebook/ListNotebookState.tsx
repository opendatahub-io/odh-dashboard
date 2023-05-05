import * as React from 'react';
import { Flex, FlexItem, Skeleton } from '@patternfly/react-core';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import { NotebookState } from './types';
import NotebookRouteLink from './NotebookRouteLink';
import NotebookStatusToggle from './NotebookStatusToggle';

/** Keep the size of each notebook state the same so they can stay horizontally aligned */
const EQUAL_SIZE_STYLE = { height: 'var(--pf-c-switch--Height)' };

type ListNotebookStateProps = {
  notebookStates: NotebookState[];
  loaded: boolean;
  error?: Error;
  show: 'notebook' | 'status';
  namespace: string;
};

const ListNotebookState: React.FC<ListNotebookStateProps> = ({
  notebookStates,
  loaded,
  error,
  show,
  namespace,
}) => {
  if (!loaded) {
    return <Skeleton />;
  }

  if (error) {
    return <>{error.message}</>;
  }

  if (notebookStates.length === 0) {
    return <>-</>;
  }

  const notebookState = (state: NotebookState, canEnablePipelines: boolean) => {
    switch (show) {
      case 'notebook':
        return <NotebookRouteLink notebook={state.notebook} isRunning={state.isRunning} />;
      case 'status':
        return (
          <NotebookStatusToggle
            notebookState={state}
            doListen
            enablePipelines={canEnablePipelines}
          />
        );
      default:
        /* eslint-disable-next-line no-console */
        console.error('Unknown show type', show);
        return <>-</>;
    }
  };

  return (
    <Flex direction={{ default: 'column' }}>
      <CanEnableElyraPipelinesCheck namespace={namespace}>
        {(canEnablePipelines) =>
          notebookStates.map((state) => (
            <FlexItem key={state.notebook.metadata.name} style={EQUAL_SIZE_STYLE}>
              {notebookState(state, canEnablePipelines)}
            </FlexItem>
          ))
        }
      </CanEnableElyraPipelinesCheck>
    </Flex>
  );
};

export default ListNotebookState;
