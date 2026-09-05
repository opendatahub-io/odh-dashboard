import React from 'react';
import { Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core';
import {
  getEntityTypeIcon,
  getEntityTypeBackgroundColor,
  LINEAGE_OBJECT_TYPE_LEGEND,
} from '../utils/featureStoreObjects';

const FeatureStoreLineageLegend: React.FC = () => (
  <div
    data-testid="feature-store-lineage-legend"
    className="pf-v6-u-p-sm"
    style={{
      position: 'absolute',
      top: 'var(--pf-t--global--spacer--md)',
      left: 'var(--pf-t--global--spacer--md)',
      zIndex: 2,
      borderRadius: 'var(--pf-t--global--border--radius--medium)',
      backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
      border: '1px solid var(--pf-t--global--border--color--default)',
      boxShadow: 'var(--pf-t--global--box-shadow--sm)',
      pointerEvents: 'none',
    }}
  >
    <Stack hasGutter>
      <StackItem>
        <span className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm">Legend</span>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: 'var(--pf-t--global--border--radius--small)',
                      backgroundColor: getEntityTypeBackgroundColor(entityType),
                    }}
                  >
                    {getEntityTypeIcon(entityType, false)}
                  </div>
                </FlexItem>
                <FlexItem className="pf-v6-u-font-size-sm">{label}</FlexItem>
              </Flex>
            </StackItem>
          ))}
        </Stack>
      </StackItem>
    </Stack>
  </div>
);

export default FeatureStoreLineageLegend;
