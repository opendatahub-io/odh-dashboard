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
import { BarsIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { ODH_LOGO, ODH_PRODUCT_NAME } from '~/utilities/const';
import { useUser } from '~/redux/selectors';
import HeaderTools from './HeaderTools';

type HeaderProps = {
  onNotificationsClick: () => void;
};

const MastheadBranchComponent: React.FC<React.ComponentProps<typeof Link>> = (props) => (
  <Link {...props} to="/" />
);

const Header: React.FC<HeaderProps> = ({ onNotificationsClick }) => {
  const { isAllowed } = useUser();
  return (
    <Masthead role="banner" aria-label="page masthead">
      <MastheadMain>
        {isAllowed && (
          <MastheadToggle>
            <PageToggleButton
              id="page-nav-toggle"
              variant="plain"
              aria-label="Dashboard navigation"
            >
              <BarsIcon />
            </PageToggleButton>
          </MastheadToggle>
        )}
        <MastheadBrand data-codemods>
          <MastheadLogo data-codemods component={MastheadBranchComponent}>
            <Brand
              className="odh-dashboard__brand"
              src={`${window.location.origin}/images/${ODH_LOGO}`}
              alt={`${ODH_PRODUCT_NAME} Logo`}
            />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <HeaderTools onNotificationsClick={onNotificationsClick} />
      </MastheadContent>
    </Masthead>
  );
};

export default Header;
