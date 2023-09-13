import { act } from '@testing-library/react';
import useFetchState from '~/utilities/useFetchState';
import { expectHook, standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';

jest.useFakeTimers();

describe('useFetchState', () => {
  it('should be successful', async () => {
    const renderResult = testHook(
      useFetchState,
      () => Promise.resolve('success-test-state'),
      'default-test-state',
    );

    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState('default-test-state'))
      .toHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState('success-test-state', true))
      .toHaveUpdateCount(2)
      .toBeStable([false, false, true, true]);
  });

  it('should fail', async () => {
    const renderResult = testHook(
      useFetchState,
      () => Promise.reject<string>(new Error('error-test-state')),
      'default-test-state',
    );

    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState('default-test-state'))
      .toHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expectHook(renderResult)
      .toStrictEqual(
        standardUseFetchState('default-test-state', false, new Error('error-test-state')),
      )
      .toHaveUpdateCount(2)
      .toBeStable([true, true, false, true]);
  });

  it('should refresh', async () => {
    const renderResult = testHook(useFetchState, () => Promise.resolve([1, 2, 3]), [], {
      refreshRate: 1000,
    });
    expectHook(renderResult).toStrictEqual(standardUseFetchState([])).toHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([1, 2, 3], true))
      .toHaveUpdateCount(2)
      .toBeStable([false, false, true, true]);

    await act(() => {
      jest.advanceTimersByTime(900);
    });
    expectHook(renderResult).toHaveUpdateCount(2);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expectHook(renderResult).toHaveUpdateCount(3);

    await renderResult.waitForNextUpdate();
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([1, 2, 3], true))
      .toHaveUpdateCount(4)
      .toBeStable([false, true, true, true]);
  });

  it('should test stability', async () => {
    const renderResult = testHook(useFetchState, () => Promise.resolve([1, 2, 3]), []);
    expectHook(renderResult).toStrictEqual(standardUseFetchState([])).toHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([1, 2, 3], true))
      .toHaveUpdateCount(2)
      .toBeStable([false, false, true, true]);

    renderResult.rerender(() => Promise.resolve([1, 2, 4]), []);
    expectHook(renderResult).toHaveUpdateCount(3).toBeStable([true, true, true, true]);

    await renderResult.waitForNextUpdate();
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([1, 2, 4], true))
      .toHaveUpdateCount(4)
      .toBeStable([false, true, true, true]);
  });
});
