import * as React from 'react';
import QualityInsightsView from './QualityInsightsView';

const QualityInsightsTab: React.FC<{
  modelName?: string;
  sourceId?: string;
  evalHubNamespace?: string;
  catalogNamespace?: string;
}> = ({ sourceId = '', modelName = '', evalHubNamespace = '', catalogNamespace }) => (
  <QualityInsightsView
    sourceId={sourceId}
    modelName={modelName}
    namespace={evalHubNamespace}
    catalogNamespace={catalogNamespace}
  />
);

export default QualityInsightsTab;
