/**
 * Takes a type and makes all properties partial within it.
 *
 * TODO: Implement the SDK & Patch logic -- this should stop being needed as things will be defined as Patches
 */
export type RecursivePartial<T> = T extends object
  ? {
      [P in keyof T]?: RecursivePartial<T[P]>;
    }
  : T;
