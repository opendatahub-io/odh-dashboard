import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

export interface NotebookImageInfo {
  image: string;
  name: string | null;
  versions: string[];
}

interface ImageStreamTag {
  name: string;
  annotations?: {
    'opendatahub.io/image-tag-outdated'?: string;
  };
}

export function getNotebookImageNames(namespace: string): Cypress.Chainable<NotebookImageInfo[]> {
  return cy
    .exec(`oc get imagestream -n ${namespace} -o json`, {
      failOnNonZeroExit: false,
    })
    .then((result: CommandLineResult) => {
      return cy.wrap(result).then((wrappedResult) => {
        try {
          const imageStreams = JSON.parse(wrappedResult.stdout);
          const notebookImages: NotebookImageInfo[] = [];

          imageStreams.items.forEach((item: any) => {
            if (item.metadata?.labels?.['opendatahub.io/notebook-image'] === 'true') {
              const versions =
                item.spec?.tags
                  ?.filter(
                    (tag: any) => tag.annotations?.['opendatahub.io/image-tag-outdated'] !== 'true',
                  )
                  ?.map((tag: any) => tag.name) || [];
              notebookImages.push({
                image: item.metadata.name,
                name: item.metadata.name,
                versions: versions.sort((a: string, b: string) =>
                  b.localeCompare(a, undefined, { numeric: true }),
                ),
              });
            }
          });

          cy.log(`Found ${notebookImages.length} notebook images`);
          return cy.wrap(notebookImages);
        } catch (error) {
          cy.log('Error parsing image stream data:', error);
          return cy.wrap([]);
        }
      });
    });
}
