import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Icon,
  List,
  ListItem,
  Popover,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import text from '@patternfly/react-styles/css/utilities/Text/text';

import { NotebookKind } from '#~/k8sTypes';
import { FEAST_CONFIG_ANNOTATION } from '#~/pages/projects/screens/spawner/featureStore/const';
import { FEATURE_STORE_UNAVAILABLE_TOOLTIP } from '#~/pages/projects/screens/spawner/featureStore/utils';
import ShowAllButton from './ShowAllButton';

type NotebookFeatureStoreListProps = {
  notebook: NotebookKind;
  availableStoreMap: Map<string, string>;
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
  availableStoreMap,
  availabilityLoaded,
}) => {
  const [showAllAvailable, setShowAllAvailable] = React.useState(false);
  const [showUnavailable, setShowUnavailable] = React.useState(false);

  const feastAnnotation = notebook.metadata.annotations?.[FEAST_CONFIG_ANNOTATION];
  const featureStoreNames = React.useMemo(
    () => parseFeatureStoreNames(feastAnnotation),
    [feastAnnotation],
  );

  const { availableNames, unavailableNames } = React.useMemo((): {
    availableNames: string[];
    unavailableNames: string[];
  } => {
    if (!availabilityLoaded) {
      return { availableNames: [], unavailableNames: [] };
    }

    const available: string[] = [];
    const unavailable: string[] = [];
    featureStoreNames.forEach((name) => {
      if (availableStoreMap.has(name)) {
        available.push(name);
      } else {
        unavailable.push(name);
      }
    });
    return { availableNames: available, unavailableNames: unavailable };
  }, [availabilityLoaded, availableStoreMap, featureStoreNames]);

  const visibleAvailableNames = showAllAvailable
    ? availableNames
    : availableNames.slice(0, DEFAULT_VISIBLE_LENGTH);

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
        ) : !availabilityLoaded ? (
          <Stack hasGutter data-testid="notebook-feature-store-loading">
            <StackItem>
              <Skeleton
                screenreaderText="Loading connected feature stores"
                height="1.25rem"
                width="60%"
              />
            </StackItem>
            <StackItem>
              <Skeleton aria-hidden height="1.25rem" width="40%" />
            </StackItem>
          </Stack>
        ) : (
          <List isPlain data-testid="notebook-feature-store-list">
            {visibleAvailableNames.map((name) => (
              <ListItem key={name}>
                <Link
                  to={`/develop-train/feature-store/overview/${name}`}
                  state={{ registryNamespace: availableStoreMap.get(name) }}
                  data-testid={`feature-store-link-${name}`}
                >
                  {name}
                </Link>
              </ListItem>
            ))}
            {unavailableNames.length > 0 &&
              (showUnavailable ? (
                <>
                  {unavailableNames.map((name) => (
                    <ListItem key={name} data-testid={`feature-store-unavailable-${name}`}>
                      <Content className={text.textColorDisabled}>{name}</Content>
                    </ListItem>
                  ))}
                  <ListItem>
                    <Button
                      isInline
                      variant="link"
                      onClick={() => setShowUnavailable(false)}
                      data-testid="feature-store-show-unavailable"
                    >
                      Show less
                    </Button>
                  </ListItem>
                </>
              ) : (
                <ListItem data-testid="feature-store-show-unavailable">
                  <Flex
                    spaceItems={{ default: 'spaceItemsSm' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
                    <FlexItem>
                      <Button isInline variant="link" onClick={() => setShowUnavailable(true)}>
                        Show unavailable
                      </Button>
                    </FlexItem>
                    <FlexItem>
                      <Popover
                        aria-label="Why feature stores may be unavailable"
                        bodyContent={FEATURE_STORE_UNAVAILABLE_TOOLTIP}
                        position="right"
                      >
                        <Button
                          hasNoPadding
                          variant="plain"
                          isInline
                          aria-label="Why feature stores may be unavailable"
                          data-testid="feature-store-unavailable-help"
                        >
                          <Icon isInline aria-hidden>
                            <OutlinedQuestionCircleIcon />
                          </Icon>
                        </Button>
                      </Popover>
                    </FlexItem>
                  </Flex>
                </ListItem>
              ))}
          </List>
        )}
      </StackItem>
      {availabilityLoaded && availableNames.length > DEFAULT_VISIBLE_LENGTH && (
        <StackItem>
          <ShowAllButton
            isExpanded={showAllAvailable}
            visibleLength={DEFAULT_VISIBLE_LENGTH}
            onToggle={() => setShowAllAvailable(!showAllAvailable)}
            totalSize={availableNames.length}
            data-testid="feature-store-show-all"
          />
        </StackItem>
      )}
    </Stack>
  );
};

export default NotebookFeatureStoreList;
