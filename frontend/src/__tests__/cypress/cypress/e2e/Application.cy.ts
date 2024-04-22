import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import {
  asDisallowedUser,
  asProductAdminUser,
  asProjectAdminUser,
} from '~/__tests__/cypress/cypress/utils/users';

describe('Application', () => {
  it('should disallow access to the dashboard', () => {
    asDisallowedUser();
    appChrome.visit();
    appChrome.shouldBeUnauthorized();
    appChrome.findNavToggle().should('not.exist');
  });

  it('should not show Settings nav section for non product admins', () => {
    asProjectAdminUser();
    appChrome.visit();
    appChrome.findNavSection('Settings').should('not.exist');
  });

  it('should show Settings nav section for cluster admins', () => {
    asProductAdminUser();
    appChrome.visit();
    appChrome.findNavSection('Settings').should('exist');
  });

  it('Validate clicking on App Launcher opens menu', () => {
    appChrome.visit();
    const applicationLauncher = appChrome.getApplicationLauncher();
    applicationLauncher.toggleAppLauncherButton();
    const applicationLauncherMenuGroup = applicationLauncher.getApplicationLauncherMenuGroup(
      'Open Data Hub Applications',
    );
    applicationLauncherMenuGroup.shouldHaveApplicationLauncherItem('OpenShift Cluster Manager');
    applicationLauncher.toggleAppLauncherButton();
  });
});
