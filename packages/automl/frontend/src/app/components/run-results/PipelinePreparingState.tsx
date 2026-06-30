import { Bullseye, Content, ContentVariants, Spinner, Title } from '@patternfly/react-core';
import React from 'react';
import './PipelinePreparingState.scss';

type PipelinePreparingStateProps = {
  className?: string;
};

const PipelinePreparingState: React.FC<PipelinePreparingStateProps> = ({ className }) => (
  <div className={className} data-testid="tree-topology-loading">
    <Bullseye className="automl-pipeline-preparing">
      <div className="automl-pipeline-preparing__content">
        <Spinner size="xl" className="automl-pipeline-preparing__spinner" />
        <Title headingLevel="h3" size="lg" className="automl-pipeline-preparing__title">
          Starting your evaluation, this may take a few moments
        </Title>
        <Content component={ContentVariants.p} className="automl-pipeline-preparing__subtitle">
          The pipeline visualization will appear when the run structure is ready.
        </Content>
      </div>
    </Bullseye>
  </div>
);

export default PipelinePreparingState;
