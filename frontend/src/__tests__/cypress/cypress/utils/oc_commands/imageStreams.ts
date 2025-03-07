import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

interface NotebookImageInfo {
  image: string;
  name: string | null;
  versions: string[];
}

interface ImageStreamTag {
  name: string;
  annotations: {
    'opendatahub.io/image-tag-outdated'?: string;
    [key: string]: string | undefined;
  };
}

export const getNotebookImageNames = (
  namespace: string,
): Cypress.Chainable<NotebookImageInfo[]> => {
  const getImageStreamsCommand = `oc get imagestream -n ${namespace} -o custom-columns=NAME:.metadata.name --no-headers`;
  cy.log(`Executing command: ${getImageStreamsCommand}`);

  return cy
    .exec(getImageStreamsCommand, { failOnNonZeroExit: false })
    .then((result: CommandLineResult) => {
      const imageStreams = result.stdout.split('\n').filter((line) => line.trim());
      cy.log(`Image Streams found: ${imageStreams.join(', ')}`);

      // Process each image stream sequentially using a recursive function
      const processImageStreams = (
        streams: string[],
        index: number,
        accumulator: (NotebookImageInfo | null)[],
      ): Cypress.Chainable<(NotebookImageInfo | null)[]> => {
        if (index >= streams.length) {
          return cy.wrap(accumulator);
        }

        const image = streams[index];
        const getNotebookImageNameCommand = `oc get imagestream/${image} -n ${namespace} -o jsonpath='{.metadata.labels.opendatahub\\.io/notebook-image}'`;

        return cy
          .exec(getNotebookImageNameCommand, { failOnNonZeroExit: false })
          .then((nameResult: CommandLineResult) => {
            const output = nameResult.stdout.trim();
            const isNotebookImage = output === 'true' || output === 'true%';
            const statusIcon = isNotebookImage ? '✅' : '❌';
            cy.log(
              `${statusIcon} Notebook Image Found for ${image}: ${
                isNotebookImage ? 'true' : 'Not found'
              } (Output: "${output}")`,
            );

            if (!isNotebookImage) {
              // Wrap the accumulator before returning
              return cy.wrap([...accumulator, null]).then((newAccumulator) => {
                return processImageStreams(streams, index + 1, newAccumulator);
              });
            }

            const getImageNameCommand = `oc get imagestream/${image} -n ${namespace} -o jsonpath='{.metadata.annotations.opendatahub\\.io/notebook-image-name}'`;
            cy.log(`Executing get ImageName command for ${image}: ${getImageNameCommand}`);

            return cy
              .exec(getImageNameCommand, { failOnNonZeroExit: false })
              .then((imageNameResult: CommandLineResult) => {
                const imageName = imageNameResult.stdout.trim().replace('%', '') || null;
                cy.log(`Image name for ${image}: ${imageName || 'Not found'}`);

                const getTagsCommand = `oc get imagestream/${image} -n ${namespace} -o json`;

                return cy
                  .exec(getTagsCommand, { failOnNonZeroExit: false })
                  .then((tagsResult: CommandLineResult) => {
                    let validTags: string[] = [];
                    try {
                      const imageStreamData = JSON.parse(tagsResult.stdout);
                      // eslint-disable-next-line no-restricted-properties
                      validTags = (imageStreamData.spec.tags as ImageStreamTag[])
                        .filter(
                          (tag: ImageStreamTag) =>
                            !tag.annotations['opendatahub.io/image-tag-outdated'],
                        )
                        .map((tag: ImageStreamTag) => tag.name)
                        .sort((a: string, b: string) =>
                          b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }),
                        );

                      cy.log(`✅ Valid tags for ${image}:`, JSON.stringify(validTags, null, 2));
                    } catch (error) {
                      cy.log(`❌ Error parsing tags for ${image}:`, error);
                    }

                    const imageInfo: NotebookImageInfo = {
                      image,
                      name: imageName,
                      versions: validTags,
                    };

                    // Wrap the new accumulator before returning
                    return cy.wrap([...accumulator, imageInfo]).then((newAccumulator) => {
                      return processImageStreams(streams, index + 1, newAccumulator);
                    });
                  });
              });
          });
      };

      // Start processing with empty accumulator
      return processImageStreams(imageStreams, 0, []);
    })
    .then((results: (NotebookImageInfo | null)[]) => {
      const filteredResults = results.filter(
        (result): result is NotebookImageInfo => result !== null,
      );
      cy.log(`Final Notebook Image Infos: ${JSON.stringify(filteredResults, null, 2)}`);
      return cy.wrap(filteredResults);
    });
};
