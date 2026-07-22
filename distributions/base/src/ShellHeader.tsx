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
import { Link } from 'react-router-dom';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import {
  isMastheadBrandExtension,
  isMastheadToolbarItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useThemeContext } from './ThemeContext';
import logoLight from './images/red-hat-ai-light.svg';
import logoDark from './images/red-hat-ai-dark.svg';

const ShellBrand: React.FC = () => {
  const brandExtensions = useExtensions(isMastheadBrandExtension);
  const { theme } = useThemeContext();

  if (brandExtensions.length > 0) {
    const { logoComponent, href = '/' } = brandExtensions[0].properties;
    return (
      <MastheadBrand data-codemods>
        <Link to={href} style={{ display: 'inline-flex' }}>
          <LazyCodeRefComponent key={brandExtensions[0].uid} component={logoComponent} />
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

const useToolbarExtensions = () => {
  const toolbarExtensions = useExtensions(isMastheadToolbarItemExtension);
  return React.useMemo(() => {
    const leading = toolbarExtensions.filter((ext) => ext.properties.position !== 'trailing');
    const trailing = toolbarExtensions.filter((ext) => ext.properties.position === 'trailing');
    return { leading, trailing };
  }, [toolbarExtensions]);
};

const ToolbarItems: React.FC<{
  extensions: ReturnType<typeof useToolbarExtensions>['leading'];
}> = ({ extensions }) => (
  <>
    {extensions.map((ext) => (
      <ToolbarItem key={ext.uid}>
        <LazyCodeRefComponent component={ext.properties.component} />
      </ToolbarItem>
    ))}
  </>
);

const ShellHeader: React.FC = () => {
  const { theme, setTheme } = useThemeContext();
  const { leading, trailing } = useToolbarExtensions();

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
              <ToolbarItems extensions={leading} />
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
              <ToolbarItems extensions={trailing} />
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};

export default ShellHeader;
