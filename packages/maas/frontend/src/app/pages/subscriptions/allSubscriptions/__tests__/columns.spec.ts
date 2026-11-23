import {
  getSubscriptionsColumns,
  subscriptionsColumns,
} from '~/app/pages/subscriptions/allSubscriptions/columns';

describe('getSubscriptionsColumns', () => {
  it('should include the Status column by default', () => {
    expect(getSubscriptionsColumns().map((column) => column.label)).toEqual([
      'Subscription',
      'Status',
      'Groups',
      'Models',
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
    getSubscriptionsColumns({ showStatus: false });

    expect(subscriptionsColumns.map((column) => column.label)).toEqual([
      'Subscription',
      'Status',
      'Groups',
      'Models',
    ]);
  });
});
