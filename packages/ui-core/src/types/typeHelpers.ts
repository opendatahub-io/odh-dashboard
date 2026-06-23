/**
 * Takes a type and makes all properties partial within it.
 */
export type RecursivePartial<T> = T extends object
  ? {
      [P in keyof T]?: RecursivePartial<T[P]>;
    }
  : T;
