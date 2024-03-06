import * as React from 'react';
import { ProjectObjectType } from '~/pages/projects/types';
import { typedBackgroundColor, typedBorderColor, typedObjectImage } from '~/pages/projects/utils';

interface HeaderIconProps {
  size?: number;
  image?: string;
  imageAlt?: string;
  type: ProjectObjectType;
}

const HeaderIcon: React.FC<HeaderIconProps> = ({ size = 40, image, imageAlt, type }) => (
  <div
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      padding: 2,
      border: `1px solid ${typedBorderColor(type)}`,
      borderRadius: size / 2,
      background: typedBackgroundColor(type),
    }}
  >
    <img
      width={size - 4}
      height={size - 4}
      src={image || typedObjectImage(type)}
      alt={imageAlt || type}
    />
  </div>
);

export default HeaderIcon;
