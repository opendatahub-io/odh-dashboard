import React from 'react';
import {
  Brand,
  Masthead,
  MastheadLogo,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  MastheadBrand,
  PageToggleButton,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ODH_LOGO, ODH_LOGO_DARK, ODH_PRODUCT_NAME } from '#~/utilities/const';
import { useUser } from '#~/redux/selectors';

import { FeatureFlagLauncherProps } from '#~/app/featureFlags/FeatureFlagLauncher';
import { useThemeContext } from './ThemeContext';
import HeaderTools from './HeaderTools';

type HeaderProps = {
  onNotificationsClick: () => void;
};

type Props = HeaderProps & FeatureFlagLauncherProps;

const MastheadBranchComponent: React.FC<React.ComponentProps<typeof Link>> = (props) => (
  <Link {...props} to="/" />
);

const Header: React.FC<Props> = (props) => {
  const { isAllowed } = useUser();
  const { theme } = useThemeContext();
  return (
    <Masthead role="banner" aria-label="page masthead">
      <MastheadMain>
        {isAllowed && (
          <MastheadToggle>
            <PageToggleButton
              id="page-nav-toggle"
              variant="plain"
              aria-label="Dashboard navigation"
              isHamburgerButton
            />
          </MastheadToggle>
        )}
        <MastheadBrand>
          <MastheadLogo component={MastheadBranchComponent}>
            <Brand
              className="odh-dashboard__brand"
              src={`${window.location.origin}/images/${
                theme !== 'dark' ? ODH_LOGO : ODH_LOGO_DARK
              }`}
              alt={`${ODH_PRODUCT_NAME}`}
            />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <HeaderTools {...props} />
      </MastheadContent>
    </Masthead>
  );
};

export default Header;
