import * as React from 'react';

const useDebouncedTrueValue = (value: boolean, delayMs = 8000): boolean => {
  const [debounced, setDebounced] = React.useState(false);

  React.useEffect(() => {
    if (!value) {
      setDebounced(false);
      return undefined;
    }
    const timer = setTimeout(() => setDebounced(true), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

export default useDebouncedTrueValue;
