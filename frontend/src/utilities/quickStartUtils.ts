import {
  QuickStartContextValues,
  QuickStartStatus,
  QuickStartTaskStatus,
} from '@patternfly/quickstarts';

export enum LaunchStatusEnum {
  Open = 'Open',
  Continue = 'Continue',
  Restart = 'Restart',
  Close = 'Close',
}

export enum CompletionStatusEnum {
  InProgress = 'In Progress',
  Success = 'Success',
  Failed = 'Failed',
}

export const getLaunchStatus = (
  quickStartId: string,
  qsContext?: QuickStartContextValues,
): LaunchStatusEnum => {
  if (!quickStartId || !qsContext) {
    return LaunchStatusEnum.Open;
  }

  const quickStartState = qsContext.allQuickStartStates?.[quickStartId];
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
    const taskStatus = getQuickStartCompletionStatus(quickStartId, qsContext);
    if (taskStatus === CompletionStatusEnum.InProgress) {
      return LaunchStatusEnum.Continue;
    }
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

export const getQuickStartCompletionStatus = (
  quickStartId?: string | null,
  qsContext?: QuickStartContextValues,
): CompletionStatusEnum | undefined => {
  if (!quickStartId || !qsContext) {
    return undefined;
  }

  const quickStartState = qsContext.allQuickStartStates?.[quickStartId];
  if (!quickStartState || quickStartState.taskNumber === -1) {
    return undefined;
  }

  if (quickStartState.status === QuickStartStatus.COMPLETE) {
    const quickStart = qsContext.allQuickStarts?.find((qs) => qs.metadata.name === quickStartId);
    let qsStatus = CompletionStatusEnum.Success,
      currentStep = 0;
    const tasks = quickStart?.spec.tasks;
    if (tasks) {
      while (currentStep < tasks.length) {
        const status = quickStartState[`taskStatus${currentStep}`];
        if (!status) {
          return CompletionStatusEnum.InProgress;
        }
        if (status === QuickStartTaskStatus.FAILED) {
          qsStatus = CompletionStatusEnum.Failed;
        }
        if (
          status === QuickStartTaskStatus.REVIEW ||
          status === QuickStartTaskStatus.VISITED ||
          status === QuickStartTaskStatus.INIT
        ) {
          return CompletionStatusEnum.InProgress;
        }
        currentStep++;
      }
    }
    return qsStatus;
  }
  return CompletionStatusEnum.InProgress;
};

export const launchQuickStart = (
  quickStartId: string | null,
  qsContext: QuickStartContextValues | undefined,
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
    qsContext.restartQuickStart(quickStartId, quickStart?.spec.tasks?.length ?? 0);
    return;
  }

  qsContext.setActiveQuickStart(quickStartId);
};
