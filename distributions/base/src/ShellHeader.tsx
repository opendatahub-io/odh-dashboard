/* eslint-disable @odh-dashboard/no-restricted-imports */
import React from 'react';
import {
  Content,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToggleGroup,
  ToggleGroupItem,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Spinner,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { MoonIcon, SunIcon, QuestionCircleIcon, UserIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import {
  isMastheadBrandExtension,
  isMastheadToolbarItemExtension,
  isMastheadUserMenuExtension,
  isMastheadAboutExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useThemeContext } from './ThemeContext';
import logoLight from './images/red-hat-ai-light.svg';
import logoDark from './images/red-hat-ai-dark.svg';

const DEFAULT_GROUP = '5_default';

const ShellBrand: React.FC = () => {
  const brandExtensions = useExtensions(isMastheadBrandExtension);
  const { theme } = useThemeContext();

  if (brandExtensions.length > 0) {
    const { logoComponent, href = '/' } = brandExtensions[0].properties;
    return (
      <MastheadBrand data-codemods>
        <Link to={href} style={{ display: 'inline-flex' }}>
          <LazyCodeRefComponent component={logoComponent} />
        </Link>
      </MastheadBrand>
    );
  }

  const logo = theme === 'dark' ? logoDark : logoLight;

  return (
    <MastheadBrand data-codemods>
      <Link to="/" style={{ display: 'inline-flex' }}>
        <img
          src={`data:image/svg+xml,${encodeURIComponent(logo)}`}
          alt="Red Hat AI (placeholder)"
          style={{ height: '36px', width: 'auto' }}
        />
      </Link>
    </MastheadBrand>
  );
};

const ShellAbout: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const aboutExtensions = useExtensions(isMastheadAboutExtension);

  return (
    <>
      <ToolbarItem>
        <Button
          aria-label="Help"
          variant="plain"
          icon={<QuestionCircleIcon />}
          onClick={() => setIsOpen(true)}
        />
      </ToolbarItem>
      {isOpen ? (
        aboutExtensions.length > 0 ? (
          <LazyCodeRefComponent
            component={aboutExtensions[0].properties.component}
            props={{ onClose: () => setIsOpen(false) }}
            fallback={<Spinner size="lg" />}
          />
        ) : (
          <Modal
            isOpen
            onClose={() => setIsOpen(false)}
            aria-label="About Red Hat AI"
            variant="small"
          >
            <ModalHeader title="About" />
            <ModalBody>
              <Content>
                <p>No product information available.</p>
              </Content>
            </ModalBody>
            <ModalFooter>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </ModalFooter>
          </Modal>
        )
      ) : null}
    </>
  );
};

const ShellUserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const userMenuExtensions = useExtensions(isMastheadUserMenuExtension);

  if (userMenuExtensions.length === 0) {
    return (
      <ToolbarItem>
        <MenuToggle aria-label="User menu" isDisabled>
          No user authenticated
        </MenuToggle>
      </ToolbarItem>
    );
  }

  const { usernameRef, logoutRef, menuItemsRef } = userMenuExtensions[0].properties;

  return (
    <ToolbarItem>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            aria-label="User menu"
            variant="plain"
            onClick={() => setIsOpen((prev) => !prev)}
            isExpanded={isOpen}
            icon={<UserIcon />}
          >
            <LazyCodeRefComponent component={usernameRef} />
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          {menuItemsRef ? (
            <DropdownItem key="user-menu-extra">
              <LazyCodeRefComponent component={menuItemsRef} />
            </DropdownItem>
          ) : null}
          <DropdownItem key="user-menu-logout">
            <LazyCodeRefComponent component={logoutRef} />
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </ToolbarItem>
  );
};

const ShellToolbarItems: React.FC = () => {
  const toolbarExtensions = useExtensions(isMastheadToolbarItemExtension);
  const sorted = React.useMemo(
    () =>
      [...toolbarExtensions].toSorted((a, b) =>
        (a.properties.group || DEFAULT_GROUP).localeCompare(b.properties.group || DEFAULT_GROUP),
      ),
    [toolbarExtensions],
  );

  return (
    <>
      {sorted.map((ext) => (
        <ToolbarItem key={ext.uid}>
          <LazyCodeRefComponent component={ext.properties.component} />
        </ToolbarItem>
      ))}
    </>
  );
};

const ShellHeader: React.FC = () => {
  const { theme, setTheme } = useThemeContext();

  return (
    <Masthead role="banner" aria-label="page masthead">
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton
            id="page-nav-toggle"
            variant="plain"
            aria-label="Navigation"
            isHamburgerButton
          />
        </MastheadToggle>
        <ShellBrand />
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight>
          <ToolbarContent>
            <ToolbarGroup variant="action-group-plain" align={{ default: 'alignEnd' }}>
              <ShellToolbarItems />
              <ToolbarItem>
                <ToggleGroup aria-label="Theme toggle">
                  <ToggleGroupItem
                    aria-label="light theme"
                    icon={<SunIcon />}
                    isSelected={theme === 'light'}
                    onChange={() => setTheme('light')}
                  />
                  <ToggleGroupItem
                    aria-label="dark theme"
                    icon={<MoonIcon />}
                    isSelected={theme === 'dark'}
                    onChange={() => setTheme('dark')}
                  />
                </ToggleGroup>
              </ToolbarItem>
              <ShellAbout />
              <ShellUserMenu />
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};

export default ShellHeader;
