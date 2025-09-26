import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import '@odh-dashboard/internal/concepts/design/vars.scss';
import '@odh-dashboard/internal/concepts/design/utils';
import {
  getFeatureStoreObjectIcon,
  getFeatureStoreObjectBackgroundColor,
  getFeatureStoreObjectIconColor,
  FeatureStoreObjectType,
} from '../utils';

interface FeatureStoreObjectIconProps {
  objectType: FeatureStoreObjectType;
  title?: React.ReactNode;
  size?: number;
  padding?: number;
  showBackground?: boolean;
  backgroundColor?: string;
  iconColor?: string;
  useTypedColors?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const FeatureStoreObjectIcon: React.FC<FeatureStoreObjectIconProps> = ({
  objectType,
  title,
  size = 40,
  padding = 4,
  showBackground = true,
  backgroundColor,
  iconColor,
  useTypedColors = true,
  className,
  style,
}) => {
  const IconComponent = getFeatureStoreObjectIcon(objectType);

  const finalIconColor = useTypedColors
    ? getFeatureStoreObjectIconColor(objectType)
    : iconColor || '#e00';

  const finalBackgroundColor = useTypedColors
    ? getFeatureStoreObjectBackgroundColor(objectType)
    : backgroundColor || '#f0f0f0';

  const iconContainer = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        padding,
        borderRadius: size / 2,
        background: showBackground ? finalBackgroundColor : 'transparent',
        color: finalIconColor,
      }}
    >
      <div
        style={{
          width: size - padding * 2,
          height: size - padding * 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            fontSize: size - padding * 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconComponent />
        </div>
      </div>
    </div>
  );

  if (!title) {
    return (
      <div className={className} style={style}>
        {iconContainer}
      </div>
    );
  }

  return (
    <Flex
      spaceItems={{ default: 'spaceItemsSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      className={className}
      style={style}
    >
      <FlexItem>{iconContainer}</FlexItem>
      <FlexItem>{title}</FlexItem>
    </Flex>
  );
};

export default FeatureStoreObjectIcon;
