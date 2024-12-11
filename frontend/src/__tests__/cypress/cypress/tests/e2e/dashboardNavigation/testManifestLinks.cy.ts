describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
    it('Reads the manifest directory, filters out unwanted URLs, and validates the remaining URLs', () => {
        cy.step('Read the Manifest directory');

        // Specify the directory containing your YAML files
        const manifestsDir = '/Users/acoughli/forked-odh-dashboard/odh-dashboard/manifests';

        // Extract URLs from the manifests directory using the registered task
        cy.task<string[]>('extractHttpsUrls', manifestsDir).then((urls) => {
            // Filter out any URLs that contain 'git' or 'github'
            const filteredUrls = urls.filter(url => !url.includes('git') && !url.includes('github'));

            // Log filtered URLs for debugging
            console.log('Extracted valid URLs:');
            urls.forEach(url => {
                console.log(url); // Log each URL individually
                cy.log(url); // Also log to Cypress UI
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