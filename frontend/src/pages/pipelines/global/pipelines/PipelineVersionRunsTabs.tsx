import React from 'react';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import GlobalPipelineRunsTabs from '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';

type PipelineVersionRunsTabsProps = {
  tab: PipelineRunType;
};

const PipelineVersionRunsTabs: React.FC<PipelineVersionRunsTabsProps> = ({ tab }) => {
  const { basePath } = React.useContext(PipelineVersionContext);

  return <GlobalPipelineRunsTabs basePath={basePath} tab={tab} />;
};

export default PipelineVersionRunsTabs;
