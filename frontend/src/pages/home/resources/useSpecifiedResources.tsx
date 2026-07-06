import * as React from 'react';
import { OdhDocument } from '#~/types';
import { useDocResources } from '#~/concepts/docResources/useDocResources';

export const useSpecifiedResources = (
  specifiedDocs: { name: string; kind: string }[],
): { docs: OdhDocument[]; loaded: boolean; loadError?: Error } => {
  const { docs, loaded, loadError } = useDocResources();
  return React.useMemo(() => {
    if (!loaded || loadError) {
      return { docs: [], loaded, loadError };
    }
    const foundDocs = specifiedDocs.reduce<OdhDocument[]>((acc, included) => {
      const doc = docs.find((d) => d.metadata.name === included.name && d.kind === included.kind);
      if (doc) {
        acc.push(doc);
      }
      return acc;
    }, []);
    return { docs: foundDocs, loaded, loadError };
  }, [docs, specifiedDocs, loadError, loaded]);
};
