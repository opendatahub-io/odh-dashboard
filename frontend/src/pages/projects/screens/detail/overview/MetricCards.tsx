import * as React from 'react';
import NotebookMetricsCard from './NotebookMetricsCard';
import PipelineMetricsCard from './PipelineMetricsCard';

import './ProjectMetrics.scss';

const MetricCards: React.FC = () => (
  <div className="odh-project-overview__metric-cards">
    <NotebookMetricsCard />
    <PipelineMetricsCard />
  </div>
);

export default MetricCards;
