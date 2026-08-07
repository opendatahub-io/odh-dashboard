import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Content,
  Divider,
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
import { FEATURE_STORE_UNAVAILABLE_LIST_TOOLTIP } from '#~/pages/projects/screens/spawner/featureStore/utils';
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
          <Stack hasGutter>
            {availableNames.length > 0 && (
              <StackItem data-testid="notebook-feature-store-available-section">
                <Stack hasGutter>
                  <StackItem>
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
                    </List>
                  </StackItem>
                  {availableNames.length > DEFAULT_VISIBLE_LENGTH && (
                    <StackItem>
                      <ShowAllButton
                        isExpanded={showAllAvailable}
                        visibleLength={DEFAULT_VISIBLE_LENGTH}
                        onToggle={() => setShowAllAvailable(!showAllAvailable)}
                        totalSize={availableNames.length}
                        toggleAriaLabel={{
                          expanded: 'Show less connected feature stores',
                          collapsed: 'Show all connected feature stores',
                        }}
                        data-testid="feature-store-show-all"
                      />
                    </StackItem>
                  )}
                </Stack>
              </StackItem>
            )}
            {availableNames.length > DEFAULT_VISIBLE_LENGTH && unavailableNames.length > 0 && (
              <StackItem>
                <Flex>
                  <FlexItem flex={{ default: 'flex_4' }}>
                    <Divider data-testid="notebook-feature-store-section-divider" />
                  </FlexItem>
                  <FlexItem flex={{ default: 'flex_1' }} />
                </Flex>
              </StackItem>
            )}
            {unavailableNames.length > 0 && (
              <StackItem data-testid="notebook-feature-store-unavailable-section">
                <Stack hasGutter>
                  {showUnavailable && (
                    <StackItem>
                      <List isPlain data-testid="notebook-feature-store-unavailable-list">
                        {unavailableNames.map((name) => (
                          <ListItem key={name} data-testid={`feature-store-unavailable-${name}`}>
                            <Content className={text.textColorDisabled}>{name}</Content>
                          </ListItem>
                        ))}
                      </List>
                    </StackItem>
                  )}
                  <StackItem>
                    {showUnavailable ? (
                      <Button
                        isInline
                        variant="link"
                        onClick={() => setShowUnavailable(false)}
                        aria-label="Show less unavailable feature stores"
                        data-testid="feature-store-show-unavailable"
                      >
                        Show less
                      </Button>
                    ) : (
                      <Flex
                        spaceItems={{ default: 'spaceItemsSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                        data-testid="feature-store-show-unavailable"
                      >
                        <FlexItem>
                          <Button
                            isInline
                            variant="link"
                            onClick={() => setShowUnavailable(true)}
                            aria-label="Show unavailable feature stores"
                          >
                            Show unavailable
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <Popover
                            aria-label="Why feature stores may be unavailable"
                            bodyContent={FEATURE_STORE_UNAVAILABLE_LIST_TOOLTIP}
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
                    )}
                  </StackItem>
                </Stack>
              </StackItem>
            )}
          </Stack>
        )}
      </StackItem>
    </Stack>
  );
};

export default NotebookFeatureStoreList;
