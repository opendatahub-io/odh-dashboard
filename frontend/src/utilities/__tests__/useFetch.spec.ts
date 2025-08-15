import { act } from 'react';
import { waitFor } from '@testing-library/react';
import { standardUseFetchStateObject, testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch, { FetchStateObject } from '#~/utilities/useFetch';

// These tests are based on the original tests for useFetchState, updated to use the new useFetch hook.

jest.useFakeTimers();

describe('useFetch', () => {
  it('should be successful', async () => {
    const renderResult = testHook(useFetch)(
      () => Promise.resolve('success-test-state'),
      'default-test-state',
    );

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: 'default-test-state' }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: 'success-test-state', loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should fail', async () => {
    const renderResult = testHook(useFetch)(
      () => Promise.reject<string>(new Error('error-test-state')),
      'default-test-state',
    );
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: 'default-test-state' }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: 'default-test-state',
        loaded: false,
        error: new Error('error-test-state'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({
      data: true,
      loaded: true,
      error: false,
      refresh: true,
    });
  });

  it('should refresh', async () => {
    const renderResult = testHook(useFetch)(() => Promise.resolve([1, 2, 3]), [], {
      refreshRate: 1000,
    });
    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: [] }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: [1, 2, 3], loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: false,
      error: true,
      refresh: true,
    });

    await act(() => {
      jest.advanceTimersByTime(900);
    });
    expect(renderResult).hookToHaveUpdateCount(2);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(renderResult).hookToHaveUpdateCount(3);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: [1, 2, 3], loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(4);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: true,
      error: true,
      refresh: true,
    });
  });

  it('should test stability', async () => {
    const renderResult = testHook(useFetch)(() => Promise.resolve([1, 2, 3]), []);
    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: [] }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: [1, 2, 3], loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: false,
      error: true,
      refresh: true,
    });

    renderResult.rerender(() => Promise.resolve([1, 2, 4]), []);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({
      data: true,
      loaded: true,
      error: true,
      refresh: true,
    });

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: [1, 2, 4], loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(4);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: true,
      error: true,
      refresh: true,
    });
  });

  it('should have a stable default values when initialPromisePurity=true', async () => {
    const oriDefaultValue = [10];
    const result: FetchStateObject<number[]>[] = [];

    const renderResult = testHook((...args: Parameters<typeof useFetch<number[]>>) => {
      // wrap useFetch to capture all executions inbetween useEffects
      const state = useFetch(...args);
      result.push(state);
      return state;
    })(() => Promise.resolve([1, 2, 3]), oriDefaultValue, {
      initialPromisePurity: true,
    });

    expect(result[0].data).toBe(oriDefaultValue);
    expect(result[0].loaded).toBe(false);

    await waitFor(() => expect(result).toHaveLength(2));
    expect(result[1].data).toStrictEqual([1, 2, 3]);
    expect(result[1].loaded).toBe(true);

    // rerender but with a promise that doesn't resolve
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
    expect(result[2].data).toBe(oriDefaultValue);
    expect(result[2].loaded).toBe(false);

    // final update after all useEffects are run
    expect(result[3].data).toBe(oriDefaultValue);
    expect(result[3].loaded).toBe(false);
  });
});
