import React from 'react';
import {
  Brand,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  PageToggleButton,
} from '@patternfly/react-core';
import HeaderTools from './HeaderTools';
import { ODH_LOGO, ODH_PRODUCT_NAME } from '../utilities/const';
import { useUser } from '../redux/selectors';
import { BarsIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';

type HeaderProps = {
  onNotificationsClick: () => void;
};

const Header: React.FC<HeaderProps> = ({ onNotificationsClick }) => {
  const { isAllowed } = useUser();
  return (
    <Masthead>
      {isAllowed && (
        <MastheadToggle>
          <PageToggleButton id="page-nav-toggle" variant="plain" aria-label="Dashboard navigation">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
      )}
      <MastheadMain>
        <MastheadBrand component={(props) => <Link {...props} to="/" />}>
          <Brand heights={{ default: '36px' }} alt={`${ODH_PRODUCT_NAME} Logo`}>
            <source srcSet={`${window.location.origin}/images/${ODH_LOGO}`} />
          </Brand>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <HeaderTools onNotificationsClick={onNotificationsClick} />
      </MastheadContent>
    </Masthead>
  );
};

export default Header;
