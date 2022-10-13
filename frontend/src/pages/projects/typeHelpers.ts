export type ValueOf<T> = T[keyof T];
export type UpdateObjectAtPropAndValue<T> = (propKey: keyof T, propValue: ValueOf<T>) => void;
