import React from 'react';
import { QuickStartContext, QuickStartContextValues } from '@patternfly/quickstarts';
import { useWatchDocs } from '#~/utilities/useWatchDocs';
import { useWatchComponents } from '#~/utilities/useWatchComponents';
import { OdhDocument, OdhDocumentType } from '#~/types';
import { getQuickStartDocs, updateDocToComponent } from './docUtils';

export const useDocResources = (): { docs: OdhDocument[]; loaded: boolean; loadError?: Error } => {
  const { docs: odhDocs, loaded: docsLoaded, loadError: docsLoadError } = useWatchDocs();
  const { components, loaded, loadError } = useWatchComponents(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

  return React.useMemo(() => {
    if (docsLoadError || loadError) {
      return { docs: [], loaded: loaded && docsLoaded, loadError: loadError || docsLoadError };
    }

    if (!loaded || !docsLoaded) {
      return { docs: [], loaded: false };
    }

    const docs = [...odhDocs];

    // Add doc cards for all components' documentation
    components.forEach((component) => {
      if (component.spec.docsLink) {
        const odhDoc: OdhDocument = {
          kind: 'OdhDocLink',
          metadata: {
            name: `${component.metadata.name}-doc`,
          },
          spec: {
            type: OdhDocumentType.Documentation,
            appName: component.metadata.name,
            provider: component.spec.provider,
            url: component.spec.docsLink,
            displayName: component.spec.displayName,
            description: component.spec.description,
          },
        };
        docs.push(odhDoc);
      }
    });

    const updatedDocApps = docs
      .filter((doc) => doc.spec.type !== 'getting-started')
      .map((odhDoc) => updateDocToComponent(odhDoc, components));

    const quickStartDocs = getQuickStartDocs(qsContext.allQuickStarts || [], components);

    return { docs: [...updatedDocApps, ...quickStartDocs], loaded: true };
  }, [components, loaded, loadError, odhDocs, docsLoaded, docsLoadError, qsContext.allQuickStarts]);
};
