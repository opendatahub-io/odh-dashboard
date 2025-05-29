import React from 'react';

/**
 * A utility component that calls a specified hook and notifies a callback function whenever the
 * hook's return value changes. This component itself renders nothing (`null`).
 *
 * @param useHook - The hook to execute.
 * @param onNotify - The callback function to call with the hook's return value when it changes.
 * @param onUnmount - The callback function to call when the component unmounts.
 * @returns null - This component does not render anything.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const HookNotify = <H extends (...args: any) => any>({
  useHook,
  onNotify,
  onUnmount,
  args,
}: {
  onNotify?: (value: ReturnType<H> | undefined) => void;
  useHook: H;
  args?: Parameters<H>;
  onUnmount?: () => void;
}): null => {
  const value = useHook(...(args ?? []));
  React.useEffect(() => {
    onNotify?.(value);
    // only run when value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onUnmountRef = React.useRef(onUnmount);
  onUnmountRef.current = onUnmount;
  React.useEffect(
    () => () => {
      onUnmountRef.current?.();
    },
    // only run when component unmounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return null;
};
