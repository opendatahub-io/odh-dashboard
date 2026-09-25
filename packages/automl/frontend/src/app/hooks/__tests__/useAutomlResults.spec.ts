import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { invalidateAutomlResultsQueries } from '../useAutomlResults';

describe('invalidateAutomlResultsQueries', () => {
  it('should refetch stale model metadata as part of a results refresh', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const fetchModel = jest
      .fn()
      .mockResolvedValueOnce({ name: 'stale-model' })
      .mockResolvedValueOnce({ name: 'fresh-model' });
    const observer = new QueryObserver(queryClient, {
      queryKey: [
        's3Json',
        'namespace',
        'models/model.json',
        undefined,
        undefined,
        undefined,
        50 * 1024 * 1024,
      ],
      queryFn: fetchModel,
    });
    const unsubscribe = observer.subscribe(() => undefined);

    await observer.refetch();
    await invalidateAutomlResultsQueries(queryClient, 'namespace');

    expect(fetchModel).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData([
        's3Json',
        'namespace',
        'models/model.json',
        undefined,
        undefined,
        undefined,
        50 * 1024 * 1024,
      ]),
    ).toEqual({
      name: 'fresh-model',
    });
    unsubscribe();
  });
});
