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
  List,
  ListItem,
  MenuToggle,
  MenuToggleAction,
  Tooltip,
} from '@patternfly/react-core';
import {
  RhStandardBrainIcon,
  RhUiAssessmentIcon,
  RhUiCheckClipboardIcon,
  RhUiCodeIcon,
  RhUiCubesIcon,
  EllipsisVIcon,
  OutlinedPlayCircleIcon,
  RhUiStarFillIcon,
  RhUiDocumentIcon,
  RhUiPlugIcon,
  RhUiSecuredIcon,
  RhUiSecurityIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import type { MenuToggleElement } from '@patternfly/react-core';
import type { Collection } from '~/app/types';
import {
  formatCategory,
  getBenchmarkDisplayName,
  getMetricDisplayName,
  VISIBLE_METRICS_COUNT,
} from './benchmarkUtils';
import type { BenchmarkNameMap } from './benchmarkUtils';
import './BenchmarkSuiteCard.scss';

const POPULAR_CURATION_ORDERS = new Set([1, 2, 3]);

export const isPopularCollection = (collection: Collection): boolean =>
  collection.curation_order !== undefined && POPULAR_CURATION_ORDERS.has(collection.curation_order);

type DomainIcon = React.ComponentType<React.ComponentProps<typeof RhStandardBrainIcon>>;
type DomainIconColor =
  'blue' | 'cyan' | 'green' | 'orange' | 'orangered' | 'purple' | 'red' | 'teal' | 'yellow';
type DomainIconConfig = { icon: DomainIcon; color: DomainIconColor };

/* eslint-disable camelcase */
const DOMAIN_ICON_CONFIG: Partial<Record<string, DomainIconConfig>> = {
  knowledge_and_reasoning: { icon: RhStandardBrainIcon, color: 'purple' },
  grounded_document_understanding: { icon: RhUiDocumentIcon, color: 'blue' },
  instruction_and_output_reliability: { icon: RhUiCheckClipboardIcon, color: 'green' },
  tool_use_and_function_calling: { icon: RhUiPlugIcon, color: 'yellow' },
  software: { icon: RhUiCodeIcon, color: 'orange' },
  trustworthiness: { icon: RhUiSecuredIcon, color: 'red' },
  multilingual: { icon: RhUiAssessmentIcon, color: 'teal' },
  multimodal: { icon: RhUiCubesIcon, color: 'orangered' },
  safety: { icon: RhUiSecurityIcon, color: 'yellow' },
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
  const evaluationTargetNames = [...new Set(collection.evaluation_targets ?? [])]
    .map(formatCategory)
    .toSorted((first, second) => first.localeCompare(second));
  const evaluationTargetLabel = evaluationTargetNames.length
    ? evaluationTargetNames.length === 1
      ? `${evaluationTargetNames[0]} evaluation`
      : `${evaluationTargetNames.length} evaluations`
    : 'Evaluation';
  const benchmarkNames = (collection.benchmarks ?? [])
    .map((benchmark) => ({
      id: benchmark.id,
      name: getBenchmarkDisplayName(benchmark, benchmarkNameMap),
    }))
    .toSorted((first, second) => first.name.localeCompare(second.name));
  const benchmarkCount = collection.benchmarks?.length ?? 0;
  const isPopular = isPopularCollection(collection);
  const actions = contextualActions ?? [];
  const hasContextualActions = actions.length > 0;
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
  const metricsTooltip = (
    <div className="evalhub-benchmark-suite-card__tooltip-content">
      <strong>Metrics</strong>
      <List className="evalhub-benchmark-suite-card__tooltip-list">
        {metricNames.map((metric) => (
          <ListItem key={metric}>{metric}</ListItem>
        ))}
      </List>
    </div>
  );
  const metricsLabelGroup = (
    <LabelGroup
      className="evalhub-benchmark-suite-card__metrics"
      numLabels={VISIBLE_METRICS_COUNT}
      isCompact
      aria-label="Metrics"
      data-testid={`benchmark-suite-card-metrics-${collection.resource.id}`}
    >
      {metricNames.map((metric) => (
        <Label key={metric} isCompact variant="outline">
          {metric}
        </Label>
      ))}
    </LabelGroup>
  );
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
  const contextualActionsMenu = hasContextualActions ? (
    <Dropdown
      isOpen={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      onSelect={() => setIsMenuOpen(false)}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          variant="plain"
          className="evalhub-benchmark-suite-card__contextual-actions"
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
  ) : null;

  return (
    <Card
      className={`evalhub-benchmark-suite-card evalhub-benchmark-suite-card--${iconColor}`}
      isFullHeight
      data-testid={`benchmark-suite-card-${collection.resource.id}`}
    >
      {(isPopular || reservePopularHeader) && (
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
                  color="teal"
                  variant="outline"
                  isCompact
                  icon={<RhUiStarFillIcon aria-hidden="true" />}
                  data-testid={`benchmark-suite-card-popular-${collection.resource.id}`}
                >
                  Recommended
                </Label>
              </FlexItem>
            )}
            {!isPopular && reservePopularHeader && (
              <FlexItem aria-hidden="true">
                <Label
                  color="teal"
                  variant="outline"
                  isCompact
                  icon={<RhUiStarFillIcon aria-hidden="true" />}
                  className="evalhub-benchmark-suite-card__popular-placeholder"
                  data-testid={`benchmark-suite-card-popular-placeholder-${collection.resource.id}`}
                >
                  Recommended
                </Label>
              </FlexItem>
            )}
          </Flex>
        </CardHeader>
      )}
      <CardTitle className="evalhub-benchmark-suite-card__title">
        <div className="evalhub-benchmark-suite-card__title-content">
          {DomainIcon && (
            <Tooltip content={formatCategory(iconDomain)}>
              <span
                className={`evalhub-benchmark-suite-card__domain-icon evalhub-benchmark-suite-card__domain-icon--${iconColor}`}
                data-testid={`benchmark-suite-card-domain-icon-${collection.resource.id}`}
                data-icon-color={iconColor}
                role="img"
                aria-label={formatCategory(iconDomain)}
                title={formatCategory(iconDomain)}
              >
                <DomainIcon aria-hidden="true" />
              </span>
            </Tooltip>
          )}
          <span className="evalhub-benchmark-suite-card__category">
            {formatCategory(collection.category ?? iconDomain)}
          </span>
          {contextualActionsMenu}
        </div>
        {onSelect ? (
          <Button
            variant="link"
            isInline
            className="evalhub-benchmark-suite-card__title-button"
            onClick={() => onSelect(collection)}
            data-testid={`benchmark-suite-card-name-${collection.resource.id}`}
          >
            <span className="evalhub-benchmark-suite-card__title-name">{collection.name}</span>
          </Button>
        ) : (
          <span className="evalhub-benchmark-suite-card__title-name">{collection.name}</span>
        )}
      </CardTitle>
      <CardBody className="evalhub-benchmark-suite-card__body">
        <div className="evalhub-benchmark-suite-card__metadata">
          {evaluationTargetNames.length > 1 ? (
            <Tooltip content={evaluationTargetsTooltip}>
              <button
                type="button"
                className="evalhub-benchmark-suite-card__metadata-button"
                data-testid={`benchmark-suite-card-evaluation-targets-${collection.resource.id}`}
                aria-label={evaluationTargetsSummaryLabel}
              >
                {evaluationTargetLabel}
              </button>
            </Tooltip>
          ) : (
            <span className="evalhub-benchmark-suite-card__metadata-label">
              {evaluationTargetLabel}
            </span>
          )}
          <span aria-hidden="true">·</span>
          <Tooltip content={benchmarksTooltip}>
            <button
              type="button"
              className="evalhub-benchmark-suite-card__metadata-button"
              data-testid={`benchmark-suite-card-benchmarks-${collection.resource.id}`}
              aria-label={benchmarksSummaryLabel}
            >
              {benchmarkCount} {benchmarkCount === 1 ? 'benchmark' : 'benchmarks'}
            </button>
          </Tooltip>
        </div>
        <Content
          component="p"
          className="evalhub-benchmark-suite-card__description"
          title={collection.description || 'No description provided'}
        >
          {collection.description || <em>No description provided</em>}
        </Content>
      </CardBody>
      <CardFooter className="evalhub-benchmark-suite-card__footer">
        {metricNames.length > 0 && (
          <div
            className="evalhub-benchmark-suite-card__footer-metrics"
            data-testid={`benchmark-suite-card-footer-metrics-${collection.resource.id}`}
          >
            {metricNames.length > VISIBLE_METRICS_COUNT ? (
              <Tooltip content={metricsTooltip}>{metricsLabelGroup}</Tooltip>
            ) : (
              metricsLabelGroup
            )}
          </div>
        )}
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{
            default: showRunCount ? 'justifyContentSpaceBetween' : 'justifyContentFlexStart',
          }}
          className="evalhub-benchmark-suite-card__footer-content"
        >
          <FlexItem>{actionFooter}</FlexItem>
          {showRunCount && (
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                className="evalhub-benchmark-suite-card__footer-summary"
              >
                <Tooltip content={runCountTooltip}>
                  <button
                    type="button"
                    className="evalhub-benchmark-suite-card__counter evalhub-benchmark-suite-card__counter--run-count evalhub-benchmark-suite-card__tooltip-summary"
                    data-testid={`benchmark-suite-card-run-count-${collection.resource.id}`}
                    aria-label={runCountTooltip}
                  >
                    <span className="evalhub-benchmark-suite-card__counter-value">
                      <OutlinedPlayCircleIcon aria-hidden="true" />
                      <span className="evalhub-benchmark-suite-card__counter-label">Runs:</span>
                      <span>{runCount}</span>
                    </span>
                  </button>
                </Tooltip>
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </CardFooter>
    </Card>
  );
};

export default BenchmarkSuiteCard;
