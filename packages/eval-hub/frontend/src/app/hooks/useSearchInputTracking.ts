import * as React from 'react';

export type SearchInputTrackingProps = {
  onSearch: (event: React.SyntheticEvent<HTMLButtonElement>, value: string) => void;
  inputProps: {
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  };
};

/**
 * SearchInput props that report filter telemetry only when the user commits a search
 * (Enter or blur), and only as the trimmed input length — never the raw text.
 */
const useSearchInputTracking = (
  onCommit: (trimmedLength: number) => void,
): SearchInputTrackingProps => {
  const lastCommittedValueRef = React.useRef('');

  const commitSearchValue = React.useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      if (!trimmedValue || trimmedValue === lastCommittedValueRef.current) {
        return;
      }
      lastCommittedValueRef.current = trimmedValue;
      onCommit(trimmedValue.length);
    },
    [onCommit],
  );

  return React.useMemo(
    () => ({
      onSearch: (_event, value) => commitSearchValue(value),
      inputProps: {
        onBlur: (event) => commitSearchValue(event.currentTarget.value),
      },
    }),
    [commitSearchValue],
  );
};

export default useSearchInputTracking;
