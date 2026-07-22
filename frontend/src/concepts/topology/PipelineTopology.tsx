import React from 'react';
import {
  PipelineNodeModel,
  SELECTION_EVENT,
  VisualizationProvider,
} from '@patternfly/react-topology';
import {
  Bullseye,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import PipelineVersionError from '#~/concepts/pipelines/content/pipelinesDetails/PipelineVersionError';
import {
  ParallelForDisplayMode,
  PipelineTopologyLayer,
} from '#~/concepts/pipelines/topology/pipelineTaskTypes';
import PipelineTopologyEmpty from './PipelineTopologyEmpty';
import useTopologyController from './useTopologyController';
import PipelineVisualizationSurface from './PipelineVisualizationSurface';
import PipelineTopologyBreadcrumbs from './PipelineTopologyBreadcrumbs';

type PipelineTopologyProps = {
  selectedIds?: string[];
  onSelectionChange?: (selectionIds: string[]) => void;
  nodes: PipelineNodeModel[];
  versionError?: Error;
  sidePanel?: React.ReactElement | null;
  layers?: PipelineTopologyLayer[];
  onLayerChange?: (layers: PipelineTopologyLayer[]) => void;
  displayMode?: ParallelForDisplayMode;
  onDisplayModeChange?: (mode: ParallelForDisplayMode) => void;
};

const PipelineTopology: React.FC<PipelineTopologyProps> = ({
  nodes,
  selectedIds,
  onSelectionChange,
  versionError,
  sidePanel,
  layers,
  onLayerChange,
  displayMode,
  onDisplayModeChange,
}) => {
  const controller = useTopologyController('g1');

  React.useEffect(() => {
    if (controller && onSelectionChange) {
      const onSelect = (ids: string[]) => {
        onSelectionChange(ids);
      };
      controller.addEventListener(SELECTION_EVENT, onSelect);

      return () => {
        controller.removeEventListener(SELECTION_EVENT, onSelect);
      };
    }

    return undefined;
  }, [controller, onSelectionChange]);

  if (versionError) {
    return (
      <PipelineVersionError
        title="Pipeline run graph unavailable"
        description="The pipeline version that this run graph belongs to has been deleted."
        testId="run-graph-error-state"
      />
    );
  }

  if (!nodes.length) {
    return <PipelineTopologyEmpty />;
  }

  if (!controller) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const hasBreadcrumbs = displayMode === 'layer' && layers && layers.length > 1 && onLayerChange;
  const hasToggle = displayMode && onDisplayModeChange;
  const hasTopBar = hasBreadcrumbs || hasToggle;

  return (
    <Stack className="pf-v6-u-h-100">
      {hasTopBar ? (
        <StackItem className="pf-v6-u-px-md pf-v6-u-py-sm">
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              {hasBreadcrumbs ? (
                <PipelineTopologyBreadcrumbs layers={layers} onLayerChange={onLayerChange} />
              ) : null}
            </FlexItem>
            {hasToggle ? (
              <FlexItem>
                <ToggleGroup aria-label="ParallelFor display mode" isCompact>
                  <ToggleGroupItem
                    text="Inline"
                    buttonId="inline-mode"
                    isSelected={displayMode === 'inline'}
                    onChange={() => onDisplayModeChange('inline')}
                    data-testid="toggle-inline-mode"
                  />
                  <ToggleGroupItem
                    text="Layer"
                    buttonId="layer-mode"
                    isSelected={displayMode === 'layer'}
                    onChange={() => onDisplayModeChange('layer')}
                    data-testid="toggle-layer-mode"
                  />
                </ToggleGroup>
              </FlexItem>
            ) : null}
          </Flex>
        </StackItem>
      ) : null}
      <StackItem isFilled>
        <VisualizationProvider controller={controller}>
          <PipelineVisualizationSurface
            nodes={nodes}
            selectedIds={selectedIds}
            sidePanel={sidePanel}
          />
        </VisualizationProvider>
      </StackItem>
    </Stack>
  );
};

export default PipelineTopology;
