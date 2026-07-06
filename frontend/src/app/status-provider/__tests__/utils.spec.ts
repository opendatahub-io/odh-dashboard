import type { StatusReport } from '@odh-dashboard/plugin-core/extension-points';
import { getStatusReportSummary } from '#~/app/status-provider/utils';

describe('getStatusReportSummary', () => {
  it('should return undefined for an empty array', () => {
    expect(getStatusReportSummary([])).toBeUndefined();
  });

  it('should return the single status report if only one is provided', () => {
    const singleStatus: StatusReport = { status: 'info', message: 'All good' };
    expect(getStatusReportSummary([singleStatus])).toEqual(singleStatus);
  });

  it('should prioritize error status when multiple statuses are provided', () => {
    const statuses: StatusReport[] = [
      { status: 'info', message: 'Informational message' },
      { status: 'error', message: 'Something went wrong' },
      { status: 'warning', message: 'Potential issue' },
    ];
    const expected: StatusReport = {
      status: 'error',
      message: 'Multiple status reported.',
    };
    expect(getStatusReportSummary(statuses)).toEqual(expected);
  });

  it('should prioritize warning status when multiple statuses are provided without error', () => {
    const statuses: StatusReport[] = [
      { status: 'info', message: 'Informational message' },
      { status: 'warning', message: 'Potential issue' },
    ];
    const expected: StatusReport = {
      status: 'warning',
      message: 'Multiple status reported.',
    };
    expect(getStatusReportSummary(statuses)).toEqual(expected);
  });

  it('should use the first status if multiple statuses are provided without error or warning', () => {
    const statuses: StatusReport[] = [
      { status: 'info', message: 'First informational message' },
      { status: 'info', message: 'Second informational message' },
    ];
    const expected: StatusReport = {
      status: 'info',
      message: 'Multiple status reported.',
    };
    expect(getStatusReportSummary(statuses)).toEqual(expected);
  });
});
