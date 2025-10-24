import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, matchPath } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import type { LoadedExtension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type {
  NavSectionExtension,
  HrefNavItemExtension,
  StatusReport,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useAccessReviewExtensions } from '@odh-dashboard/internal/utilities/useAccessReviewExtensions';
import { NavSection } from '#~/app/navigation/NavSection';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useExtensions: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/utilities/useAccessReviewExtensions', () => ({
  useAccessReviewExtensions: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({ pathname: '/test-path' })),
  matchPath: jest.fn(),
}));

jest.mock('#~/app/navigation/NavIcon', () => ({
  __esModule: true,
  default: ({ componentRef }: { componentRef: string }) => (
    <span data-testid="nav-icon">{componentRef}</span>
  ),
}));

jest.mock('#~/app/status-provider/StatusReportIcon', () => ({
  StatusReportIcon: ({ status }: { status: StatusReport }) => (
    <span data-testid="status-icon" data-status={status.status}>
      {status.message}
    </span>
  ),
}));

jest.mock('#~/app/status-provider/utils', () => ({
  getStatusReportSummary: jest.fn((statuses: StatusReport[]) => {
    if (statuses.length === 0) return undefined;
    if (statuses.length === 1) return statuses[0];
    const prioritized =
      statuses.find((s) => s.status === 'error') ??
      statuses.find((s) => s.status === 'warning') ??
      statuses[0];
    return { status: prioritized.status, message: 'Multiple status reported.' };
  }),
}));

const mockUseExtensions = useExtensions as jest.MockedFunction<typeof useExtensions>;
const mockUseAccessReviewExtensions = useAccessReviewExtensions as jest.MockedFunction<
  typeof useAccessReviewExtensions
>;
const mockMatchPath = matchPath as jest.MockedFunction<typeof matchPath>;

describe('NavSection', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockMatchPath.mockReturnValue(null);
  });

  describe('Empty section scenarios', () => {
    const settingsSection: LoadedExtension<NavSectionExtension> = {
      type: 'app.navigation/section',
      uid: 'settings-section',
      pluginName: 'test-plugin',
      properties: {
        id: 'settings',
        title: 'Settings',
        group: '5_settings',
      },
      flags: {},
    };

    it('should hide section when no children exist', () => {
      mockUseExtensions.mockReturnValue([]);
      mockUseAccessReviewExtensions.mockReturnValue([[], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should hide section when children exist but access is denied to all', () => {
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
          accessReview: {
            group: 'dashboard.opendatahub.io',
            resource: 'acceleratorprofiles',
            verb: 'list',
          },
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      // Return empty array indicating no access granted
      mockUseAccessReviewExtensions.mockReturnValue([[], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should hide section when still loading access reviews', () => {
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      // isLoaded = false
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], false]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  describe('Section with direct children', () => {
    const settingsSection: LoadedExtension<NavSectionExtension> = {
      type: 'app.navigation/section',
      uid: 'settings-section',
      pluginName: 'test-plugin',
      properties: {
        id: 'settings',
        title: 'Settings',
        group: '5_settings',
      },
      flags: {},
    };

    it('should show section with accessible direct child', () => {
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Hardware profiles')).toBeInTheDocument();
    });

    it('should show section with multiple accessible direct children', () => {
      const child1: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      const child2: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'group-settings',
        pluginName: 'test-plugin',
        properties: {
          id: 'groupSettings',
          title: 'Group settings',
          href: '/groupSettings',
          section: 'settings',
          path: '/groupSettings/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([child1, child2]);
      mockUseAccessReviewExtensions.mockReturnValue([[child1, child2], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Hardware profiles')).toBeInTheDocument();
      expect(screen.getByText('Group settings')).toBeInTheDocument();
    });

    it('should show section with only accessible children filtered by access review', () => {
      const child1: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      const child2: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'group-settings',
        pluginName: 'test-plugin',
        properties: {
          id: 'groupSettings',
          title: 'Group settings',
          href: '/groupSettings',
          section: 'settings',
          path: '/groupSettings/*',
          accessReview: {
            group: 'user.openshift.io',
            resource: 'groups',
            verb: 'list',
          },
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([child1, child2]);
      // Only child1 has access
      mockUseAccessReviewExtensions.mockReturnValue([[child1], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Hardware profiles')).toBeInTheDocument();
      expect(screen.queryByText('Group settings')).not.toBeInTheDocument();
    });
  });

  describe('Nested sections (subsections)', () => {
    const settingsSection: LoadedExtension<NavSectionExtension> = {
      type: 'app.navigation/section',
      uid: 'settings-section',
      pluginName: 'test-plugin',
      properties: {
        id: 'settings',
        title: 'Settings',
        group: '5_settings',
      },
      flags: {},
    };

    it('should show section with nested subsection containing accessible href', () => {
      const subSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'compute-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'compute',
          title: 'Compute',
          section: 'settings',
        },
        flags: {},
      };

      const hrefItem: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'compute',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      // Mock useExtensions to return all extensions - the component will filter them
      mockUseExtensions.mockReturnValue([subSection, hrefItem]);

      // All descendants accessible
      mockUseAccessReviewExtensions.mockReturnValue([[hrefItem], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      // Note: The subsection would be rendered by NavItem which recursively calls NavSection
    });

    it('should hide section when nested subsection has no accessible hrefs', () => {
      const subSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'compute-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'compute',
          title: 'Compute',
          section: 'settings',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([subSection]);
      // No descendants accessible
      mockUseAccessReviewExtensions.mockReturnValue([[], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should show section with deeply nested accessible href', () => {
      const subSection1: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'level1-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'level1',
          title: 'Level 1',
          section: 'settings',
        },
        flags: {},
      };

      const subSection2: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'level2-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'level2',
          title: 'Level 2',
          section: 'level1',
        },
        flags: {},
      };

      const hrefItem: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'deep-item',
        pluginName: 'test-plugin',
        properties: {
          id: 'deepItem',
          title: 'Deep Item',
          href: '/deepItem',
          section: 'level2',
          path: '/deepItem/*',
        },
        flags: {},
      };

      // Mock useExtensions to return all extensions
      mockUseExtensions.mockReturnValue([subSection1, subSection2, hrefItem]);
      // Href is deeply nested but accessible
      mockUseAccessReviewExtensions.mockReturnValue([[hrefItem], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show only subsections with accessible descendants', () => {
      const subSection1: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'compute-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'compute',
          title: 'Compute',
          section: 'settings',
        },
        flags: {},
      };

      const subSection2: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'storage-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'storage',
          title: 'Storage',
          section: 'settings',
        },
        flags: {},
      };

      const href1: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'compute',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      const href2: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'storage-classes',
        pluginName: 'test-plugin',
        properties: {
          id: 'storageClasses',
          title: 'Storage classes',
          href: '/storageClasses',
          section: 'storage',
          path: '/storageClasses/*',
          accessReview: {
            group: 'storage.k8s.io',
            resource: 'storageclasses',
            verb: 'list',
          },
        },
        flags: {},
      };

      // Mock useExtensions to return all extensions
      mockUseExtensions.mockReturnValue([subSection1, subSection2, href1, href2]);
      // Only href1 has access (in compute subsection)
      mockUseAccessReviewExtensions.mockReturnValue([[href1], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      // subSection1 (Compute) should be visible because href1 is accessible
      // subSection2 (Storage) should NOT be visible because href2 is not accessible
    });
  });

  describe('Active state handling', () => {
    const settingsSection: LoadedExtension<NavSectionExtension> = {
      type: 'app.navigation/section',
      uid: 'settings-section',
      pluginName: 'test-plugin',
      properties: {
        id: 'settings',
        title: 'Settings',
        group: '5_settings',
      },
      flags: {},
    };

    it('should be active when current path matches a child href', () => {
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);
      mockMatchPath.mockReturnValue({
        pathname: '/hardwareProfiles',
        params: {},
        pathnameBase: '/hardwareProfiles',
        pattern: {
          path: '/hardwareProfiles/*',
          caseSensitive: false,
          end: true,
        },
      });

      const { container } = renderWithRouter(<NavSection extension={settingsSection} />);

      // Check the nav expandable has the current modifier
      const navExpandable = container.querySelector('.pf-v6-c-nav__link');
      const navItem = navExpandable?.closest('.pf-v6-c-nav__item');
      expect(navItem).toHaveClass('pf-m-current');
    });

    it('should not be active when path does not match any child', () => {
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);
      mockMatchPath.mockReturnValue(null);

      const { container } = renderWithRouter(<NavSection extension={settingsSection} />);

      // Check the nav expandable does not have the current modifier
      const navExpandable = container.querySelector('.pf-v6-c-nav__link');
      expect(navExpandable?.closest('.pf-v6-c-nav__item')).not.toHaveClass('pf-m-current');
    });
  });

  describe('Expansion behavior', () => {
    const settingsSection: LoadedExtension<NavSectionExtension> = {
      type: 'app.navigation/section',
      uid: 'settings-section',
      pluginName: 'test-plugin',
      properties: {
        id: 'settings',
        title: 'Settings',
        group: '5_settings',
      },
      flags: {},
    };

    it('should be expanded when active', () => {
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);
      mockMatchPath.mockReturnValue({
        pathname: '/hardwareProfiles',
        params: {},
        pathnameBase: '/hardwareProfiles',
        pattern: {
          path: '/hardwareProfiles/*',
          caseSensitive: false,
          end: true,
        },
      });

      renderWithRouter(<NavSection extension={settingsSection} />);

      const expandable = screen.getByText('Settings').closest('button');
      expect(expandable).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be collapsed when not active', () => {
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);
      mockMatchPath.mockReturnValue(null);

      renderWithRouter(<NavSection extension={settingsSection} />);

      const expandable = screen.getByText('Settings').closest('button');
      expect(expandable).toHaveAttribute('aria-expanded', 'false');
    });

    it('should toggle expansion on click', async () => {
      const user = userEvent.setup();
      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);
      mockMatchPath.mockReturnValue(null);

      renderWithRouter(<NavSection extension={settingsSection} />);

      const expandButton = screen.getByText('Settings').closest('button');
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      if (expandButton) {
        await user.click(expandButton);

        await waitFor(() => {
          expect(expandButton).toHaveAttribute('aria-expanded', 'true');
        });

        await user.click(expandButton);

        await waitFor(() => {
          expect(expandButton).toHaveAttribute('aria-expanded', 'false');
        });
      }
    });
  });

  describe('Data attributes', () => {
    it('should apply custom data attributes to the section', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
          dataAttributes: {
            'data-testid': 'settings-nav-section',
            'data-custom': 'custom-value',
          },
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      const expandable = screen.getByTestId('settings-nav-section');
      expect(expandable).toBeInTheDocument();
      expect(expandable).toHaveAttribute('data-custom', 'custom-value');
    });
  });

  describe('Complex real-world scenario', () => {
    it('should handle Settings section with mixed subsections and direct children', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      // Direct child under Settings
      const groupSettings: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'group-settings',
        pluginName: 'test-plugin',
        properties: {
          id: 'groupSettings',
          title: 'Group settings',
          href: '/groupSettings',
          section: 'settings',
          path: '/groupSettings/*',
        },
        flags: {},
      };

      // Subsection under Settings
      const computeSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'compute-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'compute',
          title: 'Compute',
          section: 'settings',
        },
        flags: {},
      };

      // Child under Compute subsection
      const hardwareProfiles: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'compute',
          path: '/hardwareProfiles/*',
          accessReview: {
            group: 'dashboard.opendatahub.io',
            resource: 'acceleratorprofiles',
            verb: 'list',
          },
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([groupSettings, computeSection]);
      // Both direct child and nested child have access
      mockUseAccessReviewExtensions.mockReturnValue([[groupSettings, hardwareProfiles], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Group settings')).toBeInTheDocument();
    });

    it('should hide Settings when only subsection exists but its children are inaccessible', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const computeSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'compute-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'compute',
          title: 'Compute',
          section: 'settings',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([computeSection]);
      // No access to the nested href item
      mockUseAccessReviewExtensions.mockReturnValue([[], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      expect(screen.queryByText('Compute')).not.toBeInTheDocument();
      expect(screen.queryByText('Hardware profiles')).not.toBeInTheDocument();
    });
  });

  describe('Icon rendering', () => {
    it('should render section with icon when iconRef is provided', () => {
      const sectionWithIcon: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
          iconRef: (() => import('#~/images/icons/SettingsNavIcon')) as CodeRef<{
            default: React.ComponentType;
          }>,
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      renderWithRouter(<NavSection extension={sectionWithIcon} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByTestId('nav-icon')).toBeInTheDocument();
    });

    it('should render section without icon when iconRef is not provided', () => {
      const sectionWithoutIcon: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      renderWithRouter(<NavSection extension={sectionWithoutIcon} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.queryByTestId('nav-icon')).not.toBeInTheDocument();
    });
  });

  describe('Status reporting', () => {
    it('should pass onNotifyStatus callback to NavItem children', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      // Mock NavItem to verify onNotifyStatus is passed
      const NavItemMock = jest.fn(() => <div>Mocked NavItem</div>);
      jest.spyOn(require('#~/app/navigation/NavItem'), 'NavItem').mockImplementation(NavItemMock);

      renderWithRouter(<NavSection extension={settingsSection} />);

      // Verify NavItem was called with onNotifyStatus callback
      expect(NavItemMock).toHaveBeenCalled();
      type MockCall = [props: { extension: unknown; onNotifyStatus?: unknown }];
      const mockCalls = NavItemMock.mock.calls as unknown as MockCall[];
      expect(mockCalls.length).toBeGreaterThan(0);
      const firstCallProps = mockCalls[0]?.[0];
      expect(firstCallProps).toBeDefined();
      expect(firstCallProps).toHaveProperty('onNotifyStatus');
      expect(typeof firstCallProps.onNotifyStatus).toBe('function');
    });

    it('should render multiple NavItem children with onNotifyStatus callbacks', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const child1: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'child-1',
        pluginName: 'test-plugin',
        properties: {
          id: 'child1',
          title: 'Child 1',
          href: '/child1',
          section: 'settings',
          path: '/child1/*',
        },
        flags: {},
      };

      const child2: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'child-2',
        pluginName: 'test-plugin',
        properties: {
          id: 'child2',
          title: 'Child 2',
          href: '/child2',
          section: 'settings',
          path: '/child2/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([child1, child2]);
      mockUseAccessReviewExtensions.mockReturnValue([[child1, child2], true]);

      // Mock NavItem to count calls
      const NavItemMock = jest.fn(() => <div>Mocked NavItem</div>);
      jest.spyOn(require('#~/app/navigation/NavItem'), 'NavItem').mockImplementation(NavItemMock);

      renderWithRouter(<NavSection extension={settingsSection} />);

      // Verify NavItem was called twice (once for each child)
      expect(NavItemMock).toHaveBeenCalledTimes(2);

      // Verify both calls have onNotifyStatus
      type MockCall = [props: { extension: unknown; onNotifyStatus?: unknown }];
      const mockCalls = NavItemMock.mock.calls as unknown as MockCall[];
      mockCalls.forEach((call) => {
        const props = call[0];
        expect(props).toBeDefined();
        expect(props).toHaveProperty('onNotifyStatus');
        expect(typeof props.onNotifyStatus).toBe('function');
      });
    });

    it('should render section without status icon when no children report status', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.queryByTestId('status-icon')).not.toBeInTheDocument();
    });
  });

  describe('Auto-expansion on route change', () => {
    it('should auto-expand when route changes to match a child', () => {
      const { useLocation } = require('react-router-dom');
      const mockUseLocation = useLocation as jest.Mock;

      // Start with non-matching route
      mockUseLocation.mockReturnValue({ pathname: '/other-path' });

      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
          path: '/hardwareProfiles/*',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);
      mockMatchPath.mockReturnValue(null);

      const { rerender } = renderWithRouter(<NavSection extension={settingsSection} />);

      // Should be collapsed initially
      const expandButton = screen.getByText('Settings').closest('button');
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      // Change route to match child
      mockUseLocation.mockReturnValue({ pathname: '/hardwareProfiles' });
      mockMatchPath.mockReturnValue({
        pathname: '/hardwareProfiles',
        params: {},
        pathnameBase: '/hardwareProfiles',
        pattern: {
          path: '/hardwareProfiles/*',
          caseSensitive: false,
          end: true,
        },
      });

      rerender(
        <MemoryRouter>
          <NavSection extension={settingsSection} />
        </MemoryRouter>,
      );

      // Should now be expanded
      expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Path vs Href fallback', () => {
    it('should use href for matching when path is not defined', () => {
      const { useLocation } = require('react-router-dom');
      const mockUseLocation = useLocation as jest.Mock;
      mockUseLocation.mockReturnValue({ pathname: '/settings/profile' });

      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const childWithoutPath: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'profile-settings',
        pluginName: 'test-plugin',
        properties: {
          id: 'profileSettings',
          title: 'Profile settings',
          href: '/settings/profile',
          section: 'settings',
          // No path property defined
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childWithoutPath]);
      mockUseAccessReviewExtensions.mockReturnValue([[childWithoutPath], true]);

      // matchPath should be called with href when path is undefined
      mockMatchPath.mockImplementation((pattern, pathname) => {
        if (pattern === '/settings/profile' && pathname === '/settings/profile') {
          return {
            pathname: '/settings/profile',
            params: {},
            pathnameBase: '/settings/profile',
            pattern: {
              path: '/settings/profile',
              caseSensitive: false,
              end: true,
            },
          };
        }
        return null;
      });

      const { container } = renderWithRouter(<NavSection extension={settingsSection} />);

      // Should be active based on href matching
      const navItem = container.querySelector('.pf-v6-c-nav__item');
      expect(navItem).toHaveClass('pf-m-current');
    });
  });

  describe('Children ordering', () => {
    it('should render children in correct group order', async () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const child3: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'third',
        pluginName: 'test-plugin',
        properties: {
          id: 'third',
          title: 'Third Item',
          href: '/third',
          section: 'settings',
          group: '3_third',
        },
        flags: {},
      };

      const child1: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'first',
        pluginName: 'test-plugin',
        properties: {
          id: 'first',
          title: 'First Item',
          href: '/first',
          section: 'settings',
          group: '1_first',
        },
        flags: {},
      };

      const child2: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'second',
        pluginName: 'test-plugin',
        properties: {
          id: 'second',
          title: 'Second Item',
          href: '/second',
          section: 'settings',
          group: '2_second',
        },
        flags: {},
      };

      // Return children in wrong order
      mockUseExtensions.mockReturnValue([child3, child1, child2]);
      mockUseAccessReviewExtensions.mockReturnValue([[child3, child1, child2], true]);
      mockMatchPath.mockReturnValue(null);

      renderWithRouter(<NavSection extension={settingsSection} />);

      // Expand the section first
      const expandButton = screen.getByText('Settings').closest('button');
      if (expandButton) {
        await userEvent.setup().click(expandButton);
      }

      // Get all nav items links
      await waitFor(() => {
        const items = screen.getAllByRole('link');
        expect(items[0]).toHaveTextContent('First Item');
        expect(items[1]).toHaveTextContent('Second Item');
        expect(items[2]).toHaveTextContent('Third Item');
      });
    });

    it('should handle children without group property using default group', async () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const childWithGroup: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'with-group',
        pluginName: 'test-plugin',
        properties: {
          id: 'withGroup',
          title: 'With Group',
          href: '/withGroup',
          section: 'settings',
          group: '1_early',
        },
        flags: {},
      };

      const childWithoutGroup: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'without-group',
        pluginName: 'test-plugin',
        properties: {
          id: 'withoutGroup',
          title: 'Without Group',
          href: '/withoutGroup',
          section: 'settings',
          // No group property (should use default)
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childWithoutGroup, childWithGroup]);
      mockUseAccessReviewExtensions.mockReturnValue([[childWithoutGroup, childWithGroup], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      // Expand the section first
      const expandButton = screen.getByText('Settings').closest('button');
      if (expandButton) {
        await userEvent.setup().click(expandButton);
      }

      // Child with group should come first
      await waitFor(() => {
        const items = screen.getAllByRole('link');
        expect(items[0]).toHaveTextContent('With Group');
        expect(items[1]).toHaveTextContent('Without Group');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined dataAttributes gracefully', () => {
      const sectionWithoutDataAttrs: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
          // No dataAttributes
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      renderWithRouter(<NavSection extension={sectionWithoutDataAttrs} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should handle extensions array updates dynamically', async () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const child1: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'child-1',
        pluginName: 'test-plugin',
        properties: {
          id: 'child1',
          title: 'Child 1',
          href: '/child1',
          section: 'settings',
        },
        flags: {},
      };

      const child2: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'child-2',
        pluginName: 'test-plugin',
        properties: {
          id: 'child2',
          title: 'Child 2',
          href: '/child2',
          section: 'settings',
        },
        flags: {},
      };

      // Start with one child
      mockUseExtensions.mockReturnValue([child1]);
      mockUseAccessReviewExtensions.mockReturnValue([[child1], true]);

      const { rerender } = renderWithRouter(<NavSection extension={settingsSection} />);

      // Expand to see children
      const expandButton = screen.getByText('Settings').closest('button');
      if (expandButton) {
        await userEvent.setup().click(expandButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Child 1')).toBeInTheDocument();
      });
      expect(screen.queryByText('Child 2')).not.toBeInTheDocument();

      // Add second child
      mockUseExtensions.mockReturnValue([child1, child2]);
      mockUseAccessReviewExtensions.mockReturnValue([[child1, child2], true]);

      rerender(
        <MemoryRouter>
          <NavSection extension={settingsSection} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Child 1')).toBeInTheDocument();
        expect(screen.getByText('Child 2')).toBeInTheDocument();
      });
    });

    it('should handle rapid expansion/collapse clicks', async () => {
      const user = userEvent.setup();
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);
      mockMatchPath.mockReturnValue(null);

      renderWithRouter(<NavSection extension={settingsSection} />);

      const expandButton = screen.getByText('Settings').closest('button');
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      // Rapid clicks
      if (expandButton) {
        await user.click(expandButton);
        await user.click(expandButton);
        await user.click(expandButton);

        await waitFor(() => {
          expect(expandButton).toHaveAttribute('aria-expanded', 'true');
        });
      }
    });

    it('should maintain expansion state after children access changes', async () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const child1: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'child-1',
        pluginName: 'test-plugin',
        properties: {
          id: 'child1',
          title: 'Child 1',
          href: '/child1',
          section: 'settings',
        },
        flags: {},
      };

      const child2: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'child-2',
        pluginName: 'test-plugin',
        properties: {
          id: 'child2',
          title: 'Child 2',
          href: '/child2',
          section: 'settings',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([child1, child2]);
      // Initially both accessible
      mockUseAccessReviewExtensions.mockReturnValue([[child1, child2], true]);
      mockMatchPath.mockReturnValue(null);

      const { rerender } = renderWithRouter(<NavSection extension={settingsSection} />);

      // Expand to see children
      const expandButton = screen.getByText('Settings').closest('button');
      if (expandButton) {
        await userEvent.setup().click(expandButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Child 1')).toBeInTheDocument();
        expect(screen.getByText('Child 2')).toBeInTheDocument();
      });

      // Now only one child is accessible
      mockUseAccessReviewExtensions.mockReturnValue([[child1], true]);

      rerender(
        <MemoryRouter>
          <NavSection extension={settingsSection} />
        </MemoryRouter>,
      );

      // Section should still be visible with remaining accessible child
      await waitFor(() => {
        expect(screen.getByText('Child 1')).toBeInTheDocument();
      });
      expect(screen.queryByText('Child 2')).not.toBeInTheDocument();
    });

    it('should handle empty title gracefully', () => {
      const sectionWithEmptyTitle: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: '',
          group: '5_settings',
        },
        flags: {},
      };

      const childExtension: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'settings',
        },
        flags: {},
      };

      mockUseExtensions.mockReturnValue([childExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[childExtension], true]);

      const { container } = renderWithRouter(<NavSection extension={sectionWithEmptyTitle} />);

      // Should render but with empty title
      expect(container.querySelector('.pf-v6-c-nav__link')).toBeInTheDocument();
    });

    it('should handle subsections in descendant extensions during access review', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const subSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'compute-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'compute',
          title: 'Compute',
          section: 'settings',
        },
        flags: {},
      };

      const hrefWithAccessReview: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'hardware-profiles',
        pluginName: 'test-plugin',
        properties: {
          id: 'hardwareProfiles',
          title: 'Hardware profiles',
          href: '/hardwareProfiles',
          section: 'compute',
          path: '/hardwareProfiles/*',
          accessReview: {
            group: 'dashboard.opendatahub.io',
            resource: 'acceleratorprofiles',
            verb: 'list',
          },
        },
        flags: {},
      };

      mockUseExtensions.mockImplementation((predicate) => {
        const allExtensions = [subSection, hrefWithAccessReview];
        return predicate ? allExtensions.filter(predicate) : allExtensions;
      });

      mockUseAccessReviewExtensions.mockImplementation((descendants, callback) => {
        descendants.forEach((ext) => callback(ext));
        return [[hrefWithAccessReview], true];
      });

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should handle unknown extension types gracefully', () => {
      const settingsSection: LoadedExtension<NavSectionExtension> = {
        type: 'app.navigation/section',
        uid: 'settings-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'settings',
          title: 'Settings',
          group: '5_settings',
        },
        flags: {},
      };

      const validChild: LoadedExtension<HrefNavItemExtension> = {
        type: 'app.navigation/href',
        uid: 'valid-child',
        pluginName: 'test-plugin',
        properties: {
          id: 'validChild',
          title: 'Valid Child',
          href: '/valid',
          section: 'settings',
        },
        flags: {},
      };

      const unknownExtension = {
        type: 'app.navigation/unknown',
        uid: 'unknown-ext',
        pluginName: 'test-plugin',
        properties: {
          id: 'unknown',
          title: 'Unknown',
          section: 'settings',
        },
        flags: {},
      } as unknown as LoadedExtension<HrefNavItemExtension>;

      mockUseExtensions.mockReturnValue([validChild, unknownExtension]);
      mockUseAccessReviewExtensions.mockReturnValue([[validChild], true]);

      renderWithRouter(<NavSection extension={settingsSection} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Valid Child')).toBeInTheDocument();
    });
  });
});
