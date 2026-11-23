import { act, renderHook, waitFor } from '@testing-library/react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import useDeploymentEventsAccess from '../useDeploymentEventsAccess';

jest.mock('@odh-dashboard/k8s-core/api/accessReview');
const mockCheckAccess = jest.mocked(checkAccess);

describe('useDeploymentEventsAccess', () => {
  beforeEach(() => mockCheckAccess.mockReset());

  it.each([
    ['allowed', true],
    ['denied', false],
  ] as const)(
    'should report %s only after both namespace checks finish',
    async (state, canWatch) => {
      let resolveWatch!: (value: boolean) => void;
      mockCheckAccess.mockResolvedValueOnce(true).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveWatch = resolve;
        }),
      );
      const { result } = renderHook(() => useDeploymentEventsAccess('test-project'));
      expect(result.current).toBe('checking');
      expect(mockCheckAccess.mock.calls).toEqual(
        ['list', 'watch'].map((verb) => [
          { namespace: 'test-project', group: '', resource: 'events', verb },
          { failureMode: 'reject' },
        ]),
      );
      await act(async () => resolveWatch(canWatch));
      expect(result.current).toBe(state);
    },
  );

  it('should distinguish an access check failure from a denial', async () => {
    mockCheckAccess.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('Review failed'));
    const { result } = renderHook(() => useDeploymentEventsAccess('test-project'));
    await waitFor(() => expect(result.current).toBe('error'));
  });

  it('should not check an undefined namespace or reuse another namespace result', async () => {
    let resolvePrevious!: (allowed: boolean) => void;
    mockCheckAccess
      .mockResolvedValueOnce(true)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePrevious = resolve;
        }),
      )
      .mockResolvedValue(false);
    const initialProps: { namespace?: string } = {};
    const { result, rerender } = renderHook(
      ({ namespace }: { namespace?: string }) => useDeploymentEventsAccess(namespace),
      { initialProps },
    );
    expect(mockCheckAccess).not.toHaveBeenCalled();
    rerender({ namespace: 'old' });
    expect(result.current).toBe('checking');
    rerender({ namespace: 'new' });
    expect(result.current).toBe('checking');
    await waitFor(() => expect(result.current).toBe('denied'));
    await act(async () => resolvePrevious(true));
    expect(result.current).toBe('denied');
  });
});
