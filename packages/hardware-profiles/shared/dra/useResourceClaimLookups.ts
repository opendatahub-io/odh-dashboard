import * as React from 'react';
import {
  getResourceClaim,
  getResourceClaimTemplate,
} from '@odh-dashboard/k8s-core/api/resourceClaims';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import useFetch, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { getDraLookupErrorState } from './lookupState';
import type { DraLookupState, DraLookups } from './types';

const EMPTY_LOOKUPS: DraLookups = { claims: {}, templates: {} };

/** A settled batch, tagged with its namespace so a result can never be reused for another project. */
type NamespacedLookups = DraLookups & { namespace: string };

const EMPTY_RESULT: NamespacedLookups = { ...EMPTY_LOOKUPS, namespace: '' };

/** Names are serialized so identical sets never re-trigger the fetch. */
const toKey = (names: string[]): string => [...new Set(names)].toSorted().join('\n');
const fromKey = (key: string): string[] => (key ? key.split('\n') : []);

/** One state per name; every failure (even a synchronous throw) is captured so a sibling that loaded is never discarded. */
const settleLookups = async <T>(
  names: string[],
  get: (name: string) => Promise<T>,
): Promise<Record<string, DraLookupState<T>>> => {
  const states = await Promise.all(
    names.map((name) =>
      // The GET is issued synchronously (so an abort always reaches it); only a throw is converted to a rejection.
      new Promise<T>((resolve) => {
        resolve(get(name));
      }).then<DraLookupState<T>, DraLookupState<T>>(
        (resource) => ({ status: 'loaded', resource }),
        (error) => getDraLookupErrorState<T>(error),
      ),
    ),
  );
  return Object.fromEntries(names.map((name, index) => [name, states[index]]));
};

/** Own-property read so a claim named like an Object prototype key never resolves to a function. */
const getOwnState = <T>(
  record: Record<string, DraLookupState<T> | undefined>,
  name: string,
): DraLookupState<T> | undefined => (Object.hasOwn(record, name) ? record[name] : undefined);

/** Only the requested names, taken from `current` first and from the retained batch for names still in flight. */
const pickStates = <T>(
  names: string[],
  current: Record<string, DraLookupState<T> | undefined>,
  retained: Record<string, DraLookupState<T> | undefined>,
): Record<string, DraLookupState<T> | undefined> =>
  Object.fromEntries(
    names.flatMap((name) => {
      const state = getOwnState(current, name) ?? getOwnState(retained, name);
      return state ? [[name, state]] : [];
    }),
  );

type UseResourceClaimLookupsOptions = {
  /** Workload project namespace. */
  namespace: string | undefined;
  claimNames: string[];
  templateNames: string[];
  /** Gate on visibility so collapsed details never fetch. */
  enabled: boolean;
  /** Poll while enabled; 0 fetches once. */
  refreshRate?: number;
};

/** Fetches every named RC/RCT in parallel; absent keys in the result mean still loading. */
export const useResourceClaimLookups = ({
  namespace,
  claimNames,
  templateNames,
  enabled,
  refreshRate = 0,
}: UseResourceClaimLookupsOptions): DraLookups => {
  const claimKey = toKey(claimNames);
  const templateKey = toKey(templateNames);
  const call = React.useCallback<FetchStateCallbackPromise<NamespacedLookups>>(
    async (opts: K8sAPIOptions) => {
      if (!enabled || !namespace || (!claimKey && !templateKey)) {
        return Promise.reject(new NotReadyError('ResourceClaim lookups not requested'));
      }
      const [claims, templates] = await Promise.all([
        settleLookups(fromKey(claimKey), (name) => getResourceClaim(namespace, name, opts)),
        settleLookups(fromKey(templateKey), (name) =>
          getResourceClaimTemplate(namespace, name, opts),
        ),
      ]);
      return { namespace, claims, templates };
    },
    [enabled, namespace, claimKey, templateKey],
  );

  // Purity drops the batch when the names or namespace change and aborts the in-flight request.
  const { data } = useFetch(call, EMPTY_RESULT, {
    refreshRate,
    initialPromisePurity: true,
  });

  // The last settled batch, kept so names that survive a key change (replica churn) do not flash Loading.
  const retainedRef = React.useRef<NamespacedLookups>(EMPTY_RESULT);
  React.useEffect(() => {
    if (!enabled) {
      // A collapse drops everything so a re-expand starts from a fresh fetch.
      retainedRef.current = EMPTY_RESULT;
    } else if (data.namespace) {
      retainedRef.current = data;
    }
  }, [enabled, data]);

  return React.useMemo<DraLookups>(() => {
    if (!enabled || !namespace) {
      return EMPTY_LOOKUPS;
    }
    // A batch from another namespace is never shown, whether current or retained.
    const current = data.namespace === namespace ? data : EMPTY_RESULT;
    const retained =
      retainedRef.current.namespace === namespace ? retainedRef.current : EMPTY_RESULT;
    return {
      claims: pickStates(fromKey(claimKey), current.claims, retained.claims),
      templates: pickStates(fromKey(templateKey), current.templates, retained.templates),
    };
  }, [enabled, namespace, data, claimKey, templateKey]);
};
