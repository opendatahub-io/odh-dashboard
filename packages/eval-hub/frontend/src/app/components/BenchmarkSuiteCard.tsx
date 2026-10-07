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
  List,
  ListItem,
  MenuToggle,
  MenuToggleAction,
  Tooltip,
} from '@patternfly/react-core';
import {
  BookOpenIcon,
  BrainIcon,
  ChartLineIcon,
  ClipboardCheckIcon,
  CodeIcon,
  CubeIcon,
  CubesIcon,
  EllipsisVIcon,
  LanguageIcon,
  PlayIcon,
  RhUiCollectionFillIcon,
  ShieldAltIcon,
  ToolsIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import type { MenuToggleElement } from '@patternfly/react-core';
import type { Collection } from '~/app/types';
import { formatCategory, getBenchmarkDisplayName, getMetricDisplayName } from './benchmarkUtils';
import type { BenchmarkNameMap } from './benchmarkUtils';
import './BenchmarkSuiteCard.scss';

const POPULAR_CURATION_ORDERS = new Set([1, 2, 3]);

export const isPopularCollection = (collection: Collection): boolean =>
  collection.curation_order !== undefined && POPULAR_CURATION_ORDERS.has(collection.curation_order);

type DomainIcon = React.ComponentType<React.ComponentProps<typeof BrainIcon>>;
type DomainIconColor =
  'blue' | 'cyan' | 'green' | 'orange' | 'orangered' | 'purple' | 'red' | 'teal' | 'yellow';
type DomainIconConfig = { icon: DomainIcon; color: DomainIconColor };

type CollectionTag = {
  value: string;
  label: string;
};

/* eslint-disable camelcase */
const DOMAIN_ICON_CONFIG: Partial<Record<string, DomainIconConfig>> = {
  knowledge_and_reasoning: { icon: BrainIcon, color: 'purple' },
  grounded_document_understanding: { icon: BookOpenIcon, color: 'blue' },
  instruction_and_output_reliability: { icon: ClipboardCheckIcon, color: 'green' },
  tool_use_and_function_calling: { icon: ToolsIcon, color: 'yellow' },
  software: { icon: CodeIcon, color: 'orange' },
  trustworthiness: { icon: ShieldAltIcon, color: 'red' },
  multilingual: { icon: LanguageIcon, color: 'teal' },
  multimodal: { icon: CubesIcon, color: 'orangered' },
};
/* eslint-enable camelcase */

export type BenchmarkSuiteCardAction = {
  id: string;
  label: string;
  onSelect: (collection: Collection) => void;
  isDanger?: boolean;
  isDisabled?: boolean;
};

type BenchmarkSuiteCardButton = {
  label: string;
  onClick: () => void;
  href?: string;
  state?: unknown;
  variant?: 'primary' | 'secondary' | 'tertiary';
};

type BenchmarkSuiteCardTagsProps = {
  tags: string[];
  collectionId: string;
};

const BenchmarkSuiteCardTags: React.FC<BenchmarkSuiteCardTagsProps> = ({
  tags: tagValues,
  collectionId,
}) => {
  const tags = React.useMemo<CollectionTag[]>(
    () =>
      [...new Set(tagValues)]
        .map((value) => ({ value, label: formatCategory(value) }))
        .toSorted((first, second) => first.label.localeCompare(second.label)),
    [tagValues],
  );
  const tagContainerRef = React.useRef<HTMLDivElement>(null);
  const tagRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const overflowMeasureRef = React.useRef<HTMLSpanElement>(null);
  const [visibleTagCount, setVisibleTagCount] = React.useState(tags.length);

  const measureVisibleTagCount = React.useCallback(() => {
    const container = tagContainerRef.current;
    const availableWidth = container?.clientWidth ?? 0;
    if (!container || availableWidth === 0) {
      return;
    }

    const gap = Number.parseFloat(window.getComputedStyle(container).columnGap) || 0;
    const overflowWidth = overflowMeasureRef.current?.offsetWidth ?? 0;
    let usedWidth = 0;
    let nextVisibleTagCount = tags.length;

    for (let index = 0; index < tags.length; index += 1) {
      const tagWidth = tagRefs.current[index]?.offsetWidth ?? 0;
      const remainingTagCount = tags.length - index - 1;
      const leadingGap = index > 0 ? gap : 0;
      const overflowSpace = remainingTagCount > 0 ? gap + overflowWidth : 0;
      const widthWithOverflow = usedWidth + leadingGap + tagWidth + overflowSpace;

      if (widthWithOverflow > availableWidth) {
        nextVisibleTagCount = index;
        break;
      }

      usedWidth += leadingGap + tagWidth;
    }

    setVisibleTagCount((previous) =>
      previous === nextVisibleTagCount ? previous : nextVisibleTagCount,
    );
  }, [tags]);

  React.useLayoutEffect(() => {
    measureVisibleTagCount();
    const container = tagContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(measureVisibleTagCount);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [measureVisibleTagCount]);

  if (tags.length === 0) {
    return null;
  }

  const overflowTags = tags.slice(visibleTagCount);
  const tagsTooltip = (
    <div className="evalhub-benchmark-suite-card__tooltip-content">
      <strong>Tags</strong>
      <List className="evalhub-benchmark-suite-card__tooltip-list">
        {overflowTags.map((tag) => (
          <ListItem key={tag.value}>{tag.label}</ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <div
      ref={tagContainerRef}
      className="evalhub-benchmark-suite-card__tags"
      aria-label="Collection tags"
      data-testid={`benchmark-suite-card-tags-${collectionId}`}
    >
      {tags.map((tag, index) => (
        <span
          key={tag.value}
          ref={(element) => {
            tagRefs.current[index] = element;
          }}
          className={
            index >= visibleTagCount ? 'evalhub-benchmark-suite-card__tag--hidden' : undefined
          }
        >
          <Label color="grey">{tag.label}</Label>
        </span>
      ))}
      {overflowTags.length > 0 && (
        <Tooltip content={tagsTooltip}>
          <button
            type="button"
            className="evalhub-benchmark-suite-card__tag-overflow"
            aria-label={`Additional tags: ${overflowTags.map((tag) => tag.label).join(', ')}`}
            data-testid={`benchmark-suite-card-tag-overflow-${collectionId}`}
          >
            <Label color="grey" variant="outline">
              +{overflowTags.length}
            </Label>
          </button>
        </Tooltip>
      )}
      <span
        ref={overflowMeasureRef}
        className="evalhub-benchmark-suite-card__tag-overflow-measure"
        aria-hidden="true"
      >
        <Label color="grey">+{tags.length}</Label>
      </span>
    </div>
  );
};

type BenchmarkSuiteCardProps = {
  collection: Collection;
  benchmarkNameMap?: BenchmarkNameMap;
  primaryAction: BenchmarkSuiteCardButton;
  showRunCount?: boolean;
  dropdownAction?: BenchmarkSuiteCardButton;
  contextualActions?: BenchmarkSuiteCardAction[];
  onSelect?: (collection: Collection) => void;
  reservePopularHeader?: boolean;
};

const BenchmarkSuiteCard: React.FC<BenchmarkSuiteCardProps> = ({
  collection,
  benchmarkNameMap,
  primaryAction,
  showRunCount = false,
  dropdownAction,
  contextualActions,
  onSelect,
  reservePopularHeader = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = React.useState(false);
  const domains = [...new Set(collection.domains ?? [])];
  const tags = collection.tags ?? [];
  const iconDomain =
    collection.category && DOMAIN_ICON_CONFIG[collection.category]
      ? collection.category
      : (domains[0] ?? '');
  const domainIconConfig = DOMAIN_ICON_CONFIG[iconDomain];
  const DomainIcon = domainIconConfig?.icon;
  const iconColor = domainIconConfig?.color ?? 'grey';
  const metrics = [
    ...new Set(
      (collection.benchmarks ?? [])
        .map((benchmark) => benchmark.primary_score?.metric)
        .filter((metric): metric is string => Boolean(metric)),
    ),
  ];
  const metricNames = metrics
    .map(getMetricDisplayName)
    .toSorted((first, second) => first.localeCompare(second));
  const benchmarkNames = (collection.benchmarks ?? [])
    .map((benchmark) => ({
      id: benchmark.id,
      name: getBenchmarkDisplayName(benchmark, benchmarkNameMap),
    }))
    .toSorted((first, second) => first.name.localeCompare(second.name));
  const evaluationTargetNames = [...new Set(collection.evaluation_targets ?? [])]
    .map(formatCategory)
    .toSorted((first, second) => first.localeCompare(second));
  const benchmarkCount = collection.benchmarks?.length ?? 0;
  const isPopular = isPopularCollection(collection);
  const actions = contextualActions ?? [];
  const hasContextualActions = actions.length > 0;
  const metricsTooltip = (
    <div className="evalhub-benchmark-suite-card__tooltip-content">
      <strong>Metrics</strong>
      {metricNames.length > 0 ? (
        <List className="evalhub-benchmark-suite-card__tooltip-list">
          {metricNames.map((metric) => (
            <ListItem key={metric}>{metric}</ListItem>
          ))}
        </List>
      ) : (
        <div>No metrics available</div>
      )}
    </div>
  );
  const metricsSummaryLabel = `Metrics: ${metricNames.join(', ') || 'No metrics available'}`;
  const benchmarksTooltip = (
    <div className="evalhub-benchmark-suite-card__tooltip-content">
      <strong>Benchmarks</strong>
      {benchmarkNames.length > 0 ? (
        <List className="evalhub-benchmark-suite-card__tooltip-list">
          {benchmarkNames.map((benchmark) => (
            <ListItem key={benchmark.id}>{benchmark.name}</ListItem>
          ))}
        </List>
      ) : (
        <div>No benchmarks available</div>
      )}
    </div>
  );
  const benchmarksSummaryLabel = `Benchmarks: ${
    benchmarkNames.map((benchmark) => benchmark.name).join(', ') || 'No benchmarks available'
  }`;
  const evaluationTargetsTooltip = (
    <div className="evalhub-benchmark-suite-card__tooltip-content">
      <strong>Evaluation targets</strong>
      {evaluationTargetNames.length > 0 ? (
        <List className="evalhub-benchmark-suite-card__tooltip-list">
          {evaluationTargetNames.map((target) => (
            <ListItem key={target}>{target}</ListItem>
          ))}
        </List>
      ) : (
        <div>No evaluation targets available</div>
      )}
    </div>
  );
  const evaluationTargetsSummaryLabel = `Evaluation targets: ${
    evaluationTargetNames.join(', ') || 'No evaluation targets available'
  }`;
  const runCount = collection.state?.run_count ?? 0;
  const runCountTooltip = 'Run Count: Number of successful executions of this suite';
  const renderActionButton = (action: BenchmarkSuiteCardButton, actionName: 'primary') =>
    action.href ? (
      <Button
        variant={action.variant ?? 'secondary'}
        isInline
        component={(props) => <Link {...props} to={action.href!} state={action.state} />}
        data-testid={`benchmark-suite-card-${actionName}-action-${collection.resource.id}`}
      >
        {action.label}
      </Button>
    ) : (
      <Button
        variant={action.variant ?? 'secondary'}
        isInline
        onClick={action.onClick}
        data-testid={`benchmark-suite-card-${actionName}-action-${collection.resource.id}`}
      >
        {action.label}
      </Button>
    );

  const primaryActionButton = dropdownAction ? (
    <MenuToggleAction
      key="primary-action"
      aria-label={primaryAction.label}
      onClick={primaryAction.onClick}
      data-testid={`benchmark-suite-card-primary-action-${collection.resource.id}`}
    >
      {primaryAction.label}
    </MenuToggleAction>
  ) : (
    renderActionButton(primaryAction, 'primary')
  );
  const actionFooter = dropdownAction ? (
    <Dropdown
      isOpen={isActionMenuOpen}
      onOpenChange={setIsActionMenuOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          variant={primaryAction.variant === 'secondary' ? 'secondary' : 'primary'}
          splitButtonItems={[primaryActionButton]}
          aria-label={`Actions for ${collection.name}`}
          onClick={() => setIsActionMenuOpen((isOpen) => !isOpen)}
          data-testid={`benchmark-suite-card-dropdown-toggle-${collection.resource.id}`}
        />
      )}
    >
      <DropdownList>
        <DropdownItem
          {...(dropdownAction.href
            ? {
                component: (props) => (
                  <Link {...props} to={dropdownAction.href!} state={dropdownAction.state} />
                ),
              }
            : {})}
          onClick={() => {
            setIsActionMenuOpen(false);
            if (!dropdownAction.href) {
              dropdownAction.onClick();
            }
          }}
          data-testid={`benchmark-suite-card-dropdown-action-${collection.resource.id}`}
        >
          {dropdownAction.label}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  ) : (
    primaryActionButton
  );

  return (
    <Card
      className={`evalhub-benchmark-suite-card evalhub-benchmark-suite-card--${iconColor}`}
      isFullHeight
      data-testid={`benchmark-suite-card-${collection.resource.id}`}
    >
      {(isPopular || reservePopularHeader || hasContextualActions) && (
        <CardHeader className="evalhub-benchmark-suite-card__header">
          <Flex
            alignItems={{ default: 'alignItemsFlexStart' }}
            justifyContent={{ default: 'justifyContentFlexEnd' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            className="evalhub-benchmark-suite-card__header-content"
          >
            {isPopular && (
              <FlexItem>
                <Label
                  color="blue"
                  isCompact
                  data-testid={`benchmark-suite-card-popular-${collection.resource.id}`}
                >
                  Popular
                </Label>
              </FlexItem>
            )}
            {!isPopular && reservePopularHeader && (
              <FlexItem aria-hidden="true">
                <Label
                  color="blue"
                  isCompact
                  className="evalhub-benchmark-suite-card__popular-placeholder"
                  data-testid={`benchmark-suite-card-popular-placeholder-${collection.resource.id}`}
                >
                  Popular
                </Label>
              </FlexItem>
            )}
            {hasContextualActions && (
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
                    {actions.map((action) => (
                      <DropdownItem
                        key={action.id}
                        value={action.id}
                        isDanger={action.isDanger}
                        isDisabled={action.isDisabled}
                        onClick={() => {
                          if (action.isDisabled) {
                            return;
                          }
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
      )}
      <CardTitle className="evalhub-benchmark-suite-card__title">
        <div className="evalhub-benchmark-suite-card__title-content">
          {DomainIcon && (
            <Tooltip content={formatCategory(iconDomain)}>
              <div
                className={`evalhub-benchmark-suite-card__domain-icon evalhub-benchmark-suite-card__domain-icon--${iconColor}`}
                data-testid={`benchmark-suite-card-domain-icon-${collection.resource.id}`}
                data-icon-color={iconColor}
                aria-label={formatCategory(iconDomain)}
                title={formatCategory(iconDomain)}
              >
                <DomainIcon aria-hidden="true" />
              </div>
            </Tooltip>
          )}
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
            <span>{collection.name}</span>
          )}
        </div>
      </CardTitle>
      <CardBody className="evalhub-benchmark-suite-card__body">
        <Content component="p" className="evalhub-benchmark-suite-card__description">
          {collection.description || <em>No description provided</em>}
        </Content>
        <BenchmarkSuiteCardTags tags={tags} collectionId={collection.resource.id} />
      </CardBody>
      <CardFooter className="evalhub-benchmark-suite-card__footer">
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className="evalhub-benchmark-suite-card__footer-content"
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              className="evalhub-benchmark-suite-card__footer-summary"
            >
              <Tooltip content={benchmarksTooltip}>
                <button
                  type="button"
                  className="evalhub-benchmark-suite-card__counter evalhub-benchmark-suite-card__tooltip-summary"
                  data-testid={`benchmark-suite-card-benchmarks-${collection.resource.id}`}
                  aria-label={benchmarksSummaryLabel}
                >
                  <RhUiCollectionFillIcon aria-hidden="true" />
                  <span>{benchmarkCount}</span>
                </button>
              </Tooltip>
              <Tooltip content={metricsTooltip}>
                <button
                  type="button"
                  className="evalhub-benchmark-suite-card__counter evalhub-benchmark-suite-card__tooltip-summary"
                  data-testid={`benchmark-suite-card-metrics-${collection.resource.id}`}
                  aria-label={metricsSummaryLabel}
                >
                  <ChartLineIcon aria-hidden="true" />
                  <span>{metrics.length}</span>
                </button>
              </Tooltip>
              <Tooltip content={evaluationTargetsTooltip}>
                <button
                  type="button"
                  className="evalhub-benchmark-suite-card__counter evalhub-benchmark-suite-card__tooltip-summary"
                  data-testid={`benchmark-suite-card-evaluation-targets-${collection.resource.id}`}
                  aria-label={evaluationTargetsSummaryLabel}
                >
                  <CubeIcon aria-hidden="true" />
                  <span>{evaluationTargetNames.length}</span>
                </button>
              </Tooltip>
              {showRunCount && (
                <Tooltip content={runCountTooltip}>
                  <button
                    type="button"
                    className="evalhub-benchmark-suite-card__counter evalhub-benchmark-suite-card__counter--run-count evalhub-benchmark-suite-card__tooltip-summary"
                    data-testid={`benchmark-suite-card-run-count-${collection.resource.id}`}
                    aria-label={runCountTooltip}
                  >
                    <PlayIcon aria-hidden="true" />
                    <span>{runCount}</span>
                  </button>
                </Tooltip>
              )}
            </Flex>
          </FlexItem>
          <FlexItem>{actionFooter}</FlexItem>
        </Flex>
      </CardFooter>
    </Card>
  );
};

export default BenchmarkSuiteCard;
