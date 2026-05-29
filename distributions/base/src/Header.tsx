import React from 'react';
import {
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
} from '@patternfly/react-core';
import { MoonIcon, SunIcon } from '@patternfly/react-icons';
import { useThemeContext } from './ThemeContext';

type HeaderProps = {
  brand?: React.ReactNode;
  toolbar?: React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({ brand, toolbar }) => {
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
        {brand && <MastheadBrand>{brand}</MastheadBrand>}
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight>
          <ToolbarContent>
            <ToolbarGroup variant="action-group-plain" align={{ default: 'alignEnd' }}>
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
            </ToolbarGroup>
            {toolbar}
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};

export default Header;
