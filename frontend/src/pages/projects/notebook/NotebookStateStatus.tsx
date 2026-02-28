import * as React from 'react';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import {
  t_global_text_color_regular as RegularColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_text_color_status_warning_default as WarningColor,
} from '@patternfly/react-tokens';
import { EventStatus, NotebookStatus } from '#~/types';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { useNotebookStatus } from '#~/utilities/notebookControllerUtils';
import StartNotebookModal from '#~/concepts/notebooks/StartNotebookModal';
import NotebookStatusLabel from '#~/concepts/notebooks/NotebookStatusLabel';
import {
  KUEUE_STATUSES_OVERRIDE_WORKBENCH,
  type KueueWorkloadStatusWithMessage,
} from '#~/concepts/kueue/types';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import UnderlinedTruncateButton from '#~/components/UnderlinedTruncateButton';
import { NotebookState } from './types';

type NotebookStateStatusProps = {
  notebookState: NotebookState;
  stopNotebook: () => void;
  startNotebook: () => void;
  isVertical?: boolean;
};
type GetStatusSubtitleParams = {
  isStarting: boolean;
  isStopping: boolean;
  notebookStatus: NotebookStatus | null;
  kueueStatus: KueueWorkloadStatusWithMessage | null;
};

const getNotebookStatusColor = (notebookStatus?: NotebookStatus | null) =>
  notebookStatus?.currentStatus === EventStatus.ERROR
    ? DangerColor.var
    : notebookStatus?.currentStatus === EventStatus.WARNING
    ? WarningColor.var
    : RegularColor.var;

const getNotebookStatusTextDecoration = (
  notebookStatus?: NotebookStatus | null,
  isStarting?: boolean,
) =>
  isStarting ||
  notebookStatus?.currentStatus === EventStatus.ERROR ||
  notebookStatus?.currentStatus === EventStatus.WARNING
    ? undefined
    : 'none';

export const getStatusSubtitle = ({
  isStarting,
  isStopping,
  notebookStatus,
  kueueStatus,
}: GetStatusSubtitleParams): string | null => {
  if (isStopping) {
    return null;
  }
  if (kueueStatus?.status && KUEUE_STATUSES_OVERRIDE_WORKBENCH.includes(kueueStatus.status)) {
    return kueueStatus.message?.trim() || kueueStatus.status;
  }
  if (isStarting) {
    return notebookStatus?.currentEvent || 'Waiting for server request to start...';
  }
  return null;
};

const NotebookStateStatus: React.FC<NotebookStateStatusProps> = ({
  notebookState,
  stopNotebook,
  startNotebook,
  isVertical = true,
}) => {
  const { kueueStatusByNotebookName } = React.useContext(ProjectDetailsContext);
  const { notebook, isStarting, isRunning, isStopping, runningPodUid } = notebookState;
  const kueueStatus = kueueStatusByNotebookName[notebook.metadata.name] ?? null;
  const editWorkbenchHref =
    notebook.metadata.namespace && notebook.metadata.name
      ? `/projects/${notebook.metadata.namespace}/spawner/${notebook.metadata.name}`
      : undefined;
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
  const statusSubtitle = getStatusSubtitle({
    isStarting,
    isStopping,
    notebookStatus,
    kueueStatus,
  });

  return (
    <>
      <Flex
        direction={{ default: isVertical ? 'column' : 'row' }}
        gap={{ default: isVertical ? 'gapXs' : 'gapMd' }}
        onClick={() => setStartModalOpen(true)}
      >
        <FlexItem>
          <NotebookStatusLabel
            isCompact
            isStarting={isStarting}
            isRunning={isRunning}
            isStopping={isStopping}
            notebookStatus={notebookStatus}
            kueueStatus={kueueStatus}
            onClick={() => setStartModalOpen(true)}
          />
        </FlexItem>
        {statusSubtitle != null ? (
          <UnderlinedTruncateButton
            content={statusSubtitle}
            color={getNotebookStatusColor(notebookStatus)}
            textDecoration={getNotebookStatusTextDecoration(notebookStatus, isStarting)}
            onClick={() => setStartModalOpen(true)}
          />
        ) : null}
      </Flex>
      {isStartModalOpen ? (
        <StartNotebookModal
          notebook={notebook}
          isStarting={isStarting}
          isRunning={isRunning}
          isStopping={isStopping}
          notebookStatus={notebookStatus}
          events={events}
          kueueStatus={kueueStatus}
          onClose={() => {
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
                component={editWorkbenchHref ? 'a' : 'button'}
                href={editWorkbenchHref}
                isAriaDisabled={!notebook.metadata.namespace || !notebook.metadata.name}
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
