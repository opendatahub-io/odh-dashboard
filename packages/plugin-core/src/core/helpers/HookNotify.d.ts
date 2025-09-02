/**
 * A utility component that calls a specified hook and notifies a callback function whenever the
 * hook's return value changes. This component itself renders nothing (`null`).
 *
 * @param useHook - The hook to execute.
 * @param onNotify - The callback function to call with the hook's return value when it changes.
 * @param onUnmount - The callback function to call when the component unmounts.
 * @returns null - This component does not render anything.
 */
export declare const HookNotify: <H extends (...args: any) => any>({ useHook, onNotify, onUnmount, args, }: {
    onNotify?: (value: ReturnType<H> | undefined) => void;
    useHook: H;
    args?: Parameters<H>;
    onUnmount?: () => void;
}) => null;
