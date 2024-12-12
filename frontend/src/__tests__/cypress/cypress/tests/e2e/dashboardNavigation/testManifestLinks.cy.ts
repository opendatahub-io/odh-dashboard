describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
  it('Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs', () => {
    const manifestsDir = '../../../../manifests';
    cy.log(`Resolved manifests directory: ${manifestsDir}`);

    // Extract URLs from the manifests directory using the registered task
    cy.task<string[]>('extractHttpsUrls', manifestsDir).then((urls) => {
      // Filter out Sample/Test URLs
      const filteredUrls = urls.filter(
        (url) =>
          !url.includes('my-project-s2i-python-service') &&
          !url.includes('clusterip/') &&
          !url.includes('ClusterIP') &&
          !url.includes('s2i-python-service') &&
          !url.includes('user-dev-rhoam-quarkus') &&
          !url.includes('project-simple') &&
          !url.includes('example.apps') &&
          !url.includes('localhost') &&
          !url.includes('console-openshift-console.apps.test-cluster.example.com/') &&
          !url.includes('console-openshift-console.apps.test-cluster.example.com') &&
          !url.includes('repo.anaconda.cloud/repo/t/$'),
      );

      // Log filtered URLs for debugging
      filteredUrls.forEach((url) => {
        cy.log(url);
      });

      // Verify that each remaining URL is accessible and returns a 200 status code
      cy.step(
        'Verify that each filtered URL is accessible and that a 200 is returned - currently failing due to issues linked RHOAIENG-9235',
      );
      filteredUrls.forEach((url) => {
        cy.request(url).then((response) => {
          const { status } = response;
          const logMessage =
            status === 200 ? `✅ ${url} - Status: ${status}` : `❌ ${url} - Status: ${status}`;
          cy.log(logMessage);
          expect(status).to.eq(200); // Assert that the response status is 200
        });
      });
    });
  });
});
