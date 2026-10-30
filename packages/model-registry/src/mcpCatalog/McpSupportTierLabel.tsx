import React from 'react';
import { Label } from '@patternfly/react-core';
import type { McpCatalogCardLabelProps } from '@mf/modelRegistry/extension-points';

enum SupportTier {
  COMMUNITY = 'communitySupported',
  PARTNER = 'partnerSupported',
  RED_HAT = 'redHatSupported',
}

const SUPPORT_TIER_DISPLAY: Record<SupportTier, string> = {
  [SupportTier.COMMUNITY]: 'Community supported',
  [SupportTier.PARTNER]: 'Partner supported',
  [SupportTier.RED_HAT]: 'Red Hat supported',
};

const SUPPORT_TIER_VALUES = new Set<string>(Object.values(SupportTier));

const isSupportTier = (value: string): value is SupportTier => SUPPORT_TIER_VALUES.has(value);

const METADATA_TYPE_STRING = 'MetadataStringValue';

const McpSupportTierLabel: React.FC<McpCatalogCardLabelProps> = ({ server }) => {
  const prop = server.customProperties?.supportTier;
  if (!prop || prop.metadataType !== METADATA_TYPE_STRING) {
    return null;
  }
  if (!('string_value' in prop) || typeof prop.string_value !== 'string') {
    return null;
  }
  // Typed as string so the guard narrows it even when the federated McpServer type is unresolved.
  const tier: string = prop.string_value;
  if (!isSupportTier(tier)) {
    return null;
  }

  return (
    <Label data-testid={`mcp-catalog-card-support-tier-${server.id}`}>
      {SUPPORT_TIER_DISPLAY[tier]}
    </Label>
  );
};

export default McpSupportTierLabel;
