export interface NotebookImageInfo {
  image: string;
  versions: string[];
}

export const getNotebookImageNames = (namespace: string): Cypress.Chainable<NotebookImageInfo[]> =>
  cy
    .exec(`oc get imagestream -n ${namespace} -o jsonpath='{.items[*].metadata.name}'`)
    .then((result) => {
      const imageNames = result.stdout.trim().split(' ');
      const imageInfos: NotebookImageInfo[] = [];

      // Create a chain of promises for each notebook image
      const imagePromises = imageNames
        .filter((imageName) => imageName.includes('notebook'))
        .map((imageName) =>
          cy
            .exec(
              `oc get imagestream ${imageName} -n ${namespace} -o jsonpath='{.spec.tags[*].name}'`,
            )
            .then((tagResult) => {
              const versions = tagResult.stdout.trim().split(' ');
              imageInfos.push({ image: imageName, versions });
            }),
        );

      // Wait for all image version queries to complete
      return cy.wrap(Promise.all(imagePromises)).then(() => imageInfos);
    });
