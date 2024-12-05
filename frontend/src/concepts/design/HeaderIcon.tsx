import * as React from 'react';
import {
  sectionTypeBackgroundColor,
  typedBackgroundColor,
  ProjectObjectType,
  SectionType,
} from '~/concepts/design/utils';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';

interface HeaderIconProps {
  size?: number;
  padding?: number;
  display?: string;
  type: ProjectObjectType;
  sectionType?: SectionType;
}

const HeaderIcon: React.FC<HeaderIconProps> = ({
  size = 40,
  padding = 4,
  display = 'inline-block',
  type,
  sectionType,
}) => (
  <div
    style={{
      display,
      width: size,
      height: size,
      padding,
      borderRadius: size / 2,
      background: sectionType
        ? sectionTypeBackgroundColor(sectionType)
        : typedBackgroundColor(type),
    }}
  >
    <TypedObjectIcon
      resourceType={type}
      style={{ width: size - padding * 2, height: size - padding * 2 }}
    />
  </div>
);

export default HeaderIcon;
