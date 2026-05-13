import * as React from 'react';
import {
  SectionType,
  sectionTypeBackgroundColor,
  sectionTypeIconColor,
} from '#~/concepts/design/utils';

type SectionIconProps = {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  sectionType: SectionType;
  size?: number;
  padding?: number;
  display?: string;
};

const SectionIcon: React.FC<SectionIconProps> = ({
  icon: IconComponent,
  sectionType,
  size = 40,
  padding = 8,
  display = 'inline-block',
}) => (
  <div
    aria-hidden
    style={{
      display,
      width: size,
      height: size,
      padding,
      borderRadius: size / 2,
      background: sectionTypeBackgroundColor(sectionType),
      color: sectionTypeIconColor(sectionType),
    }}
  >
    <IconComponent style={{ width: size - padding * 2, height: size - padding * 2 }} />
  </div>
);

export default SectionIcon;
