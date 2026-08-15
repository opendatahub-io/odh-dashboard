import type { Extension } from '@openshift/dynamic-plugin-sdk';

export const PATCH_EXTENSION_TYPE = 'app.patch';

/** Extracts keys from `T` whose type includes `null`. */
export type ClearableKey<T> = {
  [K in keyof Required<T>]: null extends T[K] ? K : never;
}[keyof T];

/** Schema for runtime validation and application of a patch type. */
export type PatchFieldSchema = {
  isValid: (patch: unknown) => boolean;
  allowedKeys: ReadonlySet<string>;
  isClearableKey: (field: string) => boolean;
};

export type PatchExtension<P> = Extension<
  typeof PATCH_EXTENSION_TYPE,
  {
    targetType: string;
    targetId: string;
    patch: P;
  }
>;

export const isPatchExtension = (e: Extension): e is PatchExtension<unknown> =>
  e.type === PATCH_EXTENSION_TYPE;
