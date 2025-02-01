import * as React from 'react';
import { Button, Flex, FlexItem, Tooltip, Truncate } from '@patternfly/react-core';
import {
  t_global_text_color_regular as RegularColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_text_color_status_warning_default as WarningColor,
  t_global_spacer_xs as ExtraSmallSpacerSize,
} from '@patternfly/react-tokens';
import { useNavigate } from 'react-router-dom';
import { EventStatus, NotebookStatus } from '~/types';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { useNotebookStatus } from '~/utilities/notebookControllerUtils';
import StartNotebookModal from '~/concepts/notebooks/StartNotebookModal';
import NotebookStatusLabel from '~/concepts/notebooks/NotebookStatusLabel';
import { NotebookState } from './types';

type NotebookStateStatusProps = {
  notebookState: NotebookState;
  stopNotebook: () => void;
  startNotebook: () => void;
  isVertical?: boolean;
};

const getNotebookStatusStyles = (notebookStatus?: NotebookStatus | null, isStarting?: boolean) => ({
  color:
    notebookStatus?.currentStatus === EventStatus.ERROR
      ? DangerColor.var
      : notebookStatus?.currentStatus === EventStatus.WARNING
      ? WarningColor.var
      : RegularColor.var,
  textDecoration:
    isStarting ||
    notebookStatus?.currentStatus === EventStatus.ERROR ||
    notebookStatus?.currentStatus === EventStatus.WARNING
      ? 'underline dashed'
      : undefined,
  textUnderlineOffset: ExtraSmallSpacerSize.var,
});

const NotebookStateStatus: React.FC<NotebookStateStatusProps> = ({
  notebookState,
  stopNotebook,
  startNotebook,
  isVertical = true,
}) => {
  const navigate = useNavigate();
  const { notebook, isStarting, isRunning, isStopping, runningPodUid } = notebookState;
  const [unstableNotebookStatus, events] = useNotebookStatus(
    isStarting,
    notebook,
    isRunning,
    runningPodUid,
  );
  const notebookStatus = useDeepCompareMemoize(unstableNotebookStatus);
  const isError = notebookStatus?.currentStatus === EventStatus.ERROR;
  const isStopped = !isError && !isRunning && !isStarting && !isStopping;
  const [isStartModalOpen, setStartModalOpen] = React.useState(false);

  const renderContent = () => {
    const StatusLabel = (
      <NotebookStatusLabel
        isCompact
        isStarting={isStarting}
        isRunning={isRunning}
        isStopping={isStopping}
        notebookStatus={notebookStatus}
      />
    );

    return (
      <Button variant="link" isInline onClick={() => setStartModalOpen(true)}>
        <Flex
          direction={{ default: isVertical ? 'column' : 'row' }}
          gap={{ default: isVertical ? 'gapXs' : 'gapMd' }}
        >
          <FlexItem>
            {notebookStatus?.currentStatus === EventStatus.ERROR ? (
              <Tooltip content={notebookStatus.currentEvent}>{StatusLabel}</Tooltip>
            ) : (
              StatusLabel
            )}
          </FlexItem>
          {isStarting ? (
            <FlexItem>
              <Truncate
                content={notebookStatus?.currentEvent || 'Waiting for server request to start...'}
                style={getNotebookStatusStyles(notebookStatus, isStarting)}
              />
            </FlexItem>
          ) : null}
        </Flex>
      </Button>
    );
  };

  return (
    <>
      {renderContent()}
      {isStartModalOpen ? (
        <StartNotebookModal
          notebook={notebook}
          isStarting={isStarting}
          isRunning={isRunning}
          isStopping={isStopping}
          notebookStatus={notebookStatus}
          events={events}
          onClose={(stopped) => {
            if (stopped) {
              stopNotebook();
            }
            setStartModalOpen(false);
          }}
          buttons={
            <>
              {isStopped ? (
                <Button
                  data-id="start-spawn"
                  key="start"
                  variant="primary"
                  onClick={() => startNotebook()}
                >
                  Start workbench
                </Button>
              ) : (
                <Button
                  data-id="close-spawn"
                  key="stop"
                  variant="primary"
                  onClick={() => stopNotebook()}
                >
                  Stop workbench
                </Button>
              )}
              <Button
                data-id="edit-workbench"
                key="edit"
                variant="link"
                onClick={() => {
                  navigate(
                    `/projects/${notebook!.metadata.namespace}/spawner/${notebook!.metadata.name}`,
                  );
                }}
              >
                Edit workbench
              </Button>
            </>
          }
        />
      ) : null}
    </>
  );
};

export default NotebookStateStatus;
