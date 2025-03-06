import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

interface NotebookImageInfo {
    image: string;
    name: string | null;
}

export const getNotebookImageNames = (
    namespace: string
): Cypress.Chainable<NotebookImageInfo[]> => {
    const getImageStreamsCommand = `oc get imagestream -n ${namespace} -o custom-columns=NAME:.metadata.name --no-headers`;
    cy.log(`Executing command: ${getImageStreamsCommand}`);

    return cy.exec(getImageStreamsCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
        const imageStreams = result.stdout.split('\n').filter(line => line.trim());
        cy.log(`Image Streams found: ${imageStreams.join(', ')}`);

        const notebookImagePromises = imageStreams.map(image => {
            const getNotebookImageNameCommand = `oc get imagestream/${image} -n ${namespace} -o jsonpath='{.metadata.annotations.opendatahub\\.io/notebook-image-name}'`;
            cy.log(`Executing command for ${image}: ${getNotebookImageNameCommand}`);

            return cy.exec(getNotebookImageNameCommand, { failOnNonZeroExit: false }).then((nameResult: CommandLineResult) => {
                const name = nameResult.stdout.trim() || null;
                const statusIcon = name ? '✅' : '❌';
                cy.log(`${statusIcon} Notebook Image Found for ${image}: ${name || 'Not found'}`);
                cy.log(`Raw result for ${image}: ${JSON.stringify(nameResult)}`); // Added line
                return cy.wrap({ image, name });
            });
        });

        // Wait for all promises to resolve and wrap the final result
        return Cypress.Promise.all(notebookImagePromises).then(results => {
            cy.log(`Final Notebook Image Infos (pre-wrap): ${JSON.stringify(results)}`); // Modified line
            return results; // Return resolved array
        });
    });
};
