import { UpdateObjectAtPropAndValue } from '~/shared/types';
export type GenericObjectState<T> = [
    data: T,
    setData: UpdateObjectAtPropAndValue<T>,
    resetDefault: () => void
];
declare const useGenericObjectState: <T>(defaultData: T) => GenericObjectState<T>;
export default useGenericObjectState;
