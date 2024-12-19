import * as _ from 'lodash-es';
declare const useDebounceCallback: <T extends (...args: any) => any>(fn: T, delay?: number) => ReturnType<typeof _.debounce<T>>;
export default useDebounceCallback;
