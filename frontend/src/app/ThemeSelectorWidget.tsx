import React from 'react';
import {
  Divider,
  MenuToggle,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectGroup,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { SunIcon, MoonIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { useThemeContext } from './ThemeContext';

import './ThemeSelectorWidget.scss';

type ContrastMode = 'default' | 'high' | 'glass';
type PfThemeVariant = 'default' | 'redhat';

const contrastModes = new Set<string>(['default', 'high', 'glass']);
const pfThemeVariants = new Set<string>(['default', 'redhat']);

const isContrastMode = (value: string): value is ContrastMode => contrastModes.has(value);
const isPfThemeVariant = (value: string): value is PfThemeVariant => pfThemeVariants.has(value);

const ThemeSelectorWidget: React.FC = () => {
  const { theme, setAllThemes } = useThemeContext();
  const [contrast, setContrast] = useBrowserStorage<ContrastMode>(
    'odh.dashboard.ui.contrast',
    'default',
  );
  const [pfTheme, setPfTheme] = useBrowserStorage<PfThemeVariant>(
    'odh.dashboard.ui.pftheme',
    'default',
  );
  const [useSystemTheme, setUseSystemTheme] = useBrowserStorage<boolean>(
    'odh.dashboard.ui.systemTheme',
    false,
  );
  const [isOpen, setIsOpen] = React.useState(false);

  // System theme listener
  React.useEffect(() => {
    if (!useSystemTheme) {
      return undefined;
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setAllThemes(e.matches ? 'dark' : 'light');
    setAllThemes(mql.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [useSystemTheme, setAllThemes]);

  // Apply contrast classes
  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('pf-v6-theme-high-contrast', 'pf-v6-theme-glass');
    if (contrast === 'high') {
      html.classList.add('pf-v6-theme-high-contrast');
    } else if (contrast === 'glass') {
      html.classList.add('pf-v6-theme-glass');
    }
    return () => {
      html.classList.remove('pf-v6-theme-high-contrast', 'pf-v6-theme-glass');
    };
  }, [contrast]);

  // Apply PF theme variant class
  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('pf-v6-theme-redhat', pfTheme === 'redhat');
    return () => {
      html.classList.remove('pf-v6-theme-redhat');
    };
  }, [pfTheme]);

  const handleSelect = (_e: React.MouseEvent | undefined, itemId: string | number | undefined) => {
    const id = String(itemId);
    if (id === 'color-light') {
      setUseSystemTheme(false);
      setAllThemes('light');
    } else if (id === 'color-dark') {
      setUseSystemTheme(false);
      setAllThemes('dark');
    } else if (id === 'color-system') {
      setUseSystemTheme(true);
    } else if (id.startsWith('contrast-')) {
      const mode = id.replace('contrast-', '');
      if (isContrastMode(mode)) {
        setContrast(mode);
      }
    } else if (id.startsWith('theme-')) {
      const variant = id.replace('theme-', '');
      if (isPfThemeVariant(variant)) {
        setPfTheme(variant);
      }
    }
  };

  const colorLabel = useSystemTheme ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  return (
    <div className="odh-theme-selector-widget">
      <Select
        isOpen={isOpen}
        onSelect={handleSelect}
        onOpenChange={setIsOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen((prev) => !prev)}
            isExpanded={isOpen}
            aria-label={`Theme selection, current: ${colorLabel}`}
            icon={theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          >
            {colorLabel}
          </MenuToggle>
        )}
        popperProps={{ position: 'right', direction: 'up' }}
      >
        <SelectGroup label="Color">
          <SelectList>
            <SelectOption itemId="color-light" isSelected={!useSystemTheme && theme === 'light'}>
              Light
            </SelectOption>
            <SelectOption itemId="color-dark" isSelected={!useSystemTheme && theme === 'dark'}>
              Dark
            </SelectOption>
            <SelectOption itemId="color-system" isSelected={useSystemTheme}>
              System
            </SelectOption>
          </SelectList>
        </SelectGroup>
        <Divider />
        <SelectGroup label="Contrast">
          <SelectList>
            <SelectOption itemId="contrast-default" isSelected={contrast === 'default'}>
              Default
            </SelectOption>
            <SelectOption itemId="contrast-high" isSelected={contrast === 'high'}>
              High contrast
            </SelectOption>
            <SelectOption itemId="contrast-glass" isSelected={contrast === 'glass'}>
              Glass
            </SelectOption>
          </SelectList>
        </SelectGroup>
        <Divider />
        <SelectGroup label="Theme">
          <SelectList>
            <SelectOption itemId="theme-default" isSelected={pfTheme === 'default'}>
              Default
            </SelectOption>
            <SelectOption itemId="theme-redhat" isSelected={pfTheme === 'redhat'}>
              Red Hat
            </SelectOption>
          </SelectList>
        </SelectGroup>
      </Select>
    </div>
  );
};

export default ThemeSelectorWidget;
