import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, matchPath } from 'react-router-dom';
import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type {
  NavExtension,
  NavSectionExtension,
  HrefNavItemExtension,
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
  useLocation: () => ({ pathname: '/' }),
  matchPath: jest.fn(),
}));

const mockUseExtensions = useExtensions as jest.MockedFunction<typeof useExtensions>;
const mockUseAccessReviewExtensions = useAccessReviewExtensions as jest.MockedFunction<
  typeof useAccessReviewExtensions
>;
const mockMatchPath = matchPath as jest.MockedFunction<typeof matchPath>;

describe('Navigation Sidebar Models Section', () => {
  const createMockNavExtensions = (
    options: {
      disableModelCatalog?: boolean;
      disableModelRegistry?: boolean;
      disableModelServing?: boolean;
      disableFineTuning?: boolean;
    } = {},
  ): LoadedExtension<NavExtension>[] => {
    const extensions: LoadedExtension<NavExtension>[] = [
      {
        type: 'app.navigation/section',
        uid: 'models-section',
        pluginName: 'test-plugin',
        properties: {
          id: 'models',
          title: 'Models',
          group: '3_models',
        },
        flags: {},
      } satisfies LoadedExtension<NavSectionExtension>,
    ];

    if (!options.disableModelCatalog) {
      extensions.push({
        type: 'app.navigation/href',
        uid: 'model-catalog',
        pluginName: 'test-plugin',
        properties: {
          id: 'modelCatalog',
          title: 'Model catalog',
          href: '/modelCatalog',
          section: 'models',
          path: '/modelCatalog/*',
        },
        flags: {
          required: ['MODEL_CATALOG'],
        },
      } satisfies LoadedExtension<HrefNavItemExtension>);
    }

    if (!options.disableModelRegistry) {
      extensions.push({
        type: 'app.navigation/href',
        uid: 'model-registry-kf',
        pluginName: 'model-registry-plugin',
        properties: {
          id: 'modelRegistry-kf',
          title: 'Model registry (KF)',
          href: '/model-registry',
          section: 'models',
          path: '/model-registry/*',
        },
        flags: {
          required: ['MODEL_REGISTRY'],
        },
      } satisfies LoadedExtension<HrefNavItemExtension>);
    }

    if (!options.disableModelServing) {
      extensions.push({
        type: 'app.navigation/href',
        uid: 'model-serving',
        pluginName: 'test-plugin',
        properties: {
          id: 'modelServing',
          title: 'Model deployments',
          href: '/modelServing',
          section: 'models',
          path: '/modelServing/*',
        },
        flags: {
          required: ['MODEL_SERVING'],
          disallowed: ['PLUGIN_MODEL_SERVING'],
        },
      } satisfies LoadedExtension<HrefNavItemExtension>);
    }

    if (!options.disableFineTuning) {
      extensions.push({
        type: 'app.navigation/href',
        uid: 'model-customization',
        pluginName: 'test-plugin',
        properties: {
          id: 'modelCustomization',
          title: 'Model customization',
          href: '/modelCustomization',
          section: 'models',
          path: '/modelCustomization/*',
        },
        flags: {
          required: ['FINE_TUNING'],
        },
      } satisfies LoadedExtension<HrefNavItemExtension>);
    }

    return extensions;
  };

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchPath.mockReturnValue(null);
  });

  describe('NavSection - Models', () => {
    const modelsSection: LoadedExtension<NavSectionExtension> = {
      type: 'app.navigation/section',
      uid: 'models-section',
      pluginName: 'test-plugin',
      properties: {
        id: 'models',
        title: 'Models',
        group: '3_models',
      },
      flags: {},
    };

    it('should show the models section if some related feature flags are enabled', () => {
      const navExtensions = createMockNavExtensions({
        disableModelCatalog: false,
        disableModelRegistry: false,
        disableModelServing: true,
        disableFineTuning: true,
      }).filter((ext) => {
        return 'section' in ext.properties && ext.properties.section === 'models';
      });

      mockUseExtensions.mockReturnValue(navExtensions);
      mockUseAccessReviewExtensions.mockReturnValue([navExtensions, true]);

      renderWithRouter(<NavSection extension={modelsSection} />);

      expect(screen.getByText('Models')).toBeInTheDocument();
      expect(screen.getByText('Model catalog')).toBeInTheDocument();
      expect(screen.getByText('Model registry (KF)')).toBeInTheDocument();
    });

    it('should show Model catalog when enabled', () => {
      const navExtensions = createMockNavExtensions({
        disableModelCatalog: false,
        disableModelRegistry: true,
        disableModelServing: true,
        disableFineTuning: true,
      }).filter((ext) => {
        return 'section' in ext.properties && ext.properties.section === 'models';
      });

      mockUseExtensions.mockReturnValue(navExtensions);
      mockUseAccessReviewExtensions.mockReturnValue([navExtensions, true]);

      renderWithRouter(<NavSection extension={modelsSection} />);

      expect(screen.getByText('Models')).toBeInTheDocument();
      expect(screen.getByText('Model catalog')).toBeInTheDocument();
      expect(screen.queryByText('Model registry (KF)')).not.toBeInTheDocument();
    });
  });
});
