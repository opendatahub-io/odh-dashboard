import * as React from 'react';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type { AccessReviewResourceAttributes } from '#~/k8sTypes';
import { AccessReviewContext } from '#~/concepts/userSSAR/AccessReviewContext';

/**
 * React hook that filters a list of resolved extensions based on user access review.
 *
 * Then, for each resolved extension provided, it generates access review attributes using the `getResourceAttributes` callback.
 * It checks the `AccessReviewContext` cache for the user's access. If not cached, it triggers an access check.
 *
 * The hook returns a list of extensions for which the user has access, but only once *all* necessary access checks are complete.
 *
 * @param extensions - An array of already resolved extensions to be filtered.
 * @param getResourceAttributes - Callback to generate AccessReviewResourceAttributes for a given resolved extension.
 * @returns A tuple: `[filteredExtensions, isLoaded]`.
 *          `filteredExtensions`: An array of extensions the user has access to.
 *          `isLoaded`: Boolean indicating if all necessary access checks for the provided extensions are complete.
 */
export const useAccessReviewExtensions = <TExtension extends LoadedExtension<Extension>>(
  extensions: TExtension[],
  getResourceAttributes: (
    extension: TExtension,
  ) => AccessReviewResourceAttributes | null | undefined, // Allow callback to signal skipping
): [filteredExtensions: TExtension[], isLoaded: boolean] => {
  const getResourceAttributesRef = React.useRef(getResourceAttributes);
  getResourceAttributesRef.current = getResourceAttributes;
  const { canIAccess, accessReviewCache, genKey } = React.useContext(AccessReviewContext);

  const [filteredExtensions, setFilteredExtensions] = React.useState<TExtension[]>([]);
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Reset state when input extensions change
    setIsLoaded(false);
    setFilteredExtensions([]);

    if (extensions.length === 0) {
      // No extensions provided, so we are loaded with an empty list.
      setIsLoaded(true);
      return;
    }

    let allChecksCompleted = true;
    const allowedExtensions: TExtension[] = [];

    extensions.forEach((extension) => {
      let attributes: AccessReviewResourceAttributes | null | undefined;
      try {
        attributes = getResourceAttributesRef.current(extension);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error calling getResourceAttributes for extension ${extension.uid}`, error);
        // Treat error in callback as inability to determine access, effectively skipping/denying.
        // We might still be loading overall if other checks are pending.
        return; // Skip this extension
      }

      if (attributes == null) {
        allowedExtensions.push(extension);
        return;
      }

      const key = genKey(attributes);
      const cacheEntry = accessReviewCache[key];

      if (!cacheEntry) {
        // Not in cache, trigger check and mark overall state as not loaded yet.
        canIAccess(attributes);
        allChecksCompleted = false;
      } else if (cacheEntry.isLoading) {
        // In cache but still loading, mark overall state as not loaded yet.
        allChecksCompleted = false;
      } else if (cacheEntry.canAccess) {
        // In cache, loaded, and access is allowed. Add to potential results.
        allowedExtensions.push(extension);
      }
      // If in cache, loaded, and access denied (cacheEntry.canAccess is false), do nothing.
    });

    // Only update the public state if all checks initiated for this batch of resolved extensions are complete.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Linter might be confused by loop logic
    if (allChecksCompleted) {
      setFilteredExtensions(allowedExtensions);
      setIsLoaded(true);
    }
    // Otherwise, isLoaded remains false, and filteredExtensions remains the empty array set at the start of the effect.
  }, [extensions, genKey, canIAccess, accessReviewCache]);

  return [filteredExtensions, isLoaded];
};
