import React from 'react';
import {
  Select,
  SelectOption,
  SelectList,
  Text,
  Stack,
  StackItem,
  MenuToggle,
  Skeleton,
  SplitItem,
  Button,
  Split,
} from '@patternfly/react-core';
import { CompressIcon, ExpandIcon } from '@patternfly/react-icons';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

type ArtifactDisplayConfig<T> = { config: T; title: string };

type PipelineRunArtifactSelectProps<T> = {
  run?: PipelineRunKFv2;
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
            role="menu"
            id="checkbox-select"
            isOpen={isOpen}
            selected={selectedItemTitles}
            onSelect={(_event, value) => {
              if (selectedItemTitles.includes(value as string)) {
                setSelectedItemTitles(selectedItemTitles.filter((id) => id !== value));
              } else {
                setSelectedItemTitles([...selectedItemTitles, value as string]);
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
      {selectedConfigs.map((displayConfig) => (
        <React.Fragment key={displayConfig.title}>
          <StackItem>
            <Split>
              <SplitItem>
                <Text>
                  <b>{displayConfig.title}</b>
                </Text>
              </SplitItem>
              <SplitItem isFilled />
              <SplitItem>
                <Button
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
          <StackItem>{renderArtifact(displayConfig)}</StackItem>
        </React.Fragment>
      ))}
    </Stack>
  );
};
