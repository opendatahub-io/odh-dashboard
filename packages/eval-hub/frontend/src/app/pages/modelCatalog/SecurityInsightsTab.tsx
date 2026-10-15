import * as React from 'react';
import SecurityInsightsView from './SecurityInsightsView';

const SecurityInsightsTab: React.FC<{
  modelName?: string;
  sourceId?: string;
  evalHubNamespace?: string;
  catalogNamespace?: string;
}> = ({ sourceId = '', modelName = '', evalHubNamespace = '', catalogNamespace }) => (
  <SecurityInsightsView
    sourceId={sourceId}
    modelName={modelName}
    namespace={evalHubNamespace}
    catalogNamespace={catalogNamespace}
  />
);

export default SecurityInsightsTab;
