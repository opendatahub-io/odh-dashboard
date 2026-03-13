import * as React from 'react';
import {
  Button,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { FlatBenchmark } from '~/app/types';
import { getCategoryColor } from './benchmarkUtils';

type BenchmarkDrawerPanelProps = {
  benchmark: FlatBenchmark | undefined;
  onClose: () => void;
  onRunBenchmark: (b: FlatBenchmark) => void;
};

const BenchmarkDrawerPanel: React.FC<BenchmarkDrawerPanelProps> = ({
  benchmark,
  onClose,
  onRunBenchmark,
}) => {
  if (!benchmark) {
    return null;
  }

  const color = getCategoryColor(benchmark.category);

  return (
    <DrawerPanelContent isResizable minSize="400px" data-testid="benchmark-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          {benchmark.category && (
            <StackItem>
              <Label color={color} isCompact>
                {benchmark.category}
              </Label>
            </StackItem>
          )}
          <StackItem>
            <Title headingLevel="h2" size="xl">
              {benchmark.name}
            </Title>
          </StackItem>
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody style={{ flex: 1, overflowY: 'auto' }}>
        <Stack hasGutter>
          {benchmark.description && (
            <StackItem>
              <Content component="p">{benchmark.description}</Content>
            </StackItem>
          )}

          {benchmark.metrics && benchmark.metrics.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Content component="h4">Metrics evaluated</Content>
                </StackItem>
                <StackItem>
                  <LabelGroup numLabels={benchmark.metrics.length} isCompact>
                    {benchmark.metrics.map((metric) => (
                      <Label key={metric} isCompact variant="outline">
                        {metric}
                      </Label>
                    ))}
                  </LabelGroup>
                </StackItem>
              </Stack>
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }}>
        <Button variant="primary" onClick={() => onRunBenchmark(benchmark)}>
          Run Benchmark
        </Button>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default BenchmarkDrawerPanel;
