import * as React from 'react';
import {
  Button,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Panel,
  PanelMain,
  PanelMainBody,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Collection } from '~/app/types';

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

  return (
    <DrawerPanelContent isResizable minSize="380px" data-testid="collection-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h2" size="xl">
              {collection.name}
            </Title>
          </StackItem>
          <StackItem>
            {collection.benchmarks && collection.benchmarks.length > 0 && (
              <Content component="small">
                <strong>
                  {collection.benchmarks.length} benchmark
                  {collection.benchmarks.length !== 1 ? 's' : ''}
                </strong>
              </Content>
            )}
          </StackItem>
          {collection.description && (
            <StackItem>
              <Content component="p">{collection.description}</Content>
            </StackItem>
          )}
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody>
        <Stack hasGutter>
          {collection.benchmarks && collection.benchmarks.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Content component="h4">Benchmarks</Content>
                </StackItem>
                {collection.benchmarks.map((b) => (
                  <StackItem key={`${b.provider_id ?? 'unknown'}-${b.id}`}>
                    <Panel variant="bordered">
                      <PanelMain>
                        <PanelMainBody>
                          <Stack hasGutter>
                            <StackItem>
                              <strong>{b.id}</strong>
                            </StackItem>
                            {b.provider_id && (
                              <StackItem>
                                <Content component="small">Provider: {b.provider_id}</Content>
                              </StackItem>
                            )}
                            {b.weight !== undefined && (
                              <StackItem>
                                <Content component="small">Weight: {b.weight}</Content>
                              </StackItem>
                            )}
                          </Stack>
                        </PanelMainBody>
                      </PanelMain>
                    </Panel>
                  </StackItem>
                ))}
              </Stack>
            </StackItem>
          )}

          <StackItem>
            <Button variant="primary" onClick={() => onRunCollection(collection)}>
              Run collection
            </Button>
          </StackItem>
        </Stack>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default CollectionDrawerPanel;
