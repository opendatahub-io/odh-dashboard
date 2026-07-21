import React from 'react';
import { Label } from '@patternfly/react-core';
import type { McpCatalogCardLabelProps } from '@mf/modelRegistry/extension-points';

enum SupportTier {
  COMMUNITY = 'communitySupported',
  PARTNER = 'partnerSupported',
  RED_HAT = 'redHatSupported',
}

const SUPPORT_TIER_DISPLAY: Record<SupportTier, string> = {
  [SupportTier.COMMUNITY]: 'Community Supported',
  [SupportTier.PARTNER]: 'Partner Supported',
  [SupportTier.RED_HAT]: 'Red Hat Supported',
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
  if (!isSupportTier(prop.string_value)) {
    return null;
  }

  return (
    <Label data-testid={`mcp-catalog-card-support-tier-${server.id}`}>
      {SUPPORT_TIER_DISPLAY[prop.string_value]}
    </Label>
  );
};

export default McpSupportTierLabel;
