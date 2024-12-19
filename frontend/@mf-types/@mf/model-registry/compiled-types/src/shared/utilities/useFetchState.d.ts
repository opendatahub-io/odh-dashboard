import { APIOptions } from '~/shared/api/types';
/**
 * Allows "I'm not ready" rejections if you lack a lazy provided prop
 * e.g. Promise.reject(new NotReadyError('Do not have namespace'))
 */
export declare class NotReadyError extends Error {
    constructor(reason: string);
}
/**
 * Checks to see if it's a standard error handled by useStateFetch .catch block.
 */
export declare const isCommonStateError: (e: Error) => boolean;
/** Provided as a promise, so you can await a refresh before enabling buttons / closing modals.
 * Returns the successful value or nothing if the call was cancelled / didn't complete. */
export type FetchStateRefreshPromise<Type> = () => Promise<Type | undefined>;
/** Return state */
export type FetchState<Type> = [
    data: Type,
    loaded: boolean,
    loadError: Error | undefined,
    /** This promise should never throw to the .catch */
    refresh: FetchStateRefreshPromise<Type>
];
type SetStateLazy<Type> = (lastState: Type) => Type;
export type AdHocUpdate<Type> = (updateLater: (updater: SetStateLazy<Type>) => void) => void;
/**
 * All callbacks will receive a APIOptions, which includes a signal to provide to a RequestInit.
 * This will allow the call to be cancelled if the hook needs to unload. It is recommended that you
 * upgrade your API handlers to support this.
 */
type FetchStateCallbackPromiseReturn<Return> = (opts: APIOptions) => Return;
/**
 * Standard usage. Your callback should return a Promise that resolves to your data.
 */
export type FetchStateCallbackPromise<Type> = FetchStateCallbackPromiseReturn<Promise<Type>>;
/**
 * Advanced usage. If you have a need to include a lazy refresh state to your data, you can use this
 * functionality. It works on the lazy React.setState functionality.
 *
 * Note: When using, you're giving up immediate setState, so you'll want to call the setStateLater
 * function immediately to get back that functionality.
 *
 * Example:
 * ```
 * React.useCallback(() =>
 *   new Promise(() => {
 *     MyAPICall().then((...) =>
 *       resolve((setStateLater) => { // << providing a function instead of the value
 *         setStateLater({ ...someInitialData })
 *         // ...some time later, after more calls / in a callback / etc
 *         setStateLater((lastState) => ({ ...lastState, data: additionalData }))
 *       })
 *     )
 *   })
 * );
 * ```
 */
export type FetchStateCallbackPromiseAdHoc<Type> = FetchStateCallbackPromiseReturn<Promise<AdHocUpdate<Type>>>;
export type FetchOptions = {
    /** To enable auto refresh */
    refreshRate: number;
    /**
     * Makes your promise pure from the sense of if it changes you do not want the previous data. When
     * you recompute your fetchCallbackPromise, do you want to drop the values stored? This will
     * reset everything; result, loaded, & error state. Intended purpose is if your promise is keyed
     * off of a value that if it changes you should drop all data as it's fundamentally a different
     * thing - sharing old state is misleading.
     *
     * Note: Doing this could have undesired side effects. Consider your hook's dependents and the
     * state of your data.
     * Note: This is only read as initial value; changes do nothing.
     */
    initialPromisePurity: boolean;
};
/**
 * A boilerplate helper utility. Given a callback that returns a promise, it will store state and
 * handle refreshes on intervals as needed.
 *
 * Note: Your callback *should* support the opts property so the call can be cancelled.
 */
declare const useFetchState: <Type>(fetchCallbackPromise: FetchStateCallbackPromise<Type | AdHocUpdate<Type>>, initialDefaultState: Type, { refreshRate, initialPromisePurity }?: Partial<FetchOptions>) => FetchState<Type>;
export default useFetchState;
