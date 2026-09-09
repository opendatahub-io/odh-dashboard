import React from 'react';
import { Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core';
import '@odh-dashboard/ui-core/design/vars.scss';
import { getEntityTypeIcon, LINEAGE_OBJECT_TYPE_LEGEND } from '../utils/featureStoreObjects';
import './FeatureStoreLineageLegend.scss';

const FeatureStoreLineageLegend: React.FC = () => (
  <div data-testid="feature-store-lineage-legend" className="feature-store-lineage-legend">
    <Stack hasGutter>
      <StackItem>
        <span className="feature-store-lineage-legend__title">Legend</span>
      </StackItem>
      <StackItem>
        <Stack role="list" aria-label="Lineage object type legend" hasGutter>
          {LINEAGE_OBJECT_TYPE_LEGEND.map(({ type, label, entityType }) => (
            <StackItem key={type} role="listitem">
              <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <div
                    data-testid={`feature-store-lineage-legend-${type}`}
                    aria-hidden="true"
                    className={`feature-store-lineage-legend-swatch feature-store-lineage-legend-swatch--${type}`}
                  >
                    {getEntityTypeIcon(entityType, false, 16, true)}
                  </div>
                </FlexItem>
                <FlexItem className="feature-store-lineage-legend__label">{label}</FlexItem>
              </Flex>
            </StackItem>
          ))}
        </Stack>
      </StackItem>
    </Stack>
  </div>
);

export default FeatureStoreLineageLegend;
