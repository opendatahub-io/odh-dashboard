import * as React from 'react';
import QualityInsightsView from './QualityInsightsView';

const QualityInsightsTab: React.FC<{
  modelName?: string;
  sourceId?: string;
  evalHubNamespace?: string;
}> = ({ sourceId = '', modelName = '', evalHubNamespace = '' }) => (
  <QualityInsightsView sourceId={sourceId} modelName={modelName} namespace={evalHubNamespace} />
);

export default QualityInsightsTab;
