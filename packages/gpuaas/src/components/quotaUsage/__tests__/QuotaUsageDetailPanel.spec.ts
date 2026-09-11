import { getDetailState } from '../QuotaUsageDetailPanel';
import { QuotaUsageDetailData } from '../../../hooks/useQuotaUsageDetail';

const detail: QuotaUsageDetailData = {
  summary: {
    admittedWorkloads: 0,
    pendingWorkloads: 0,
    workloadSummaryLine: '0 active, 0 pending',
    totalNominal: 8,
    totalUsed: 4,
    totalBorrowed: 0,
    capacityDisplayNominal: 8,
    computeUtilization: 50,
    memoryUtilization: 25,
    isOverQuota: false,
    isBorrowing: false,
    borrowingEnabled: false,
    showBorrowingInfo: false,
    borrowingClusterQueues: [],
  },
  acceleratorRows: [],
  showKueueProjectsLink: false,
};

describe('getDetailState', () => {
  it.each([
    ['loading', false, undefined, undefined],
    ['error', false, undefined, new Error('request failed')],
    ['empty', true, undefined, undefined],
    ['loaded', true, detail, undefined],
    ['loaded with partial error', true, detail, new Error('telemetry failed')],
  ])('%s', (_label, detailLoaded, detailData, error) => {
    const state = getDetailState(detailLoaded, detailData, error);

    expect(state.type).toBe(_label === 'loaded with partial error' ? 'loaded' : _label);
    if (state.type === 'loaded') {
      expect(state.detail).toBe(detail);
      expect(state.error).toBe(error);
    }
    if (state.type === 'error') {
      expect(state.error).toBe(error);
    }
  });
});
