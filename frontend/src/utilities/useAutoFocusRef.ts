import React, { MutableRefObject } from 'react';

/**
 * If enabled to autofocus, it will after the component mounts. Supply the return value to the
 * component you want to focus on.
 */
const useAutoFocusRef = <T extends HTMLInputElement = HTMLInputElement>(
  enableAutoFocus?: boolean,
): MutableRefObject<T | null> => {
  const ref = React.useRef<T | null>(null);

  React.useEffect(() => {
    if (enableAutoFocus) {
      ref.current?.focus();
    }
  }, [enableAutoFocus]);

  return ref;
};

export default useAutoFocusRef;
