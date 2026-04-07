import * as React from 'react';
import {
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Button,
  Panel,
  PanelMain,
  PanelMainBody,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { Collection } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { toSafeExternalUrl } from './benchmarkUtils';

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

  const framework =
    collection.benchmarks && collection.benchmarks.length > 0
      ? [
          ...new Set(
            collection.benchmarks.map((b) => b.provider_id).filter((id): id is string => !!id),
          ),
        ].join(', ')
      : undefined;

  return (
    <DrawerPanelContent isResizable minSize="380px" data-testid="collection-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h2" size="xl">
              {collection.name}
            </Title>
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
              <Content component="h4">Description</Content>
              <Content component="p">{collection.description}</Content>
            </StackItem>
          )}

          {framework && (
            <StackItem>
              <Content component="h4">Framework</Content>
              <Content component="p">{framework}</Content>
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
                      <Panel variant="bordered">
                        <PanelMain>
                          <PanelMainBody>
                            <Content component="p">
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
                          </PanelMainBody>
                        </PanelMain>
                      </Panel>
                    </StackItem>
                  );
                })}
              </Stack>
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }}>
        <Button variant="primary" onClick={() => onRunCollection(collection)}>
          Use this collection
        </Button>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default CollectionDrawerPanel;
