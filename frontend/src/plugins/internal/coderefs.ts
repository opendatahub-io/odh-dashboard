import type {
  CodeRef,
  Extension,
  LoadedExtension,
  ResolvedExtension,
} from '@openshift/dynamic-plugin-sdk';
import { cloneDeep } from 'lodash-es';
import { visitDeep } from './objects';

export const isCodeRef = (obj: unknown): obj is CodeRef => typeof obj === 'function';

/**
 * In the extension's `properties` object, replace all {@link CodeRef} functions with
 * their corresponding values by resolving the associated Promises.
 *
 * This is an asynchronous operation that completes when all of the associated Promises
 * are either resolved or rejected. Each code reference resolution error will cause the
 * associated property value to be set to `undefined`.
 *
 * The resulting Promise resolves with a new extension instance; its `properties` object
 * is cloned in order to preserve the original extension.
 *
 * The resulting Promise never rejects. Use the `onResolutionErrors` callback to handle
 * any code reference resolution errors.
 */
export const resolveCodeRefValues = async <TExtension extends Extension>(
  extension: LoadedExtension<TExtension>,
  onResolutionErrors: (errors: unknown[]) => void,
): Promise<LoadedExtension<ResolvedExtension<TExtension>>> => {
  const clonedProperties = cloneDeep(extension.properties);
  const resolutions: Promise<void>[] = [];
  const resolutionErrors: unknown[] = [];

  visitDeep<CodeRef>(clonedProperties, isCodeRef, (codeRef, key, obj) => {
    resolutions.push(
      codeRef()
        .then((resolvedValue: unknown) => {
          // eslint-disable-next-line no-param-reassign
          obj[key] = resolvedValue;
        })
        .catch((e: unknown) => {
          resolutionErrors.push(e);
          // eslint-disable-next-line no-param-reassign
          obj[key] = undefined;
        }),
    );
  });

  // eslint-disable-next-line no-restricted-properties
  await Promise.allSettled(resolutions);

  if (resolutionErrors.length > 0) {
    onResolutionErrors(resolutionErrors);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    ...extension,
    properties: clonedProperties,
  } as LoadedExtension<ResolvedExtension<TExtension>>;
};
