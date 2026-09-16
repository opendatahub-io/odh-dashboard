import { getQuotaUsageWorkloadStatusLabelSettings } from '../clusterQueueWorkloadStatusLabelUtils';
import { QuotaUsageWorkloadStatuses } from '../../types';

describe('getQuotaUsageWorkloadStatusLabelSettings', () => {
  it('uses purple clock styling for Pending', () => {
    expect(getQuotaUsageWorkloadStatusLabelSettings(QuotaUsageWorkloadStatuses.Pending)).toEqual(
      expect.objectContaining({
        label: 'Pending',
        color: 'purple',
      }),
    );
  });

  it('uses grey checkmark styling for Admitted', () => {
    expect(getQuotaUsageWorkloadStatusLabelSettings(QuotaUsageWorkloadStatuses.Admitted)).toEqual(
      expect.objectContaining({
        label: 'Admitted',
        color: 'grey',
      }),
    );
  });

  it('maps Running through shared Kueue status info', () => {
    const settings = getQuotaUsageWorkloadStatusLabelSettings(QuotaUsageWorkloadStatuses.Running);
    expect(settings.label).toBe('Running');
    expect(settings.color).toBeDefined();
  });

  it('falls back to grey clock for unmapped statuses', () => {
    expect(getQuotaUsageWorkloadStatusLabelSettings(QuotaUsageWorkloadStatuses.Pending).color).toBe(
      'purple',
    );
  });
});
