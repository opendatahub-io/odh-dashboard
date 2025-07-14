import { act } from 'react';
import { waitFor } from '@testing-library/react';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';

// These tests are around to keep the deprecated useFetchState working,
// but are redundant with the useFetch tests and should be removed when useFetchState is removed.

jest.useFakeTimers();

describe('useFetchState', () => {
  it('should be successful', async () => {
    const renderResult = testHook(useFetchState)(
      () => Promise.resolve('success-test-state'),
      'default-test-state',
    );

    expect(renderResult).hookToStrictEqual(standardUseFetchState('default-test-state'));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState('success-test-state', true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should fail', async () => {
    const renderResult = testHook(useFetchState)(
      () => Promise.reject<string>(new Error('error-test-state')),
      'default-test-state',
    );
    expect(renderResult).hookToStrictEqual(standardUseFetchState('default-test-state'));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState('default-test-state', false, new Error('error-test-state')),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });

  it('should refresh', async () => {
    const renderResult = testHook(useFetchState)(() => Promise.resolve([1, 2, 3]), [], {
      refreshRate: 1000,
    });
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([1, 2, 3], true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    await act(() => {
      jest.advanceTimersByTime(900);
    });
    expect(renderResult).hookToHaveUpdateCount(2);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(renderResult).hookToHaveUpdateCount(3);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([1, 2, 3], true));
    expect(renderResult).hookToHaveUpdateCount(4);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should test stability', async () => {
    const renderResult = testHook(useFetchState)(() => Promise.resolve([1, 2, 3]), []);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([1, 2, 3], true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    renderResult.rerender(() => Promise.resolve([1, 2, 4]), []);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, true, true]);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([1, 2, 4], true));
    expect(renderResult).hookToHaveUpdateCount(4);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should have a stable default values when initialPromisePurity=true', async () => {
    const oriDefaultValue = [10];
    const result: FetchState<number[]>[] = [];

    const renderResult = testHook((...args: Parameters<typeof useFetchState<number[]>>) => {
      // wrap useFetchState to capture all executions inbetween useEffects
      const state = useFetchState(...args);
      result.push(state);
      return state;
    })(() => Promise.resolve([1, 2, 3]), oriDefaultValue, {
      initialPromisePurity: true,
    });

    expect(result[0][0]).toBe(oriDefaultValue);
    expect(result[0][1]).toBe(false);

    await waitFor(() => expect(result).toHaveLength(2));
    expect(result[1][0]).toStrictEqual([1, 2, 3]);
    expect(result[1][1]).toBe(true);

    // rerender but with a promise that doens't resolve
    renderResult.rerender(
      () =>
        new Promise<never>(() => {
          // Creating a placeholder promise with no action inside the constructor,
          /* no action */
        }),
      [11],
      {
        initialPromisePurity: true,
      },
    );

    expect(result).toHaveLength(4);

    // update immediately after hook completes but before useEffects are run
    expect(result[2][0]).toBe(oriDefaultValue);
    expect(result[2][1]).toBe(false);

    // final update after all useEffects are run
    expect(result[3][0]).toBe(oriDefaultValue);
    expect(result[3][1]).toBe(false);
  });
});
