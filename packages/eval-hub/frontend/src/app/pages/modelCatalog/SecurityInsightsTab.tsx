import * as React from 'react';
import SecurityInsightsView from './SecurityInsightsView';

const SecurityInsightsTab: React.FC<{
  modelName?: string;
  sourceId?: string;
  namespace?: string;
}> = ({ sourceId = '', modelName = '', namespace = '' }) => (
  <SecurityInsightsView sourceId={sourceId} modelName={modelName} namespace={namespace} />
);

export default SecurityInsightsTab;
