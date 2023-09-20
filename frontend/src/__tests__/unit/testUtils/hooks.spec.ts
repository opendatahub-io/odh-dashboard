import * as React from 'react';
import { expectHook, renderHook, standardUseFetchState, testHook } from './hooks';

const useSayHello = (who: string, showCount = false) => {
  const countRef = React.useRef(0);
  countRef.current++;
  return `Hello ${who}!${showCount && countRef.current > 1 ? ` x${countRef.current}` : ''}`;
};

const useSayHelloDelayed = (who: string, delay = 0) => {
  const [speech, setSpeech] = React.useState('');
  React.useEffect(() => {
    const handle = setTimeout(() => setSpeech(`Hello ${who}!`), delay);
    return () => clearTimeout(handle);
  }, [who, delay]);
  return speech;
};

describe('hook test utils', () => {
  it('simple testHook', () => {
    const renderResult = testHook((who: string) => `Hello ${who}!`, 'world');
    expectHook(renderResult).toBe('Hello world!').toHaveUpdateCount(1);
    renderResult.rerender('world');
    expectHook(renderResult).toBe('Hello world!').toBeStable().toHaveUpdateCount(2);
  });

  it('use testHook for rendering', () => {
    const renderResult = testHook(useSayHello, 'world');
    expectHook(renderResult)
      .toHaveUpdateCount(1)
      .toBe('Hello world!')
      .toStrictEqual('Hello world!');

    renderResult.rerender('world', false);

    expectHook(renderResult)
      .toHaveUpdateCount(2)
      .toBe('Hello world!')
      .toStrictEqual('Hello world!')
      .toBeStable();

    renderResult.rerender('world', true);

    expectHook(renderResult)
      .toHaveUpdateCount(3)
      .toBe('Hello world! x3')
      .toStrictEqual('Hello world! x3')
      .toBeStable(false);
  });

  it('use renderHook for rendering', () => {
    type Props = {
      who: string;
      showCount?: boolean;
    };
    const renderResult = renderHook(({ who, showCount }: Props) => useSayHello(who, showCount), {
      initialProps: {
        who: 'world',
      },
    });

    expectHook(renderResult)
      .toHaveUpdateCount(1)
      .toBe('Hello world!')
      .toStrictEqual('Hello world!');

    renderResult.rerender({
      who: 'world',
    });

    expectHook(renderResult)
      .toHaveUpdateCount(2)
      .toBe('Hello world!')
      .toStrictEqual('Hello world!')
      .toBeStable();

    renderResult.rerender({ who: 'world', showCount: true });

    expectHook(renderResult)
      .toHaveUpdateCount(3)
      .toBe('Hello world! x3')
      .toStrictEqual('Hello world! x3')
      .toBeStable(false);
  });

  it('should use waitForNextUpdate for async update testing', async () => {
    const renderResult = testHook(useSayHelloDelayed, 'world');
    expectHook(renderResult).toHaveUpdateCount(1).toBe('');

    await renderResult.waitForNextUpdate();
    expectHook(renderResult).toHaveUpdateCount(2).toBe('Hello world!');
  });

  it('should throw error if waitForNextUpdate times out', async () => {
    const renderResult = renderHook(() => useSayHelloDelayed('', 20));

    await expect(renderResult.waitForNextUpdate({ timeout: 10, interval: 5 })).rejects.toThrow();
    expectHook(renderResult).toHaveUpdateCount(1);

    // unmount to test waiting for an update that will never happen
    renderResult.unmount();

    await expect(renderResult.waitForNextUpdate({ timeout: 50, interval: 10 })).rejects.toThrow();

    expectHook(renderResult).toHaveUpdateCount(1);
  });

  it('should not throw if waitForNextUpdate timeout is sufficient', async () => {
    const renderResult = renderHook(() => useSayHelloDelayed('', 20));

    await expect(
      renderResult.waitForNextUpdate({ timeout: 50, interval: 10 }),
    ).resolves.not.toThrow();

    expectHook(renderResult).toHaveUpdateCount(2);
  });

  it('should assert stability of results using isStable', () => {
    let testValue = 'test';
    const renderResult = renderHook(() => testValue);
    expectHook(renderResult).toHaveUpdateCount(1);

    renderResult.rerender();
    expectHook(renderResult).toHaveUpdateCount(2).toBeStable(true);

    testValue = 'new';
    renderResult.rerender();
    expectHook(renderResult).toHaveUpdateCount(3).toBeStable(false);

    renderResult.rerender();
    expectHook(renderResult).toHaveUpdateCount(4).toBeStable(true);
  });

  it('should assert stability of results using isStableArray', () => {
    let testValue = 'test';
    // explicitly returns a new array each render to show the difference between `isStable` and `isStableArray`
    const renderResult = renderHook(() => [testValue]);
    expectHook(renderResult).toHaveUpdateCount(1);

    renderResult.rerender();
    expectHook(renderResult).toHaveUpdateCount(2).toBeStable(false);
    expectHook(renderResult).toHaveUpdateCount(2).toBeStable([true]);

    testValue = 'new';
    renderResult.rerender();
    expectHook(renderResult).toHaveUpdateCount(3).toBeStable(false);
    expectHook(renderResult).toHaveUpdateCount(3).toBeStable([false]);

    renderResult.rerender();
    expectHook(renderResult).toHaveUpdateCount(4).toBeStable(false);
    expectHook(renderResult).toHaveUpdateCount(4).toBeStable([true]);
  });

  it('standardUseFetchState should return an array matching the state of useFetchState', () => {
    expect(['test', false, undefined, () => null]).toStrictEqual(standardUseFetchState('test'));
    expect(['test', true, undefined, () => null]).toStrictEqual(
      standardUseFetchState('test', true),
    );
    expect(['test', false, new Error('error'), () => null]).toStrictEqual(
      standardUseFetchState('test', false, new Error('error')),
    );
  });
});
