describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
  it('Reads the manifest directory, filters out unwanted URLs, and validates the remaining URLs', () => {
    cy.step('Read the Manifest directory');

    // Specify the directory containing your YAML files
    const manifestsDir = '/Users/acoughli/forked-odh-dashboard/odh-dashboard/manifests';

    // Extract URLs from the manifests directory using the registered task
    cy.task<string[]>('extractHttpsUrls', manifestsDir).then((urls) => {
      // Filter out any URLs that contain 'git' or 'github'
      const filteredUrls = urls.filter(
        (url) =>
          !url.includes('my-project-s2i-python-service') &&
          !url.includes('user-dev-rhoam-quarkus') &&
          !url.includes('software.intel') &&
          !url.includes('docs.openvino') &&
          !url.includes('project-simple') &&
          !url.includes('red_hat_3scale_api_management') &&
          !url.includes('console-openshift-console.apps.test-cluster.example.com/') &&
          !url.includes('console-openshift-console.apps.test-cluster.example.com') &&
          !url.includes('ibm.com/docs/SSQNUZ_latest/svc-welcome/watsonxai.html') &&
          !url.includes('ibm.biz/wxai-install') &&
          !url.includes('ibm.com/docs/SSQNUZ_latest/wsj/analyze-data/fm-overview.html') &&
          !url.includes('ibm.com/docs/en/SSQNUZ_5.1.x/fixlist/watsonxai-fixlist.html') &&
          !url.includes('ibm.com/docs/SSQNUZ_latest/fixlist/watsonxai-fixlist.html') &&
          !url.includes(
            'intel.com/content/www/us/en/developer/tools/oneapi/ai-analytics-toolkit.html',
          ) &&
          !url.includes('repo.anaconda.cloud/repo/t/$'),
      );

      // Log filtered URLs for debugging
      filteredUrls.forEach((url) => {
        cy.log(url);
      });

      // Verify that each remaining URL is accessible and returns a 200 status code
      cy.step('Verify that each filtered URL is accessible and that a 200 is returned');
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
