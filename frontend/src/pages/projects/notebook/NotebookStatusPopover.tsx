import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import StartNotebookModal from './StartNotebookModal';
import { NotebookState } from './types';
import { getEventFullMessage, useNotebookStatus } from './utils';
import { useDeepCompareMemoize } from '../../../utilities/useDeepCompareMemoize';

type NotebookStatusPopoverProps = {
  isVisible: boolean;
  onClose: () => void;
  notebookState: NotebookState;
  stopNotebook: () => void;
  children: React.ReactNode;
};

const NotebookStatusPopover: React.FC<NotebookStatusPopoverProps> = ({
  children,
  onClose,
  isVisible,
  notebookState,
  stopNotebook,
}) => {
  const { notebook, runningPodUid, isStarting } = notebookState;
  const [isStartModalOpen, setStartModalOpen] = React.useState(false);
  const [unstableNotebookStatus, events] = useNotebookStatus(notebook, runningPodUid, isStarting);
  const notebookStatus = useDeepCompareMemoize(unstableNotebookStatus);

  return (
    <>
      <Popover
        removeFindDomNode
        shouldClose={onClose}
        isVisible={isVisible}
        headerContent="Notebook status"
        bodyContent={
          <>
            {events[events.length - 1]
              ? getEventFullMessage(events[events.length - 1])
              : 'Waiting for notebook to start...'}
          </>
        }
        footerContent={
          <Button
            variant="link"
            isInline
            onClick={() => {
              setStartModalOpen(true);
              onClose();
            }}
          >
            Event log
          </Button>
        }
      >
        <>{children}</>
      </Popover>
      <StartNotebookModal
        isOpen={isStartModalOpen}
        notebookState={notebookState}
        notebookStatus={notebookStatus}
        events={events}
        onClose={(stopped) => {
          if (stopped) {
            stopNotebook();
          }
          setStartModalOpen(false);
        }}
      />
    </>
  );
};

export default NotebookStatusPopover;
