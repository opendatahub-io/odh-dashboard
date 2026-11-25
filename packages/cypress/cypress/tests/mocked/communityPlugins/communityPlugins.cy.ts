import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { OdhPlatformType } from '@odh-dashboard/internal/types';
import { communityPlugins } from '../../../pages/communityPlugins';
import { pageNotfound } from '../../../pages/pageNotFound';
import { asProductAdminUser, asProjectEditUser } from '../../../utils/mockUsers';

const initIntercepts = (
  hideCommunityPluginsSettingsPage = false,
  releaseName = OdhPlatformType.SELF_MANAGED_RHOAI,
) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ hideCommunityPluginsSettingsPage }));
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({ release: { name: releaseName, version: '2.28.0' } }),
  );
};

describe('Community plugins settings', () => {
  it('should be available to product administrators by default', () => {
    asProductAdminUser();
    initIntercepts();

    communityPlugins.visit();

    communityPlugins.findPage().should('be.visible');
    communityPlugins.findNavItem().should('exist');
  });

  it('should be unavailable on Open Data Hub', () => {
    asProductAdminUser();
    initIntercepts(false, OdhPlatformType.OPEN_DATA_HUB);

    communityPlugins.visit(false);

    pageNotfound.findPage().should('exist');
    communityPlugins.findNavItem().should('not.exist');
  });

  it('should be unavailable when disabled by the Dashboard feature flag', () => {
    asProductAdminUser();
    initIntercepts(true);

    communityPlugins.visit(false);

    pageNotfound.findPage().should('exist');
    communityPlugins.findNavItem().should('not.exist');
  });

  it('should be unavailable to non-admin users', () => {
    asProjectEditUser();
    initIntercepts();

    communityPlugins.visit(false);

    pageNotfound.findPage().should('exist');
    communityPlugins.findNavItem().should('not.exist');
  });
});
