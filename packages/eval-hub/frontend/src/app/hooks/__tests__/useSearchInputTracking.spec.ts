import * as React from 'react';
import { act } from '@testing-library/react';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import useSearchInputTracking from '~/app/hooks/useSearchInputTracking';
import type { SearchInputTrackingProps } from '~/app/hooks/useSearchInputTracking';

const blurEvent = (value: string): { currentTarget: { value: string } } => ({
  currentTarget: { value },
});

describe('useSearchInputTracking', () => {
  const renderTrackingHook = () => {
    const onCommit = jest.fn();
    const renderResult = renderHook(() => useSearchInputTracking(onCommit));
    return { onCommit, props: renderResult.result.current as SearchInputTrackingProps };
  };

  it('should report the trimmed input length on Enter', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.onSearch({} as React.SyntheticEvent<HTMLButtonElement>, '  knowledge  ');
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(9);
  });

  it('should report the trimmed input length on blur', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.inputProps.onBlur(blurEvent(' suite ') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(5);
  });

  it('should never receive the raw search text', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.onSearch({} as React.SyntheticEvent<HTMLButtonElement>, 'secret-search-term');
    });

    expect(onCommit).toHaveBeenCalledWith(18);
    expect(onCommit).not.toHaveBeenCalledWith(expect.stringContaining('secret'));
  });

  it('should ignore empty and whitespace-only input', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.onSearch({} as React.SyntheticEvent<HTMLButtonElement>, '');
      props.onSearch({} as React.SyntheticEvent<HTMLButtonElement>, '   ');
      props.inputProps.onBlur(blurEvent(' ') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('should not re-emit the same committed value', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.onSearch({} as React.SyntheticEvent<HTMLButtonElement>, 'suite');
      props.onSearch({} as React.SyntheticEvent<HTMLButtonElement>, 'suite');
      props.inputProps.onBlur(blurEvent('suite') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('should emit again after the committed value changes', () => {
    const { onCommit, props } = renderTrackingHook();

    act(() => {
      props.onSearch({} as React.SyntheticEvent<HTMLButtonElement>, 'suite');
    });
    act(() => {
      props.inputProps.onBlur(blurEvent('benchmarks') as React.FocusEvent<HTMLInputElement>);
    });

    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenNthCalledWith(1, 5);
    expect(onCommit).toHaveBeenNthCalledWith(2, 10);
  });
});
