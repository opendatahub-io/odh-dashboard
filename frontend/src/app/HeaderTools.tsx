import React from 'react';
import { connect } from 'react-redux';
import {
  Button,
  ButtonVariant,
  Dropdown,
  DropdownToggle,
  NotificationBadge,
  PageHeaderTools,
  PageHeaderToolsGroup,
  PageHeaderToolsItem,
  DropdownItem,
} from '@patternfly/react-core';
import { CogIcon, CaretDownIcon } from '@patternfly/react-icons';

type HeaderToolsProps = {
  user: { name: string; token: string };
};

const HeaderTools: React.FC<HeaderToolsProps> = ({ user }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState<boolean>(false);
  const userMenuItems = [<DropdownItem key="logout">Log out</DropdownItem>];
  const userName = React.useMemo(() => {
    return user?.name?.split('/')?.[0];
  }, [user]);

  return (
    <PageHeaderTools>
      <PageHeaderToolsGroup className="hidden-xs">
        <PageHeaderToolsItem>
          <NotificationBadge isRead count={0} />
        </PageHeaderToolsItem>
        <PageHeaderToolsItem>
          <Button variant={ButtonVariant.plain}>
            <CogIcon />
          </Button>
        </PageHeaderToolsItem>
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
