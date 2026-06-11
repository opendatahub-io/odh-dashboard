import * as React from 'react';
import {
  Content,
  Flex,
  FlexItem,
  Icon,
  List,
  ListItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import text from '@patternfly/react-styles/css/utilities/Text/text';

import { NotebookKind } from '#~/k8sTypes';
import { FEAST_CONFIG_ANNOTATION } from '#~/pages/projects/screens/spawner/featureStore/const';
import ShowAllButton from './ShowAllButton';

type NotebookFeatureStoreListProps = {
  notebook: NotebookKind;
  availableNames: Set<string>;
  availabilityLoaded: boolean;
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

const NotebookFeatureStoreList: React.FC<NotebookFeatureStoreListProps> = ({
  notebook,
  availableNames,
  availabilityLoaded,
}) => {
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
            {visibleNames.map((name) => {
              const isUnavailable = availabilityLoaded && !availableNames.has(name);

              if (isUnavailable) {
                return (
                  <ListItem key={name}>
                    <Flex
                      spaceItems={{ default: 'spaceItemsSm' }}
                      alignItems={{ default: 'alignItemsCenter' }}
                    >
                      <FlexItem>
                        <Content className={text.textColorDisabled}>{name}</Content>
                      </FlexItem>
                      <FlexItem>
                        <Tooltip content="This feature store is no longer available. It may have been deleted or access has been revoked.">
                          <Icon isInline status="info" data-testid="feature-store-unavailable-icon">
                            <InfoCircleIcon />
                          </Icon>
                        </Tooltip>
                      </FlexItem>
                    </Flex>
                  </ListItem>
                );
              }

              return <ListItem key={name}>{name}</ListItem>;
            })}
          </List>
        )}
      </StackItem>
      {featureStoreNames.length > DEFAULT_VISIBLE_LENGTH && (
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
