import * as React from 'react';
import { Content, List, ListItem, Stack, StackItem } from '@patternfly/react-core';

import { NotebookKind } from '#~/k8sTypes';
import { FEAST_CONFIG_ANNOTATION } from '#~/pages/projects/screens/spawner/featureStore/const';
import ShowAllButton from './ShowAllButton';

type NotebookFeatureStoreListProps = {
  notebook: NotebookKind;
};

const DEFAULT_VISIBLE_LENGTH = 5;

const parseFeatureStoreNames = (annotation: string | undefined): string[] => {
  if (!annotation) {
    return [];
  }
  const names = annotation
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return [...new Set(names)];
};

const NotebookFeatureStoreList: React.FC<NotebookFeatureStoreListProps> = ({ notebook }) => {
  const [showAll, setShowAll] = React.useState(false);

  const feastAnnotation = notebook.metadata.annotations?.[FEAST_CONFIG_ANNOTATION];
  const featureStoreNames = React.useMemo(
    () => parseFeatureStoreNames(feastAnnotation),
    [feastAnnotation],
  );

  const visibleNames = showAll
    ? featureStoreNames
    : featureStoreNames.slice(0, DEFAULT_VISIBLE_LENGTH);

  return (
    <Stack hasGutter>
      <StackItem>
        <strong data-testid="notebook-feature-store-title">Connected feature stores</strong>
      </StackItem>
      <StackItem>
        {featureStoreNames.length === 0 ? (
          <Content data-testid="notebook-feature-store-none" component="small">
            None
          </Content>
        ) : (
          <List data-testid="notebook-feature-store-list">
            {visibleNames.map((name) => (
              <ListItem key={name}>
                <Content>{name}</Content>
              </ListItem>
            ))}
          </List>
        )}
      </StackItem>
      {featureStoreNames.length > 0 && (
        <StackItem>
          <ShowAllButton
            isExpanded={showAll}
            visibleLength={DEFAULT_VISIBLE_LENGTH}
            onToggle={() => setShowAll(!showAll)}
            totalSize={featureStoreNames.length}
            data-testid="feature-store-show-all"
          />
        </StackItem>
      )}
    </Stack>
  );
};

export default NotebookFeatureStoreList;
