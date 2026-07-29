import { Bullseye, Content, ContentVariants, Spinner, Title } from '@patternfly/react-core';
import React from 'react';
import {
  getPipelineTreeLoadingContent,
  type PipelineTreeLoadingMode,
} from './pipelineStatusLabels';
import './PipelinePreparingState.scss';

type PipelinePreparingStateProps = {
  className?: string;
  mode?: PipelineTreeLoadingMode;
};

const PipelinePreparingState: React.FC<PipelinePreparingStateProps> = ({
  className,
  mode = 'preparing',
}) => {
  const content = getPipelineTreeLoadingContent(mode);

  return (
    <div className={className} data-testid="tree-topology-loading" data-loading-mode={mode}>
      <Bullseye className="autorag-pipeline-preparing">
        <div className="autorag-pipeline-preparing__content">
          <Spinner size="xl" className="autorag-pipeline-preparing__spinner" />
          <Title headingLevel="h3" size="lg" className="autorag-pipeline-preparing__title">
            {content.primaryText}
          </Title>
          <Content component={ContentVariants.p} className="autorag-pipeline-preparing__subtitle">
            {content.secondaryText}
          </Content>
        </div>
      </Bullseye>
    </div>
  );
};

export default PipelinePreparingState;
