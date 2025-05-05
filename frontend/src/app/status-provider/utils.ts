import type { StatusReport } from '@odh-dashboard/plugin-core/extension-points';

export const getStatusReportSummary = (statuses: StatusReport[]): StatusReport | undefined => {
  if (statuses.length === 0) {
    return undefined;
  }

  if (statuses.length === 1) {
    return statuses[0];
  }

  // Prioritize statuses: error > warning > info (first element)
  const prioritizedStatus =
    statuses.find((s) => s.status === 'error') ??
    statuses.find((s) => s.status === 'warning') ??
    statuses[0];

  return {
    status: prioritizedStatus.status,
    message: 'Multiple status reported.',
  };
};
