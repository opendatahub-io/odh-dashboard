import * as React from 'react';
import { getResourceClaimTemplate } from '@odh-dashboard/k8s-core/api/resourceClaims';
import type { ResourceClaimTemplateKind } from '@odh-dashboard/k8s-core/dra/types';
import useFetch, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { toDraLookupState } from './lookupState';
import type { DraLookupState } from './types';

/** `idle`: nothing requested (disabled or no template); `noNamespace`: template known but workload project unknown. */
export type ResourceClaimTemplateLookupState =
  | { status: 'idle' }
  | { status: 'noNamespace' }
  | DraLookupState<ResourceClaimTemplateKind>;

type UseResourceClaimTemplateLookupOptions = {
  templateName: string | undefined;
  /** Workload project namespace, never the HardwareProfile namespace. */
  namespace: string | undefined;
  /** Gate the request on visibility so closed details never fetch. */
  enabled: boolean;
};

export const useResourceClaimTemplateLookup = ({
  templateName,
  namespace,
  enabled,
}: UseResourceClaimTemplateLookupOptions): ResourceClaimTemplateLookupState => {
  const call = React.useCallback<FetchStateCallbackPromise<ResourceClaimTemplateKind | null>>(
    (opts) => {
      if (!enabled || !templateName || !namespace) {
        return Promise.reject(new NotReadyError('ResourceClaimTemplate lookup not requested'));
      }
      return getResourceClaimTemplate(namespace, templateName, opts);
    },
    [enabled, templateName, namespace],
  );

  // Purity resets state when the key changes so a stale template never shows for a new namespace.
  const { data, loaded, error } = useFetch(call, null, { initialPromisePurity: true });

  return React.useMemo<ResourceClaimTemplateLookupState>(() => {
    if (!enabled || !templateName) {
      return { status: 'idle' };
    }
    if (!namespace) {
      return { status: 'noNamespace' };
    }
    return toDraLookupState(data, loaded, error);
  }, [enabled, templateName, namespace, data, loaded, error]);
};
