import {
  AllQuickStartStates,
  QuickStartContextValues,
  QuickStartStatus,
} from '@cloudmosaic/quickstarts';

enum LaunchStatusEnum {
  Start = 'Start',
  Resume = 'Resume',
  Restart = 'Restart',
  Close = 'Close',
}

const getLaunchStatus = (
  quickStartId: string,
  allQuickStartStates: AllQuickStartStates,
  activeQuickStartID: string,
): LaunchStatusEnum => {
  const quickStartState = allQuickStartStates[quickStartId];

  if (!quickStartState) {
    return LaunchStatusEnum.Start;
  }

  if (quickStartState.taskNumber === -1) {
    if (activeQuickStartID === quickStartId) {
      return LaunchStatusEnum.Close;
    }
    return LaunchStatusEnum.Start;
  }

  if (activeQuickStartID === quickStartId || quickStartState.status === QuickStartStatus.COMPLETE) {
    return LaunchStatusEnum.Restart;
  }

  if (quickStartState.status === QuickStartStatus.IN_PROGRESS) {
    return LaunchStatusEnum.Resume;
  }

  return LaunchStatusEnum.Start;
};

export const getQuickStartLabel = (
  quickStartId?: string | null,
  qsContext?: QuickStartContextValues,
): string => {
  if (!quickStartId || !qsContext || !qsContext.allQuickStartStates) {
    return '';
  }
  const launchStatus = getLaunchStatus(
    quickStartId,
    qsContext.allQuickStartStates,
    qsContext.activeQuickStartID || '',
  );

  return `${launchStatus} the tour`;
};

export const launchQuickStart = (
  quickStartId: string | null,
  qsContext: QuickStartContextValues,
): void => {
  if (
    !quickStartId ||
    !qsContext ||
    !qsContext.setActiveQuickStart ||
    !qsContext.restartQuickStart
  ) {
    return;
  }

  if (!qsContext.allQuickStartStates) {
    qsContext.setActiveQuickStart(quickStartId);
    return;
  }

  const launchStatus = getLaunchStatus(
    quickStartId,
    qsContext.allQuickStartStates,
    qsContext.activeQuickStartID || '',
  );

  if (launchStatus === LaunchStatusEnum.Restart) {
    const quickStart = qsContext.allQuickStarts?.find((qs) => qs.metadata.name === quickStartId);
    qsContext.restartQuickStart(quickStartId, quickStart?.spec?.tasks?.length ?? 0);
    return;
  }

  qsContext.setActiveQuickStart(quickStartId);
};
