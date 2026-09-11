import React from 'react';
import FeatureStoreObjectIcon from './FeatureStoreObjectIcon';
import {
  getEntityTypeFsObjectType,
  LINEAGE_PILL_ICON_SIZE,
  LineageEntityType,
} from '../utils/featureStoreObjects';

type FeatureStoreLineagePillIconProps = {
  entityType: LineageEntityType;
  selected?: boolean;
  size?: number;
};

/**
 * Renders the same circular badge icon used on the overview metric cards.
 * Intended for use inside an SVG foreignObject on lineage pills.
 */
const FeatureStoreLineagePillIcon: React.FC<FeatureStoreLineagePillIconProps> = ({
  entityType,
  selected = false,
  size = LINEAGE_PILL_ICON_SIZE,
}) => {
  const objectType = getEntityTypeFsObjectType(entityType);

  const icon = selected ? (
    <FeatureStoreObjectIcon
      objectType={objectType}
      size={size}
      showBackground={false}
      useTypedColors={false}
      iconColor="var(--ai-fs-lineage-pill--AccentIconColor)"
    />
  ) : (
    <FeatureStoreObjectIcon objectType={objectType} size={size} useTypedColors />
  );

  return (
    <div
      data-testid="lineage-pill-type-icon"
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
      }}
    >
      {icon}
    </div>
  );
};

export default FeatureStoreLineagePillIcon;
