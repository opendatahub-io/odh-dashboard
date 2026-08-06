import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
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
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { Collection, ProviderBenchmark } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { getBenchmarkDatasetUrl } from '~/app/utilities/benchmarkDatasetUrls';
import { capitalizeFirst, getCategoryColor } from './benchmarkUtils';

type CollectionDrawerPanelProps = {
  collection: Collection | undefined;
  benchmarkDetailsMap: Map<string, ProviderBenchmark>;
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
                  const datasetUrl = getBenchmarkDatasetUrl(b.id);
                  const benchmarkName = details?.name ?? b.id;
                  const benchmarkDescription = details?.description;
                  return (
                    <StackItem key={`${b.provider_id ?? 'unknown'}-${b.id}`}>
                      <Card isCompact>
                        <CardBody>
                          <Flex
                            direction={{ default: 'column' }}
                            spaceItems={{ default: 'spaceItemsSm' }}
                          >
                            <FlexItem>
                              <Content
                                component="p"
                                style={{
                                  fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
                                  margin: 0,
                                }}
                              >
                                {benchmarkName}
                              </Content>
                            </FlexItem>
                            <FlexItem>
                              <Content
                                component="p"
                                style={{
                                  fontSize: 'var(--pf-t--global--font--size--sm)',
                                  color: 'var(--pf-t--global--text--color--subtle)',
                                  margin: 0,
                                }}
                              >
                                {datasetUrl ? (
                                  <Button
                                    variant="link"
                                    isInline
                                    component="a"
                                    href={datasetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    icon={<ExternalLinkAltIcon />}
                                    iconPosition="end"
                                    style={{
                                      fontSize: 'var(--pf-t--global--font--size--sm)',
                                    }}
                                    onClick={() =>
                                      fireMiscTrackingEvent(EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED, {
                                        url: datasetUrl,
                                        benchmarkId: b.id,
                                        surface: 'collection_drawer',
                                      })
                                    }
                                  >
                                    {b.id}
                                  </Button>
                                ) : (
                                  b.id
                                )}
                              </Content>
                            </FlexItem>
                            {benchmarkDescription && (
                              <FlexItem>
                                <Content
                                  component="p"
                                  style={{
                                    fontSize: 'var(--pf-t--global--font--size--sm)',
                                    color: 'var(--pf-t--global--text--color--subtle)',
                                    margin: 0,
                                  }}
                                >
                                  {benchmarkDescription}
                                </Content>
                              </FlexItem>
                            )}
                            {b.provider_id && (
                              <FlexItem>
                                <DescriptionList isCompact isAutoFit>
                                  <DescriptionListGroup>
                                    <DescriptionListTerm
                                      style={{
                                        fontSize: 'var(--pf-t--global--font--size--sm)',
                                      }}
                                    >
                                      Evaluation framework
                                    </DescriptionListTerm>
                                    <DescriptionListDescription
                                      style={{
                                        fontSize: 'var(--pf-t--global--font--size--sm)',
                                      }}
                                    >
                                      {b.provider_id}
                                    </DescriptionListDescription>
                                  </DescriptionListGroup>
                                </DescriptionList>
                              </FlexItem>
                            )}
                          </Flex>
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
