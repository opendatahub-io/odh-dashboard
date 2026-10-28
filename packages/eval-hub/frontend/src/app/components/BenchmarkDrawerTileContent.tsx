import * as React from 'react';
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  List,
  ListItem,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import {
  ProviderAgentMetadata,
  ProviderBenchmarkPassCriteria,
  ProviderBenchmarkScore,
  TestDataRef,
} from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { getBenchmarkDatasetUrl } from '~/app/utilities/benchmarkDatasetUrls';
import InlineTooltip from '~/app/components/InlineTooltip';
import { formatThresholdValue } from '~/app/utilities/evaluationUtils';
import { capitalizeFirst, getMetricDisplayName, toSafeExternalUrl } from './benchmarkUtils';
import { SOURCE_LABELS } from './BenchmarkTestDataRefFields';

type BenchmarkDrawerTileContentProps = {
  name: string;
  id: string;
  description?: string;
  metrics?: string[];
  providerName?: string;
  providerAgent?: ProviderAgentMetadata;
  primaryScore?: ProviderBenchmarkScore;
  passCriteria?: ProviderBenchmarkPassCriteria;
  testDataRef?: TestDataRef;
  url?: string;
  trackingSurface: string;
  showHeader?: boolean;
  isCollapsible?: boolean;
  isCompact?: boolean;
};

type TestDataRefDetail = {
  label: string;
  value: string;
};

type TestDataRefSummary = {
  source: string;
  typeLabel?: string;
  details: TestDataRefDetail[];
};

const getTestDataRefTypeLabel = (type?: string): string | undefined => {
  if (!type) {
    return undefined;
  }
  if (type === 'pre_recorded_data') {
    return 'Pre-recorded data';
  }
  if (type === 'data_set') {
    return 'Data set';
  }
  return capitalizeFirst(type.replace(/_/g, ' '));
};

const buildTestDataRefDetails = (
  entries: [label: string, value: string | undefined][],
): TestDataRefDetail[] => entries.flatMap(([label, value]) => (value ? [{ label, value }] : []));

/**
 * Flattens a benchmark's test_data_ref into the definition rendered on the card.
 * Exactly one source is set per the API contract, so the first match wins.
 * A missing or source-less ref falls back to the "None" summary so the section
 * still renders, mirroring the None option in the test data source dropdown.
 */
const summarizeTestDataRef = (ref?: TestDataRef): TestDataRefSummary | undefined => {
  if (ref?.s3) {
    return {
      source: SOURCE_LABELS.s3,
      typeLabel: getTestDataRefTypeLabel(ref.s3.type),
      details: buildTestDataRefDetails([
        ['Bucket', ref.s3.bucket],
        ['Object key or prefix', ref.s3.key],
        ['Secret', ref.s3.secret_ref],
      ]),
    };
  }
  if (ref?.pvc) {
    return {
      source: SOURCE_LABELS.pvc,
      typeLabel: getTestDataRefTypeLabel(ref.pvc.type),
      details: buildTestDataRefDetails([
        ['Claim name', ref.pvc.claim_name],
        ['Sub path', ref.pvc.sub_path],
      ]),
    };
  }
  if (ref?.git) {
    return {
      source: SOURCE_LABELS.git,
      typeLabel: getTestDataRefTypeLabel(ref.git.type),
      details: buildTestDataRefDetails([
        ['Repository URL', ref.git.url],
        ['Git reference', ref.git.ref],
        ['Sub path', ref.git.sub_path],
        ['Secret', ref.git.secret_ref],
      ]),
    };
  }
  if (ref?.hf) {
    return {
      source: SOURCE_LABELS.hf,
      typeLabel: getTestDataRefTypeLabel(ref.hf.type),
      details: buildTestDataRefDetails([
        ['Repository ID', ref.hf.repo_id],
        ['Revision', ref.hf.revision],
        ['Sub path', ref.hf.sub_path],
        ['Secret', ref.hf.secret_ref],
      ]),
    };
  }
  return undefined;
};

const NONE_TEST_DATA_REF_SUMMARY: TestDataRefSummary = {
  source: SOURCE_LABELS[''],
  details: [],
};

const BenchmarkDrawerTileContent: React.FC<BenchmarkDrawerTileContentProps> = ({
  name,
  id,
  description,
  metrics,
  providerName,
  providerAgent,
  primaryScore,
  passCriteria,
  testDataRef,
  url,
  trackingSurface,
  showHeader = true,
  isCollapsible = false,
  isCompact = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const resolvedUrl = toSafeExternalUrl(url) ?? getBenchmarkDatasetUrl(id);
  const testDataRefSummary = summarizeTestDataRef(testDataRef) ?? NONE_TEST_DATA_REF_SUMMARY;

  const compactFontStyle: React.CSSProperties | undefined = isCompact
    ? { fontSize: 'var(--pf-t--global--font--size--sm)' }
    : undefined;

  const testDataDetailFontStyle: React.CSSProperties = {
    fontSize: isCompact
      ? 'var(--pf-t--global--font--size--xs)'
      : 'var(--pf-t--global--font--size--sm)',
  };

  const testDataListStyle: React.CSSProperties = {
    paddingInlineStart: 'var(--pf-t--global--spacer--sm)',
  };

  const subtleStyle: React.CSSProperties = {
    color: 'var(--pf-t--global--text--color--subtle)',
    margin: 0,
    ...compactFontStyle,
  };

  const hasMetrics = metrics && metrics.length > 0;
  const hasDescriptionList =
    hasMetrics || providerName || primaryScore || passCriteria || !!testDataRefSummary;
  const collapsible = isCollapsible && showHeader && (!!description || !!hasDescriptionList);

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: isCompact ? 'gapSm' : 'gapMd' }}>
      {showHeader && (
        <>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              <FlexItem>
                {collapsible ? (
                  <Button
                    variant="plain"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${name}`}
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded((prev) => !prev)}
                    isInline
                    icon={isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                  >
                    <span
                      style={{
                        fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
                      }}
                    >
                      {name}
                    </span>
                  </Button>
                ) : (
                  <Content
                    component="p"
                    style={{
                      fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
                      margin: 0,
                    }}
                  >
                    {name}
                  </Content>
                )}
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Content component="p" style={subtleStyle}>
              {providerName ? `${id} · ${providerName}` : id}
            </Content>
          </FlexItem>
        </>
      )}

      <FlexItem>
        {resolvedUrl ? (
          <Button
            variant="link"
            isInline
            component="a"
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            style={compactFontStyle}
            onClick={() =>
              trackEvalHubEvent(EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED, {
                url: resolvedUrl,
                benchmarkId: id,
                surface: trackingSurface,
              })
            }
          >
            View benchmark dataset
          </Button>
        ) : (
          <Content component="p" style={subtleStyle}>
            Dataset link unavailable
          </Content>
        )}
      </FlexItem>

      {(!collapsible || isExpanded) && (
        <>
          {description && (
            <FlexItem>
              <DescriptionList isCompact={isCompact} isAutoFit={isCompact}>
                <DescriptionListGroup>
                  <DescriptionListTerm style={compactFontStyle}>Description</DescriptionListTerm>
                  <DescriptionListDescription style={compactFontStyle}>
                    {description}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </FlexItem>
          )}

          {hasDescriptionList && (
            <FlexItem>
              <DescriptionList isCompact={isCompact} isAutoFit={isCompact}>
                {hasMetrics && (
                  <DescriptionListGroup>
                    <DescriptionListTerm style={compactFontStyle}>
                      Metrics evaluated
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      <LabelGroup numLabels={metrics.length} isCompact>
                        {metrics.map((metric) => (
                          <Label key={metric} isCompact variant="outline">
                            {getMetricDisplayName(metric)}
                          </Label>
                        ))}
                      </LabelGroup>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {primaryScore && (
                  <DescriptionListGroup>
                    <DescriptionListTerm style={compactFontStyle}>
                      Primary scorer metric
                    </DescriptionListTerm>
                    <DescriptionListDescription style={compactFontStyle}>
                      {primaryScore.metric}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {passCriteria && (
                  <DescriptionListGroup>
                    <DescriptionListTerm style={compactFontStyle}>
                      Benchmark threshold
                    </DescriptionListTerm>
                    <DescriptionListDescription style={compactFontStyle}>
                      {formatThresholdValue(passCriteria.threshold, primaryScore?.metric)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm style={compactFontStyle}>Test data</DescriptionListTerm>
                  <DescriptionListDescription data-testid="benchmark-test-data-ref">
                    <DescriptionList
                      isCompact={isCompact}
                      isAutoFit={isCompact}
                      style={testDataListStyle}
                    >
                      <DescriptionListGroup>
                        <DescriptionListTerm style={testDataDetailFontStyle}>
                          Source
                        </DescriptionListTerm>
                        <DescriptionListDescription style={testDataDetailFontStyle}>
                          {testDataRefSummary.source}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      {testDataRefSummary.typeLabel && (
                        <DescriptionListGroup>
                          <DescriptionListTerm style={testDataDetailFontStyle}>
                            Data type
                          </DescriptionListTerm>
                          <DescriptionListDescription style={testDataDetailFontStyle}>
                            {testDataRefSummary.typeLabel}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                      {testDataRefSummary.details.map((detail) => (
                        <DescriptionListGroup key={detail.label}>
                          <DescriptionListTerm style={testDataDetailFontStyle}>
                            {detail.label}
                          </DescriptionListTerm>
                          <DescriptionListDescription style={testDataDetailFontStyle}>
                            {detail.value}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      ))}
                    </DescriptionList>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {providerName && (
                  <DescriptionListGroup>
                    <DescriptionListTerm style={compactFontStyle}>
                      Evaluation framework
                    </DescriptionListTerm>
                    <DescriptionListDescription style={compactFontStyle}>
                      {Array.isArray(providerAgent?.recommended_when) &&
                      providerAgent.recommended_when.length > 0 ? (
                        <InlineTooltip
                          text={providerName}
                          data-testid="benchmark-provider-tooltip"
                          tooltip={
                            <div className="evalhub-inline-tooltip__content">
                              <div className="evalhub-inline-tooltip__header">
                                <strong>Recommended when:</strong>
                              </div>
                              <List>
                                {providerAgent.recommended_when.map((item) => (
                                  <ListItem key={item}>{item}</ListItem>
                                ))}
                              </List>
                            </div>
                          }
                        />
                      ) : (
                        providerName
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {providerAgent?.target_type && (
                  <DescriptionListGroup>
                    <DescriptionListTerm style={compactFontStyle}>Target type</DescriptionListTerm>
                    <DescriptionListDescription style={compactFontStyle}>
                      {capitalizeFirst(providerAgent.target_type)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </FlexItem>
          )}
        </>
      )}
    </Flex>
  );
};

export default BenchmarkDrawerTileContent;
