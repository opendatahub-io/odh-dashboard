/**
 * Takes a type and makes all properties partial within it.
 *
 * TODO: Won't need when we have the SDK on the frontend -- everything uses pass-thru API
 */
export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
