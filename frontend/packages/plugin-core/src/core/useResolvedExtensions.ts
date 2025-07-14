import * as React from 'react';
import type {
  Extension,
  LoadedExtension,
  ResolvedExtension,
  ExtensionPredicate,
} from '@openshift/dynamic-plugin-sdk';
// TODO should be moved to a shared package
// eslint-disable-next-line import/no-extraneous-dependencies
import { allSettledPromises } from '@odh-dashboard/internal/utilities/allSettledPromises';
import { resolveCodeRefValues } from './internal/coderefs';
import { useExtensions } from './useExtensions';

export type UseResolvedExtensionsResult<TExtension extends Extension> = [
  resolvedExtensions: LoadedExtension<ResolvedExtension<TExtension>>[],
  resolved: boolean,
  errors: unknown[],
];

export type UseResolvedExtensionsOptions = Partial<{
  /**
   * Control how to deal with extensions that have code reference resolution errors.
   *
   * - `true` - include these extensions in the hook's result
   * - `false` - do not include these extensions in the hook's result
   *
   * Note that each code reference resolution error will cause the associated property value to be
   * set to `undefined`. Therefore, set this option to `true` only if the code that interprets the
   * extensions is able to deal with potentially `undefined` values within the `properties` object.
   *
   * Default value: `false`.
   */
  includeExtensionsWithResolutionErrors: boolean;
}>;

/**
 * React hook that calls `useExtensions` and resolves all code references in all matching extensions.
 *
 * Resolving code references to their corresponding values is an asynchronous operation. Initially,
 * this hook returns a pending result tuple `[resolvedExtensions: [], resolved: false, errors: []]`.
 *
 * Once the resolution is complete, this hook re-renders the component with a result tuple containing
 * all matching extensions that had their code references resolved successfully along with any errors
 * that occurred during the process.
 *
 * This hook supports an options argument to customize its default behavior.
 *
 * When the list of matching extensions changes, the resolution is restarted.
 *
 * The hook's result tuple elements are guaranteed to be referentially stable across re-renders.
 *
 * @see {@link useExtensions}
 */
export const useResolvedExtensions = <TExtension extends Extension>(
  predicate?: ExtensionPredicate<TExtension>,
  options: UseResolvedExtensionsOptions = {},
): UseResolvedExtensionsResult<TExtension> => {
  const includeExtensionsWithResolutionErrors =
    options.includeExtensionsWithResolutionErrors ?? false;

  const extensions = useExtensions(predicate);

  const [resolvedExtensions, setResolvedExtensions] = React.useState<
    LoadedExtension<ResolvedExtension<TExtension>>[]
  >([]);

  const [resolved, setResolved] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<unknown[]>([]);

  React.useEffect(() => {
    const allResolutionErrors: unknown[] = [];
    const failedExtensionUIDs: string[] = [];

    allSettledPromises(
      extensions.map((e) =>
        resolveCodeRefValues(e, (resolutionErrors: unknown[]) => {
          allResolutionErrors.push(...resolutionErrors);
          failedExtensionUIDs.push(e.uid);
        }),
      ),
    ).then(([results]) => {
      const fulfilledValues = results.map((r) => r.value);
      if (allResolutionErrors.length > 0) {
        // eslint-disable-next-line no-console
        console.error(
          'useResolvedExtensions has detected code reference resolution errors',
          allResolutionErrors,
        );
      }

      const resultExtensions = includeExtensionsWithResolutionErrors
        ? fulfilledValues
        : fulfilledValues.filter((e) => !failedExtensionUIDs.includes(e.uid));

      setResolved(true);
      setResolvedExtensions(resultExtensions);
      setErrors(allResolutionErrors);
    });

    return () => {
      setResolved(false);
      setResolvedExtensions([]);
      setErrors([]);
    };
  }, [extensions, includeExtensionsWithResolutionErrors]);

  return [resolvedExtensions, resolved, errors];
};
