import * as React from 'react';
import { Button, Icon, Popover, Text, Tooltip } from '@patternfly/react-core';
import StartNotebookModal from './StartNotebookModal';
import { NotebookState } from './types';
import { getEventFullMessage, useNotebookStatus } from './utils';
import { useDeepCompareMemoize } from '../../../utilities/useDeepCompareMemoize';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { EventStatus } from '../../../types';

import './NotebookStatusText.scss';

type NotebookStatusTextProps = {
  notebookState: NotebookState;
  stopNotebook: () => void;
  labelText: string;
};

const NotebookStatusText: React.FC<NotebookStatusTextProps> = ({
  notebookState,
  stopNotebook,
  labelText,
}) => {
  const { notebook, runningPodUid, isStarting } = notebookState;
  const [isStartModalOpen, setStartModalOpen] = React.useState(false);
  const [unstableNotebookStatus, events] = useNotebookStatus(notebook, runningPodUid, isStarting);
  const notebookStatus = useDeepCompareMemoize(unstableNotebookStatus);
  const [isPopoverVisible, setPopoverVisible] = React.useState(false);

  return (
    <>
      <Popover
        removeFindDomNode
        shouldClose={() => setPopoverVisible(false)}
        isVisible={isPopoverVisible}
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
              setPopoverVisible(false);
              setStartModalOpen(true);
            }}
          >
            Event log
          </Button>
        }
      >
        <Text
          onClick={() => {
            if (isStarting) {
              setPopoverVisible((visible) => !visible);
            }
          }}
          className={isStarting ? 'odh-notebook-status-popover__starting-text' : undefined}
        >
          {labelText}{' '}
          {notebookStatus?.currentStatus === EventStatus.ERROR && (
            <Tooltip removeFindDomNode content={notebookStatus.currentEvent}>
              <Icon isInline status="danger">
                <ExclamationCircleIcon />
              </Icon>
            </Tooltip>
          )}
        </Text>
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

export default NotebookStatusText;
