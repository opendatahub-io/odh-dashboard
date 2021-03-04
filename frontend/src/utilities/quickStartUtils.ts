import {
  getQuickStartStatus,
  QuickStartContextValues,
  QuickStartStatus,
} from '@cloudmosaic/quickstarts';

export const getQuickStartLabel = (
  quickStartId?: string | null,
  qsContext?: QuickStartContextValues,
): string => {
  if (!quickStartId || !qsContext || !qsContext.allQuickStartStates) {
    return '';
  }
  const status = getQuickStartStatus(qsContext.allQuickStartStates, quickStartId);
  if (status === QuickStartStatus.NOT_STARTED || status === QuickStartStatus.COMPLETE) {
    return 'Start the tour';
  }
  if (status === QuickStartStatus.IN_PROGRESS) {
    if (qsContext.activeQuickStartID !== quickStartId) {
      return 'Resume the tour';
    }
    return 'Restart the tour';
  }
  return 'Start the tour';
};

export const launchQuickStart = (
  quickStartId: string | null,
  qsContext: QuickStartContextValues,
): void => {
  if (!quickStartId || !qsContext) {
    return;
  }
  const quickStart =
    qsContext.allQuickStarts &&
    qsContext.allQuickStarts.find((qs) => qs.metadata.name === quickStartId);

  if (qsContext.activeQuickStartID === quickStartId && qsContext.restartQuickStart) {
    qsContext.restartQuickStart(quickStartId, quickStart?.spec?.tasks?.length ?? 0);
    return;
  }

  quickStartId && qsContext.setActiveQuickStart && qsContext.setActiveQuickStart(quickStartId);
};
