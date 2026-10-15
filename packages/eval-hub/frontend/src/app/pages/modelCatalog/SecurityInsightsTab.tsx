import * as React from 'react';
import SecurityInsightsView from './SecurityInsightsView';

const SecurityInsightsTab: React.FC<{
  modelName?: string;
  sourceId?: string;
  evalHubNamespace?: string;
}> = ({ sourceId = '', modelName = '', evalHubNamespace = '' }) => (
  <SecurityInsightsView sourceId={sourceId} modelName={modelName} namespace={evalHubNamespace} />
);

export default SecurityInsightsTab;
