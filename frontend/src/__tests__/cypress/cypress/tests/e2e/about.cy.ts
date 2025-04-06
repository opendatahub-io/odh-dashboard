import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';

describe('Verify component versions on about screen', () => {
  it('Verify component versions match DSC resource', () => {
    // Get the DSC resource
    cy.get('/api/dsc').then((response) => {
      const dscResource = response.body;

      // Get the component versions from the DSC resource
      const componentVersions = dscResource.components.map((component) => ({
        name: component.name,
        version: component.version,
      }));

      // Visit the about screen
      cy.visit('/about');

      // Get the component versions displayed on the about screen
      cy.get('[data-testid="component-version"]').then((versions) => {
        const displayedVersions = versions.map((version) => ({
          name: version.find('[data-testid="component-name"]').text(),
          version: version.find('[data-testid="component-version"]').text(),
        }));

        // Compare the component versions
        expect(displayedVersions).to.deep.equal(componentVersions);
      });
    });
  });
});
