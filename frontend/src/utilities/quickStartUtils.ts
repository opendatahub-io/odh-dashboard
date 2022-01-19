import {
  getQuickStartStatus,
  QuickStartContextValues,
  QuickStartStatus,
} from '@patternfly/quickstarts';

export enum LaunchStatusEnum {
  Open = 'Open',
  Continue = 'Continue',
  Restart = 'Restart',
  Close = 'Close',
}

export const getLaunchStatus = (
  quickStartId: string,
  qsContext?: QuickStartContextValues,
): LaunchStatusEnum => {
  if (!quickStartId || !qsContext || !qsContext.allQuickStartStates) {
    return LaunchStatusEnum.Open;
  }

  const quickStartState = qsContext.allQuickStartStates[quickStartId];

  if (!quickStartState) {
    return LaunchStatusEnum.Open;
  }

  if (quickStartState.taskNumber === -1) {
    if (qsContext.activeQuickStartID === quickStartId) {
      return LaunchStatusEnum.Close;
    }
    return LaunchStatusEnum.Open;
  }

  if (
    qsContext.activeQuickStartID === quickStartId ||
    quickStartState.status === QuickStartStatus.COMPLETE
  ) {
    return LaunchStatusEnum.Restart;
  }

  if (quickStartState.status === QuickStartStatus.IN_PROGRESS) {
    return LaunchStatusEnum.Continue;
  }

  return LaunchStatusEnum.Open;
};

export const getQuickStartLabel = (
  quickStartId?: string | null,
  qsContext?: QuickStartContextValues,
): string => {
  if (!quickStartId || !qsContext || !qsContext.allQuickStartStates) {
    return '';
  }
  const launchStatus = getLaunchStatus(quickStartId, qsContext);

  return `${launchStatus}`;
};

export const isQuickStartInProgress = (
  quickStartId?: string | null,
  qsContext?: QuickStartContextValues,
): boolean => {
  if (!quickStartId || !qsContext || !qsContext.allQuickStartStates) {
    return false;
  }
  const launchStatus = getLaunchStatus(quickStartId, qsContext);

  return launchStatus === LaunchStatusEnum.Continue;
};

export const isQuickStartComplete = (
  quickStartId?: string | null,
  qsContext?: QuickStartContextValues,
): boolean => {
  if (!quickStartId || !qsContext || !qsContext.allQuickStartStates) {
    return false;
  }
  return (
    getQuickStartStatus(qsContext.allQuickStartStates, quickStartId) === QuickStartStatus.COMPLETE
  );
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

  const launchStatus = getLaunchStatus(quickStartId, qsContext);

  if (launchStatus === LaunchStatusEnum.Restart) {
    const quickStart = qsContext.allQuickStarts?.find((qs) => qs.metadata.name === quickStartId);
    qsContext.restartQuickStart(quickStartId, quickStart?.spec?.tasks?.length ?? 0);
    return;
  }

  qsContext.setActiveQuickStart(quickStartId);
};
