import * as React from 'react';
import SecurityInsightsView from './SecurityInsightsView';

const SecurityInsightsTab: React.FC<{
  model?: { name: string };
  sourceId?: string;
  namespace?: string;
}> = ({ sourceId = '', model, namespace = '' }) => (
  <SecurityInsightsView sourceId={sourceId} modelName={model?.name ?? ''} namespace={namespace} />
);

export default SecurityInsightsTab;
