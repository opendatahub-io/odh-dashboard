import * as React from 'react';
import QualityInsightsView from './QualityInsightsView';

const QualityInsightsTab: React.FC<{
  modelName?: string;
  sourceId?: string;
  namespace?: string;
}> = ({ sourceId = '', modelName = '', namespace = '' }) => (
  <QualityInsightsView sourceId={sourceId} modelName={modelName} namespace={namespace} />
);

export default QualityInsightsTab;
