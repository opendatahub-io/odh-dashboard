import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import {
  t_global_text_color_regular as RegularColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_text_color_status_warning_default as WarningColor,
} from '@patternfly/react-tokens';
import { useNavigate } from 'react-router-dom';
import { EventStatus, NotebookStatus } from '#~/types';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { useNotebookStatus } from '#~/utilities/notebookControllerUtils';
import StartNotebookModal from '#~/concepts/notebooks/StartNotebookModal';
import { ButtonAction } from '#~/components/modals/GenericModalFooter';
import NotebookStatusLabel from '#~/concepts/notebooks/NotebookStatusLabel';
import UnderlinedTruncateButton from '#~/components/UnderlinedTruncateButton';
import { NotebookState } from './types';

type NotebookStateStatusProps = {
  notebookState: NotebookState;
  stopNotebook: () => void;
  startNotebook: () => void;
  isVertical?: boolean;
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

  const makeButtonActions = (): ButtonAction[] => {
    const primaryButton: ButtonAction = isStopped
      ? {
          label: 'Start workbench',
          onClick: () => startNotebook(),
          variant: 'primary',
          dataTestId: 'start-spawn',
          clickOnEnter: true,
        }
      : {
          label: 'Stop workbench',
          onClick: () => stopNotebook(),
          variant: 'primary',
          dataTestId: 'close-spawn',
          clickOnEnter: true,
        };

    const editButton: ButtonAction = {
      label: 'Edit workbench',
      onClick: () => {
        if (notebook.metadata.namespace && notebook.metadata.name) {
          navigate(`/projects/${notebook.metadata.namespace}/spawner/${notebook.metadata.name}`);
        }
      },
      variant: 'link',
      dataTestId: 'edit-workbench',
    };

    return [primaryButton, editButton];
  };

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
            onClick={() => setStartModalOpen(true)}
          />
        </FlexItem>
        {isStarting ? (
          <UnderlinedTruncateButton
            content={notebookStatus?.currentEvent || 'Waiting for server request to start...'}
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
          onClose={() => {
            setStartModalOpen(false);
          }}
          buttonActions={makeButtonActions()}
        />
      ) : null}
    </>
  );
};

export default NotebookStateStatus;
