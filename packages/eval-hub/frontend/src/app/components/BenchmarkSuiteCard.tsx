import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import type { MenuToggleElement } from '@patternfly/react-core';
import type { Collection } from '~/app/types';
import { formatCategory, getCategoryColor, getMetricDisplayName } from './benchmarkUtils';
import './BenchmarkSuiteCard.scss';

export type BenchmarkSuiteCardAction = {
  id: string;
  label: string;
  onSelect: (collection: Collection) => void;
  isDanger?: boolean;
};

type BenchmarkSuiteCardProps = {
  collection: Collection;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  contextualActions?: BenchmarkSuiteCardAction[];
  onSelect?: (collection: Collection) => void;
};

const BenchmarkSuiteCard: React.FC<BenchmarkSuiteCardProps> = ({
  collection,
  primaryAction,
  contextualActions,
  onSelect,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const classificationLabels =
    collection.domains?.length || collection.ai_entities?.length
      ? [...(collection.domains ?? []), ...(collection.ai_entities ?? [])]
      : collection.category
        ? [collection.category]
        : [];
  const domains = [...new Set(classificationLabels)];
  const metrics = [
    ...new Set(
      (collection.benchmarks ?? [])
        .map((benchmark) => benchmark.primary_score?.metric)
        .filter((metric): metric is string => Boolean(metric)),
    ),
  ];
  const benchmarkCount = collection.benchmarks?.length ?? 0;

  return (
    <Card
      className="evalhub-benchmark-suite-card"
      isFullHeight
      data-testid={`benchmark-suite-card-${collection.resource.id}`}
    >
      <CardHeader className="evalhub-benchmark-suite-card__header">
        <Flex
          alignItems={{ default: 'alignItemsFlexStart' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          spaceItems={{ default: 'spaceItemsSm' }}
          className="evalhub-benchmark-suite-card__header-content"
        >
          <FlexItem className="evalhub-benchmark-suite-card__domains">
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              {domains.map((domain) => (
                <Label key={domain} color={getCategoryColor(domain)}>
                  {formatCategory(domain)}
                </Label>
              ))}
            </Flex>
          </FlexItem>
          {contextualActions && contextualActions.length > 0 && (
            <FlexItem>
              <Dropdown
                isOpen={isMenuOpen}
                onOpenChange={setIsMenuOpen}
                onSelect={() => setIsMenuOpen(false)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    variant="plain"
                    isExpanded={isMenuOpen}
                    aria-label={`Actions for ${collection.name}`}
                    onClick={() => setIsMenuOpen((open) => !open)}
                    data-testid={`benchmark-suite-card-menu-${collection.resource.id}`}
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  {contextualActions.map((action) => (
                    <DropdownItem
                      key={action.id}
                      value={action.id}
                      isDanger={action.isDanger}
                      onClick={() => {
                        setIsMenuOpen(false);
                        action.onSelect(collection);
                      }}
                      data-testid={`benchmark-suite-card-action-${action.id}-${collection.resource.id}`}
                    >
                      {action.label}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
            </FlexItem>
          )}
        </Flex>
      </CardHeader>
      <CardTitle className="evalhub-benchmark-suite-card__title">
        {onSelect ? (
          <Button
            variant="link"
            isInline
            className="evalhub-benchmark-suite-card__title-button"
            onClick={() => onSelect(collection)}
            data-testid={`benchmark-suite-card-name-${collection.resource.id}`}
          >
            {collection.name}
          </Button>
        ) : (
          collection.name
        )}
        <Content component="p" className="evalhub-benchmark-suite-card__count">
          {benchmarkCount} benchmark{benchmarkCount === 1 ? '' : 's'}
        </Content>
      </CardTitle>
      <CardBody className="evalhub-benchmark-suite-card__body">
        {collection.description && (
          <Content component="p" className="evalhub-benchmark-suite-card__description">
            {collection.description}
          </Content>
        )}
        {metrics.length > 0 && (
          <LabelGroup className="evalhub-benchmark-suite-card__metrics" numLabels={metrics.length}>
            {metrics.map((metric) => (
              <Label key={metric}>{getMetricDisplayName(metric)}</Label>
            ))}
          </LabelGroup>
        )}
      </CardBody>
      <CardFooter>
        <Button
          variant="secondary"
          isInline
          onClick={primaryAction.onClick}
          data-testid={`benchmark-suite-card-primary-action-${collection.resource.id}`}
        >
          {primaryAction.label}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BenchmarkSuiteCard;
