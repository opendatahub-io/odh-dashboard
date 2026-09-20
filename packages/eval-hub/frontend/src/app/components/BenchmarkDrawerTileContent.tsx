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
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  ProviderAgentMetadata,
  ProviderBenchmarkPassCriteria,
  ProviderBenchmarkScore,
} from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { getBenchmarkDatasetUrl } from '~/app/utilities/benchmarkDatasetUrls';
import InlineTooltip from '~/app/components/InlineTooltip';
import { formatAsPercentage } from '~/app/utilities/evaluationUtils';
import { capitalizeFirst, getMetricDisplayName, toSafeExternalUrl } from './benchmarkUtils';

type BenchmarkDrawerTileContentProps = {
  name: string;
  id: string;
  description?: string;
  metrics?: string[];
  providerName?: string;
  providerAgent?: ProviderAgentMetadata;
  primaryScore?: ProviderBenchmarkScore;
  passCriteria?: ProviderBenchmarkPassCriteria;
  url?: string;
  trackingSurface: string;
  showHeader?: boolean;
  isCollapsible?: boolean;
  isCompact?: boolean;
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
  url,
  trackingSurface,
  showHeader = true,
  isCollapsible = false,
  isCompact = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const resolvedUrl = toSafeExternalUrl(url) ?? getBenchmarkDatasetUrl(id);

  const compactFontStyle: React.CSSProperties | undefined = isCompact
    ? { fontSize: 'var(--pf-t--global--font--size--sm)' }
    : undefined;

  const subtleStyle: React.CSSProperties = {
    color: 'var(--pf-t--global--text--color--subtle)',
    margin: 0,
    ...compactFontStyle,
  };

  const hasMetrics = metrics && metrics.length > 0;
  const hasDescriptionList = hasMetrics || providerName || primaryScore || passCriteria;
  const collapsible = isCollapsible && showHeader && (!!description || !!hasDescriptionList);

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: isCompact ? 'gapSm' : 'gapMd' }}>
      {showHeader && (
        <>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              {collapsible && (
                <FlexItem>
                  <Button
                    variant="plain"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    onClick={() => setIsExpanded((prev) => !prev)}
                    isInline
                  >
                    {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                  </Button>
                </FlexItem>
              )}
              <FlexItem>
                <Content
                  component="p"
                  style={{
                    fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
                    margin: 0,
                  }}
                >
                  {name}
                </Content>
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
              fireMiscTrackingEvent(EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED, {
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
                      {formatAsPercentage(passCriteria.threshold)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
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
