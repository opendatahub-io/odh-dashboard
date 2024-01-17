import * as React from 'react';
import { pluralize } from '@patternfly/react-core';
import { CreatePipelineServerButton } from '~/concepts/pipelines/context';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import emptyStateImg from '~/images/UI_icon-Red_Hat-Branch-RGB.svg';
import OverviewCard from './OverviewCard';

type PipelineCardProps = {
  allowCreate: boolean;
};
const PipelineCard: React.FC<PipelineCardProps> = ({ allowCreate }) => {
  const [{ totalSize }, loaded, loadError] = usePipelines({ pageSize: 1 });
  return (
    <OverviewCard
      loading={!loaded}
      loadError={loadError}
      count={totalSize}
      title={pluralize(totalSize, 'Pipeline', 'Pipelines')}
      description="Further enhance and deploy your models."
      imgSrc={emptyStateImg}
      imgAlt="Pipelines"
      allowCreate={allowCreate}
      actionButton={
        allowCreate ? (
          <CreatePipelineServerButton
            variant="link"
            size="sm"
            title={totalSize ? 'Import pipeline' : 'Get started'}
          />
        ) : null
      }
      typeModifier="pipeline"
      navSection="pipelines"
    />
  );
};

export default PipelineCard;
