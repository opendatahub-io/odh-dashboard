import * as React from 'react';

export type SearchInputTrackingProps = {
  inputProps: {
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  };
};

/** How long the filter value must be untouched before it counts as a settled search. */
const SEARCH_SETTLE_DELAY_MS = 1000;

/**
 * SearchInput props that report filter telemetry when the user commits a search
 * (Enter or blur) or when the live-filtering value settles, and only as the trimmed
 * input length — never the raw text.
 * `reset` ends the deduplication window so a cleared search can be re-reported.
 */
const useSearchInputTracking = (
  onCommit: (trimmedLength: number) => void,
  value: string,
): SearchInputTrackingProps & { reset: () => void } => {
  const lastCommittedValueRef = React.useRef('');

  const reset = React.useCallback(() => {
    lastCommittedValueRef.current = '';
  }, []);

  const commitSearchValue = React.useCallback(
    (searchValue: string) => {
      const trimmedValue = searchValue.trim();
      if (!trimmedValue) {
        reset();
        return;
      }
      if (trimmedValue === lastCommittedValueRef.current) {
        return;
      }
      lastCommittedValueRef.current = trimmedValue;
      onCommit(trimmedValue.length);
    },
    [onCommit, reset],
  );

  // Live-filtering searches are often typed into and left without Enter or blur, so a
  // value that has stopped changing is a real filter and is reported on its own.
  React.useEffect(() => {
    if (!value.trim()) {
      // Deleting a reported search ends its deduplication window immediately — the
      // empty-value settle timer is cancelled by the next keystroke before it fires.
      reset();
      return;
    }
    const timer = window.setTimeout(() => commitSearchValue(value), SEARCH_SETTLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [commitSearchValue, reset, value]);

  return React.useMemo(
    () => ({
      inputProps: {
        // Keydown, not the SearchInput `onSearch` prop: passing `onSearch` makes PatternFly render
        // a submit button next to the input, which this live-filtering search does not need.
        onKeyDown: (event) => {
          if (event.key === 'Enter') {
            commitSearchValue(event.currentTarget.value);
          }
        },
        onBlur: (event) => commitSearchValue(event.currentTarget.value),
      },
      reset,
    }),
    [commitSearchValue, reset],
  );
};

export default useSearchInputTracking;
