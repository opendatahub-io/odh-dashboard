import * as React from 'react';
import {
  Card,
  CardBody,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Button,
  Stack,
  StackItem,
  Title,
  Label,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { Collection } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { capitalizeFirst, getCategoryColor, toSafeExternalUrl } from './benchmarkUtils';

type CollectionDrawerPanelProps = {
  collection: Collection | undefined;
  onClose: () => void;
  onRunCollection: (c: Collection) => void;
};

const CollectionDrawerPanel: React.FC<CollectionDrawerPanelProps> = ({
  collection,
  onClose,
  onRunCollection,
}) => {
  if (!collection) {
    return null;
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
                  <Content component="h4">Benchmarks</Content>
                </StackItem>
                {collection.benchmarks.map((b) => {
                  const safeUrl = toSafeExternalUrl(b.url);
                  return (
                    <StackItem key={`${b.provider_id ?? 'unknown'}-${b.id}`}>
                      <Card isCompact>
                        <CardBody>
                          <Stack hasGutter>
                            <StackItem>
                              <Content
                                component="p"
                                style={{
                                  fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
                                }}
                              >
                                {safeUrl ? (
                                  <Button
                                    variant="link"
                                    isInline
                                    component="a"
                                    href={safeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    icon={<ExternalLinkAltIcon />}
                                    iconPosition="end"
                                    onClick={() =>
                                      fireMiscTrackingEvent(EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED, {
                                        url: safeUrl,
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
                            </StackItem>
                            {b.provider_id && (
                              <Stack>
                                <StackItem>
                                  <Content
                                    component="p"
                                    style={{
                                      fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
                                    }}
                                  >
                                    Evaluation framework
                                  </Content>
                                </StackItem>
                                <StackItem>{b.provider_id}</StackItem>
                              </Stack>
                            )}
                          </Stack>
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
        <Button
          variant="primary"
          data-testid="use-benchmark-suite-button"
          onClick={() => onRunCollection(collection)}
        >
          Use this benchmark suite
        </Button>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default CollectionDrawerPanel;
