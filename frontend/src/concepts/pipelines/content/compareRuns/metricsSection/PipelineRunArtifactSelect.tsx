import React from 'react';
import {
  /** Special use case for Select in this file
   * It allows multi-selection in the dropdown while keeps the toggle unchanged
   * Don't use SimpleSelect here
   */
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectOption,
  SelectList,
  Content,
  Stack,
  StackItem,
  MenuToggle,
  Skeleton,
  SplitItem,
  Button,
  Split,
} from '@patternfly/react-core';
import { CompressIcon, ExpandIcon } from '@patternfly/react-icons';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';

type ArtifactDisplayConfig<T> = { config: T; title: string; fileSize?: number };

type PipelineRunArtifactSelectProps<T> = {
  run?: PipelineRunKF;
  renderArtifact: (config: ArtifactDisplayConfig<T>) => React.ReactNode;
  data: ArtifactDisplayConfig<T>[];
  setExpandedGraph: (config?: ArtifactDisplayConfig<T>) => void;
  expandedGraph?: ArtifactDisplayConfig<T>;
};

export const PipelineRunArtifactSelect = <T,>({
  run,
  renderArtifact,
  data,
  setExpandedGraph,
  expandedGraph,
}: PipelineRunArtifactSelectProps<T>): React.ReactNode => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedItemTitles, setSelectedItemTitles] = React.useState<string[]>(
    data.map(({ title }) => title),
  );

  const selectedConfigs = data.filter(({ title }) => selectedItemTitles.includes(title));

  return (
    <Stack hasGutter>
      {!expandedGraph && run && (
        <StackItem>
          <Select
            data-testid="pipeline-run-artifact-select"
            role="menu"
            id="checkbox-select"
            isOpen={isOpen}
            selected={selectedItemTitles}
            onSelect={(_event, value) => {
              if (typeof value === 'string') {
                if (selectedItemTitles.includes(value)) {
                  setSelectedItemTitles(selectedItemTitles.filter((id) => id !== value));
                } else {
                  setSelectedItemTitles([...selectedItemTitles, value]);
                }
              }
            }}
            onOpenChange={(nextOpen: boolean) => setIsOpen(nextOpen)}
            toggle={(ref) => (
              <MenuToggle ref={ref} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
                {run.display_name}
              </MenuToggle>
            )}
          >
            <SelectList>
              {data.map(({ title }) => (
                <SelectOption
                  key={title}
                  value={title}
                  isSelected={selectedItemTitles.includes(title)}
                >
                  {title}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </StackItem>
      )}

      {selectedConfigs.length === 0 && (
        <StackItem>
          <Skeleton shape="square" width="500px" />
        </StackItem>
      )}
      {selectedConfigs.map((displayConfig, index) => (
        <React.Fragment key={displayConfig.title}>
          <StackItem>
            <Split>
              <SplitItem>
                <Content component="p" data-testid="pipeline-run-artifact-title">
                  <b>{displayConfig.title}</b>
                </Content>
              </SplitItem>
              <SplitItem isFilled />
              <SplitItem>
                <Button
                  data-testid="pipeline-run-artifact-expand-button"
                  variant="link"
                  icon={expandedGraph ? <ExpandIcon /> : <CompressIcon />}
                  onClick={() => {
                    if (!expandedGraph) {
                      setExpandedGraph(displayConfig);
                      setSelectedItemTitles([displayConfig.title]);
                    } else {
                      setExpandedGraph(undefined);
                    }
                  }}
                >
                  {expandedGraph ? 'Collapse' : 'Expand'}
                </Button>
              </SplitItem>
            </Split>
          </StackItem>
          <StackItem data-testid={`pipeline-run-artifact-content-${index}`}>
            {renderArtifact(displayConfig)}
          </StackItem>
        </React.Fragment>
      ))}
    </Stack>
  );
};
