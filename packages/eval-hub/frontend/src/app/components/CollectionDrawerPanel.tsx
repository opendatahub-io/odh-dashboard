import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Collection, ProviderAgentMetadata, ProviderBenchmark } from '~/app/types';
import BenchmarkDrawerTileContent from './BenchmarkDrawerTileContent';
import { capitalizeFirst, getCategoryColor } from './benchmarkUtils';

export type BenchmarkWithProvider = ProviderBenchmark & {
  providerName: string;
  providerAgent?: ProviderAgentMetadata;
};

type CollectionDrawerPanelProps = {
  collection: Collection | undefined;
  benchmarkDetailsMap: Map<string, BenchmarkWithProvider>;
  onClose: () => void;
  onRunCollection: (c: Collection) => void;
};

const CollectionDrawerPanel: React.FC<CollectionDrawerPanelProps> = ({
  collection,
  benchmarkDetailsMap,
  onClose,
  onRunCollection,
}) => {
  if (!collection) {
    // DrawerPanelContent must remain in the DOM for PF's slide-in/out CSS transition to work
    return <DrawerPanelContent isResizable minSize="380px" />;
  }

  const color = getCategoryColor(collection.category);

  return (
    <DrawerPanelContent isResizable minSize="380px" data-testid="collection-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          {collection.category && (
            <StackItem>
              <Label color={color}>{capitalizeFirst(collection.category)}</Label>
            </StackItem>
          )}
          <StackItem>
            <Title headingLevel="h2">{collection.name}</Title>
          </StackItem>
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody style={{ flex: 1, overflowY: 'auto' }}>
        <Stack hasGutter>
          {collection.description && (
            <StackItem>
              <Content component="p">{collection.description}</Content>
            </StackItem>
          )}

          {collection.benchmarks && collection.benchmarks.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Title
                    headingLevel="h4"
                    style={{
                      fontSize: 'var(--pf-t--global--font--size--body--default)',
                      fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
                    }}
                  >
                    Benchmarks
                  </Title>
                </StackItem>
                {collection.benchmarks.map((b) => {
                  const key = `${b.provider_id ?? ''}:${b.id}`;
                  const details = benchmarkDetailsMap.get(key);
                  return (
                    <StackItem key={`${b.provider_id ?? 'unknown'}-${b.id}`}>
                      <Card isCompact>
                        <CardBody>
                          <BenchmarkDrawerTileContent
                            name={details?.name ?? b.id}
                            id={b.id}
                            description={details?.description}
                            metrics={details?.metrics}
                            providerName={details?.providerName ?? b.provider_id}
                            providerAgent={details?.providerAgent}
                            primaryScore={details?.primary_score}
                            passCriteria={details?.pass_criteria}
                            url={details?.url ?? b.url}
                            trackingSurface="collection_drawer"
                            isCompact
                          />
                        </CardBody>
                      </Card>
                    </StackItem>
                  );
                })}
              </Stack>
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }} className="pf-v6-u-mt-md">
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          <FlexItem>
            <Button
              variant="primary"
              data-testid="use-benchmark-suite-button"
              onClick={() => onRunCollection(collection)}
            >
              Select benchmark suite
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="link" onClick={onClose} data-testid="collection-drawer-close-footer">
              Close
            </Button>
          </FlexItem>
        </Flex>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default CollectionDrawerPanel;
