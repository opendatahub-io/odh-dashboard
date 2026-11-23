import * as React from 'react';
import { act } from '@testing-library/react';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import useSearchInputTracking from '~/app/hooks/useSearchInputTracking';
import type { SearchInputTrackingProps } from '~/app/hooks/useSearchInputTracking';

const blurEvent = (value: string): { currentTarget: { value: string } } => ({
  currentTarget: { value },
});

const keydownEvent = (
  key: string,
  value: string,
): { key: string; currentTarget: { value: string } } => ({
  key,
  currentTarget: { value },
});

describe('useSearchInputTracking', () => {
  const renderTrackingHook = (initialValue = '') => {
    const onCommit = jest.fn();
    const renderResult = renderHook(
      ({ value }: { value: string }) => useSearchInputTracking(onCommit, value),
      { initialProps: { value: initialValue } },
    );
    return {
      onCommit,
      props: renderResult.result.current as SearchInputTrackingProps & { reset: () => void },
      rerender: renderResult.rerender,
      unmount: renderResult.unmount,
    };
  };

  it('should report the trimmed input length on Enter', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('Enter', '  knowledge  ') as React.KeyboardEvent<HTMLInputElement>,
      );
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(9);
  });

  it('should not report on non-Enter keys', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('a', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
      props.inputProps.onKeyDown(
        keydownEvent('Escape', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('should report the trimmed input length on blur', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onBlur(blurEvent(' suite ') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(5);
  });

  it('should report the settled value without Enter or blur', () => {
    jest.useFakeTimers();
    try {
      const { onCommit, rerender } = renderTrackingHook();

      act(() => {
        rerender({ value: 'kno' });
      });
      act(() => {
        jest.advanceTimersByTime(500);
      });
      // The second value must start a new 1,000 ms wait.
      act(() => {
        rerender({ value: 'knowledge' });
      });
      act(() => {
        jest.advanceTimersByTime(999);
      });
      expect(onCommit).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith(9);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should not report a settled value that was already committed', () => {
    jest.useFakeTimers();
    try {
      const { onCommit, props, rerender } = renderTrackingHook();

      act(() => {
        props.inputProps.onKeyDown(
          keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
        );
      });
      act(() => {
        rerender({ value: 'suite' });
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should not report an unsettled value on unmount', () => {
    jest.useFakeTimers();
    try {
      const { onCommit, rerender, unmount } = renderTrackingHook();

      act(() => {
        rerender({ value: 'suite' });
      });
      unmount();
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onCommit).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should never receive the raw search text', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'secret-search-term') as React.KeyboardEvent<HTMLInputElement>,
      );
    });

    expect(onCommit).toHaveBeenCalledWith(18);
    expect(onCommit).not.toHaveBeenCalledWith(expect.stringContaining('secret'));
  });

  it('should ignore empty and whitespace-only input', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('Enter', '') as React.KeyboardEvent<HTMLInputElement>,
      );
      props.inputProps.onKeyDown(
        keydownEvent('Enter', '   ') as React.KeyboardEvent<HTMLInputElement>,
      );
      props.inputProps.onBlur(blurEvent(' ') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('should not re-emit the same committed value', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
      props.inputProps.onBlur(blurEvent('suite') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('should emit again after the committed value changes', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
    });
    act(() => {
      props.inputProps.onBlur(blurEvent('benchmarks') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenNthCalledWith(1, 5);
    expect(onCommit).toHaveBeenNthCalledWith(2, 10);
  });

  it('should re-emit the same value after an empty commit clears the input', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
      props.inputProps.onKeyDown(
        keydownEvent('Enter', '') as React.KeyboardEvent<HTMLInputElement>,
      );
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
    });

    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenNthCalledWith(1, 5);
    expect(onCommit).toHaveBeenNthCalledWith(2, 5);
  });

  it('should re-emit the same value after the input is cleared and retyped', () => {
    jest.useFakeTimers();
    try {
      const { onCommit, rerender } = renderTrackingHook();

      act(() => {
        rerender({ value: 'suite' });
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      // Deleting the search and retyping it within the settle delay must still count
      // as a new search — the empty value resets deduplication before its timer fires.
      act(() => {
        rerender({ value: '' });
      });
      act(() => {
        rerender({ value: 'suite' });
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onCommit).toHaveBeenCalledTimes(2);
      expect(onCommit).toHaveBeenNthCalledWith(1, 5);
      expect(onCommit).toHaveBeenNthCalledWith(2, 5);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should re-emit the same value after reset is called', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
    });
    act(() => {
      props.reset();
      props.inputProps.onKeyDown(
        keydownEvent('Enter', 'suite') as React.KeyboardEvent<HTMLInputElement>,
      );
    });

    expect(onCommit).toHaveBeenCalledTimes(2);
  });
});
