import {
  getSubscriptionsColumns,
  subscriptionsColumns,
} from '~/app/pages/subscriptions/allSubscriptions/columns';

describe('getSubscriptionsColumns', () => {
  it('should omit the Priority column by default', () => {
    expect(getSubscriptionsColumns().map((column) => column.label)).toEqual([
      'Subscription',
      'Status',
      'Groups',
      'Models',
    ]);
  });

  it('should include the Priority column when inference priority is enabled', () => {
    expect(getSubscriptionsColumns({ showPriority: true }).map((column) => column.label)).toEqual([
      'Subscription',
      'Status',
      'Groups',
      'Models',
      'Priority',
    ]);
  });

  it('should omit the Status column for read-only viewers', () => {
    expect(getSubscriptionsColumns({ showStatus: false }).map((column) => column.label)).toEqual([
      'Subscription',
      'Groups',
      'Models',
    ]);
  });

  it('should not mutate the shared columns definition', () => {
    getSubscriptionsColumns({ showStatus: false, showPriority: true });

    expect(subscriptionsColumns.map((column) => column.label)).toEqual([
      'Subscription',
      'Status',
      'Groups',
      'Models',
      'Priority',
    ]);
  });
});
