import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import './ModuleHeader.scss';

type ModuleHeaderProps = {
  icon: React.ReactNode;
  label: string;
  /** Prefix used to build the `data-testid`s of the icon container and icon. Defaults to `module-header`. */
  testIdPrefix?: string;
};

/**
 * A page-title header consisting of a circular icon badge next to a text
 * label. Carries no vocabulary of its own — callers supply the icon and
 * label text.
 */
const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  icon,
  label,
  testIdPrefix = 'module-header',
}) => {
  const sizedIcon = React.isValidElement<{ className?: string; 'data-testid'?: string }>(icon)
    ? React.cloneElement(icon, {
        className: ['autox-module-header__icon', icon.props.className].filter(Boolean).join(' '),
        'data-testid': icon.props['data-testid'] ?? `${testIdPrefix}-icon`,
      })
    : icon;

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        <div
          className="autox-module-header__icon-container"
          data-testid={`${testIdPrefix}-icon-container`}
        >
          {sizedIcon}
        </div>
      </FlexItem>
      <FlexItem>{label}</FlexItem>
    </Flex>
  );
};

export default ModuleHeader;
