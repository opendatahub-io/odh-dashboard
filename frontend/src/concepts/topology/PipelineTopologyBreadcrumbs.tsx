import React from 'react';
import { Breadcrumb, BreadcrumbItem, Button } from '@patternfly/react-core';
import { PipelineTopologyLayer } from '#~/concepts/pipelines/topology/pipelineTaskTypes';

type PipelineTopologyBreadcrumbsProps = {
  layers: PipelineTopologyLayer[];
  onLayerChange: (layers: PipelineTopologyLayer[]) => void;
};

const PipelineTopologyBreadcrumbs: React.FC<PipelineTopologyBreadcrumbsProps> = ({
  layers,
  onLayerChange,
}) => {
  if (layers.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb data-testid="pipeline-topology-breadcrumbs">
      {layers.map((layer, idx) => {
        const isLast = idx === layers.length - 1;
        return (
          <BreadcrumbItem key={`${layer.type}-${layer.label}-${idx}`} isActive={isLast}>
            {isLast ? (
              layer.label
            ) : (
              <Button
                variant="link"
                isInline
                onClick={() => onLayerChange(layers.slice(0, idx + 1))}
                data-testid={`breadcrumb-layer-${idx}`}
              >
                {layer.label}
              </Button>
            )}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
};

export default PipelineTopologyBreadcrumbs;
