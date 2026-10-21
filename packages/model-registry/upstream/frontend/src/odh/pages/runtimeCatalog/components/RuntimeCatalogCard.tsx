import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  Truncate,
} from '@patternfly/react-core';
import { RhStandardContainerImageIcon } from '@patternfly/react-icons';
import { TruncatedText } from 'mod-arch-shared';
import { Link, type LinkProps } from 'react-router-dom';
import type { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
import HardwareIcon from '~/odh/pages/runtimeCatalog/HardwareIcon';
import {
  getRuntimeCatalogCardKey,
  getRuntimeCatalogDetailsRoute,
  getRuntimeHardwareFilterValues,
  getRuntimePrimaryHardwareLabel,
} from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  RuntimeCatalogTrackingEvent,
  buildHardwareFiltersValue,
} from '~/odh/pages/runtimeCatalog/tracking/runtimeCatalogTracking';

type RuntimeCatalogCardProps = {
  runtime: ServingRuntime;
};

const RuntimeCatalogCard: React.FC<RuntimeCatalogCardProps> = React.memo(({ runtime }) => {
  const cardKey = getRuntimeCatalogCardKey(runtime);
  const runtimeId = runtime.id;
  const title = runtime.displayName || runtime.name || cardKey;
  const hardwareLabel = getRuntimePrimaryHardwareLabel(runtime);
  const showLatestBadge = (runtime.versionCount ?? 0) > 0;
  const { trackSimpleEvent } = useUserInteraction();

  const handleItemOpened = React.useCallback(() => {
    trackSimpleEvent(RuntimeCatalogTrackingEvent.ITEM_OPENED, {
      runtimeName: title,
      hardware: buildHardwareFiltersValue(getRuntimeHardwareFilterValues(runtime)),
    });
  }, [trackSimpleEvent, title, runtime]);

  return (
    <Card isFullHeight data-testid={`runtime-catalog-card-${cardKey}`}>
      <CardHeader>
        <Flex
          alignItems={{ default: 'alignItemsFlexStart' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          gap={{ default: 'gapXs' }}
          className="pf-v6-u-mb-md"
        >
          <FlexItem>
            <span
              className="pf-v6-u-display-inline-block pf-v6-u-font-size-2xl pf-v6-u-color-200"
              aria-hidden
              data-testid={`runtime-catalog-card-icon-${cardKey}`}
            >
              <RhStandardContainerImageIcon noDefaultStyle />
            </span>
          </FlexItem>
          {showLatestBadge && (
            <FlexItem>
              <Label color="purple" data-testid={`runtime-catalog-card-latest-${cardKey}`}>
                Latest
              </Label>
            </FlexItem>
          )}
        </Flex>
        <CardTitle>
          <Button
            data-testid={`runtime-catalog-card-detail-link-${cardKey}`}
            variant="link"
            isInline
            isDisabled={!runtimeId}
            onClick={handleItemOpened}
            component={
              runtimeId
                ? (props: LinkProps) => (
                    <Link {...props} to={getRuntimeCatalogDetailsRoute(runtimeId)} />
                  )
                : undefined
            }
            style={{
              fontSize: 'var(--pf-t--global--font--size--body--default)',
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            }}
          >
            <Truncate
              content={title}
              position="middle"
              tooltipPosition="top"
              data-testid={`runtime-catalog-card-name-${cardKey}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <TruncatedText
          content={runtime.description ?? ''}
          maxLines={4}
          data-testid={`runtime-catalog-card-description-${cardKey}`}
        />
      </CardBody>
      {hardwareLabel && (
        <CardFooter data-testid={`runtime-catalog-card-footer-${cardKey}`}>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
            <HardwareIcon
              className="pf-v6-u-font-size-sm pf-v6-u-color-200"
              aria-hidden
              data-testid={`runtime-catalog-card-hardware-icon-${cardKey}`}
            />
            <FlexItem data-testid={`runtime-catalog-card-hardware-${cardKey}`}>
              {hardwareLabel}
            </FlexItem>
          </Flex>
        </CardFooter>
      )}
    </Card>
  );
});

RuntimeCatalogCard.displayName = 'RuntimeCatalogCard';

export default RuntimeCatalogCard;
