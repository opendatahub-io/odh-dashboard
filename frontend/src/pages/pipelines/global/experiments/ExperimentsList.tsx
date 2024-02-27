import * as React from 'react';
import GlobalNoExperiments from './GlobalNoExperiments';
import { ExperimentListTabs } from './const';

type ExperimentListProps = {
  tab: ExperimentListTabs;
};

const ExperimentsList: React.FC<ExperimentListProps> = ({ tab }) => (
  <GlobalNoExperiments tab={tab} />
);
export default ExperimentsList;
