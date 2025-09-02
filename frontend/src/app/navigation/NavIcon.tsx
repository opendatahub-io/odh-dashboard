import * as React from 'react';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';

const iconStyle = { width: 14, height: 14, color: 'var(--pf-t--color--gray--40)' };

type NavIconProps =
  | { kind: 'custom'; element: React.ComponentType<{ style?: React.CSSProperties }> }
  | { kind: 'project'; type: ProjectObjectType };

const NavIcon: React.FC<NavIconProps> = (props) =>
  props.kind === 'custom' ? (
    <props.element style={iconStyle} />
  ) : (
    <TypedObjectIcon resourceType={props.type} style={iconStyle} />
  );

export default NavIcon;
