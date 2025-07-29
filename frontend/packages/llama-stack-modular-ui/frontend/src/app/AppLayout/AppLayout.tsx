/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Button,
  Masthead,
  MastheadBrand,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  Page,
  PageSidebar,
  PageSidebarBody,
  SkipToContent,
} from '@patternfly/react-core';
import { BarsIcon } from '@patternfly/react-icons';
import { IAppRoute, IAppRouteGroup, routes } from '@app/routes';
import logo from '../bgimages/bot_avatar.svg';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const masthead = (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <Button
            icon={<BarsIcon />}
            variant="plain"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-expanded={sidebarOpen}
            aria-label="Global navigation"
          />
        </MastheadToggle>
        <MastheadBrand data-codemods>
          <MastheadLogo data-codemods>
            <img src={logo} alt="Logo" />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
    </Masthead>
  );

  const location = useLocation();
  const renderNavItem = (route: IAppRoute, idx: number) => {
    const navItemId = `nav-item-${route.path.replace(/[^\w-]/g, '')}`;
    return (
      <NavItem
        key={`${idx}-${route.path}`}
        id={navItemId}
        isActive={route.path === location.pathname}
      >
        <NavLink to={route.path}>{route.label}</NavLink>
      </NavItem>
    );
  };
  const renderNavGroup = (group: IAppRouteGroup, groupIndex: number) => (
    <NavExpandable
      key={`${group.label}-${groupIndex}`}
      id={`${group.label}-${groupIndex}`}
      title={group.label}
      isActive={group.routes.some((route) => route.path === location.pathname)}
    >
      {group.routes.map((route, idx) => route.label && renderNavItem(route, idx))}
    </NavExpandable>
  );
  const Navigation = (
    <Nav id="nav-primary-simple">
      <NavList id="nav-list-simple">
        {routes.map(
          (route, idx) =>
            route.label && (!route.routes ? renderNavItem(route, idx) : renderNavGroup(route, idx)),
        )}
      </NavList>
    </Nav>
  );
  const Sidebar = (
    <PageSidebar>
      <PageSidebarBody>{Navigation}</PageSidebarBody>
    </PageSidebar>
  );
  const pageId = 'primary-app-container';
  const PageSkipToContent = (
    <SkipToContent
      onClick={(event) => {
        event.preventDefault();
        const primaryContentContainer = document.getElementById(pageId);
        primaryContentContainer?.focus();
      }}
      href={`#${pageId}`}
    >
      Skip to Content
    </SkipToContent>
  );
  return (
    <Page
      mainContainerId={pageId}
      masthead={masthead}
      sidebar={sidebarOpen && Sidebar}
      skipToContent={PageSkipToContent}
      isContentFilled
    >
      {children}
    </Page>
  );
};
export { AppLayout };
