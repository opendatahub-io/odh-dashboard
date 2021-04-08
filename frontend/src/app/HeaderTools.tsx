import React from 'react';
import { connect } from 'react-redux';
import {
  Dropdown,
  DropdownToggle,
  PageHeaderTools,
  PageHeaderToolsGroup,
  PageHeaderToolsItem,
  DropdownItem,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';

type HeaderToolsProps = {
  user: { name: string; token: string };
};

const HeaderTools: React.FC<HeaderToolsProps> = ({ user }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState<boolean>(false);

  const handleLogout = () => {
    setUserMenuOpen(false);
    fetch('/oauth/sign_out')
      .then(() => console.log('logged out'))
      .catch((err) => console.error(err))
      .finally(() => window.location.reload());
  };

  const userMenuItems = [
    <DropdownItem key="logout" onClick={handleLogout}>
      Log out
    </DropdownItem>,
  ];
  const userName = React.useMemo(() => {
    return user?.name?.split('/')?.[0];
  }, [user]);

  return (
    <PageHeaderTools>
      <PageHeaderToolsGroup className="hidden-xs">
        <PageHeaderToolsItem>
          <Dropdown
            toggle={
              <DropdownToggle
                id="toggle-id"
                onToggle={() => setUserMenuOpen(!userMenuOpen)}
                toggleIndicator={CaretDownIcon}
              >
                {userName}
              </DropdownToggle>
            }
            isOpen={userMenuOpen}
            dropdownItems={userMenuItems}
          />
        </PageHeaderToolsItem>
      </PageHeaderToolsGroup>
    </PageHeaderTools>
  );
};

const mapStateToProps = (state) => ({
  user: state.appReducer.user,
});

export default connect(mapStateToProps)(HeaderTools);
