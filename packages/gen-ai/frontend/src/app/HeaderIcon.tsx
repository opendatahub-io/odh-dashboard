import * as React from 'react';
import { IconType } from '~/app/types';
import './HeaderIcon.css';

const ICON_SIZE = 40;
const ICON_PADDING = 4;
const ICON_BACKGROUND_COLOR = 'var(--gen-ai-header-icon-bg)';

const INNER_ICON_SIZE = ICON_SIZE - ICON_PADDING * 2;

const containerStyle: React.CSSProperties = {
  background: ICON_BACKGROUND_COLOR,
  borderRadius: ICON_SIZE / 2,
  padding: ICON_PADDING,
  width: ICON_SIZE,
  height: ICON_SIZE,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const iconStyle: React.CSSProperties = {
  width: INNER_ICON_SIZE,
  height: INNER_ICON_SIZE,
};

interface HeaderIconProps {
  icon: IconType;
}

const HeaderIcon: React.FC<HeaderIconProps> = ({ icon: IconComponent }) => (
  <div style={containerStyle}>
    <IconComponent style={iconStyle} />
  </div>
);

export default HeaderIcon;
