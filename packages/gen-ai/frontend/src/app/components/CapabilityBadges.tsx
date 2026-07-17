import * as React from 'react';
import { Button, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { getCapabilityDisplay, getVisibleCapabilities } from '~/app/utilities/utils';

type BadgeColor = 'green' | 'purple' | 'teal';
const BADGE_COLORS: Record<string, BadgeColor> = {
  green: 'green',
  purple: 'purple',
  teal: 'teal',
  cyan: 'teal',
};
const toBadgeColor = (color: string): BadgeColor => BADGE_COLORS[color] ?? 'teal';

interface CapabilityBadgesProps {
  capabilities?: string[];
  maxVisible?: number;
}

const CapabilityBadges: React.FunctionComponent<CapabilityBadgesProps> = ({
  capabilities,
  maxVisible = 2,
}) => {
  const visible = getVisibleCapabilities(capabilities);

  if (visible.length === 0) {
    return null;
  }

  const shown = visible.slice(0, maxVisible);
  const overflow = visible.slice(maxVisible);

  return (
    <Flex
      gap={{ default: 'gapXs' }}
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
    >
      {shown.map((cap) => {
        const { label, color } = getCapabilityDisplay(cap);
        return (
          <FlexItem key={cap}>
            <Label isCompact color={toBadgeColor(color)} data-testid={`capability-badge-${cap}`}>
              {label}
            </Label>
          </FlexItem>
        );
      })}
      {overflow.length > 0 && (
        <FlexItem>
          <Tooltip content={overflow.map((c) => getCapabilityDisplay(c).label).join(', ')}>
            <Button
              variant="plain"
              isInline
              className="pf-v6-u-font-size-sm"
              data-testid="capability-overflow"
            >
              +{overflow.length}
            </Button>
          </Tooltip>
        </FlexItem>
      )}
    </Flex>
  );
};

export default CapabilityBadges;
