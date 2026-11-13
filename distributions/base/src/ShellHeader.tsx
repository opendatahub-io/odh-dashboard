import React from 'react';
/* eslint-disable no-restricted-imports -- PF Select with SelectGroup+ToggleGroup is required for the PatternFly masthead theme switcher pattern; project wrappers do not support grouped toggle-group content */
import {
  Divider,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  PageToggleButton,
  Select,
  SelectGroup,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
/* eslint-enable no-restricted-imports */
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

// RHDS UI icon: auto-light-dark-mode (CC-BY-4.0 Red Hat, Inc.)
// https://ux.redhat.com/foundations/iconography
const ThemeAutoIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    className="pf-v6-svg"
    fill="var(--pf-t--global--icon--color--regular)"
  >
    <path d="M16 2C8.28 2 2 8.28 2 16s6.28 14 14 14 14-6.28 14-14S23.72 2 16 2Zm0 26C9.383 28 4 22.617 4 16S9.383 4 16 4s12 5.383 12 12-5.383 12-12 12Zm9-12a9 9 0 0 1-8.738 8.996.259.259 0 0 1-.262-.257V7.26c0-.142.12-.261.262-.257A9 9 0 0 1 25 15.999Z" />
  </svg>
);

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
  const { colorScheme, setColorScheme, contrastMode, setContrastMode } = useThemeContext();
  const { leading, trailing } = useToolbarExtensions();
  const [themeSwitcherOpen, setThemeSwitcherOpen] = React.useState(false);

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
                <Select
                  isOpen={themeSwitcherOpen}
                  onOpenChange={(isOpen) => setThemeSwitcherOpen(isOpen)}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      variant="plain"
                      ref={toggleRef}
                      onClick={() => setThemeSwitcherOpen(!themeSwitcherOpen)}
                      isExpanded={themeSwitcherOpen}
                      aria-label={`Theme selection, current: ${colorScheme}`}
                      data-testid="appearance-settings-button"
                    >
                      {colorScheme === 'system' ? (
                        ThemeAutoIcon
                      ) : colorScheme === 'dark' ? (
                        <MoonIcon />
                      ) : (
                        <SunIcon />
                      )}
                    </MenuToggle>
                  )}
                  shouldFocusToggleOnSelect
                  onOpenChangeKeys={['Escape']}
                  popperProps={{ position: 'right', enableFlip: true, preventOverflow: true }}
                >
                  <SelectGroup
                    label={
                      <div
                        className="pf-v6-c-menu__group-title"
                        id="theme-selector-color-scheme-title"
                      >
                        Color scheme
                      </div>
                    }
                  >
                    <MenuSearch>
                      <MenuSearchInput>
                        <ToggleGroup aria-labelledby="theme-selector-color-scheme-title">
                          <ToggleGroupItem
                            text="System"
                            buttonId="cs-system"
                            isSelected={colorScheme === 'system'}
                            onChange={() => setColorScheme('system')}
                          />
                          <ToggleGroupItem
                            text="Light"
                            buttonId="cs-light"
                            isSelected={colorScheme === 'light'}
                            onChange={() => setColorScheme('light')}
                          />
                          <ToggleGroupItem
                            text="Dark"
                            buttonId="cs-dark"
                            isSelected={colorScheme === 'dark'}
                            onChange={() => setColorScheme('dark')}
                          />
                        </ToggleGroup>
                      </MenuSearchInput>
                    </MenuSearch>
                  </SelectGroup>
                  <Divider />
                  <SelectGroup
                    label={
                      <div className="pf-v6-c-menu__group-title" id="theme-selector-contrast-title">
                        Contrast mode
                      </div>
                    }
                  >
                    <MenuSearch>
                      <MenuSearchInput>
                        <ToggleGroup aria-labelledby="theme-selector-contrast-title">
                          <ToggleGroupItem
                            text="System"
                            buttonId="cm-system"
                            isSelected={contrastMode === 'system'}
                            onChange={() => setContrastMode('system')}
                          />
                          <ToggleGroupItem
                            text="Default"
                            buttonId="cm-default"
                            isSelected={contrastMode === 'default'}
                            onChange={() => setContrastMode('default')}
                          />
                          <ToggleGroupItem
                            text="High contrast"
                            buttonId="cm-high-contrast"
                            isSelected={contrastMode === 'high-contrast'}
                            onChange={() => setContrastMode('high-contrast')}
                          />
                          <ToggleGroupItem
                            text="Glass"
                            buttonId="cm-glass"
                            isSelected={contrastMode === 'glass'}
                            onChange={() => setContrastMode('glass')}
                          />
                        </ToggleGroup>
                      </MenuSearchInput>
                    </MenuSearch>
                  </SelectGroup>
                </Select>
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
