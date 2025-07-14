export interface NotebookImageInfo {
  image: string;
  name: string | null;
  versions: string[];
}

interface ImageStreamTag {
  name: string;
  from: {
    kind: string;
    name: string;
  };
}

interface ImageStream {
  metadata: {
    name: string;
  };
  spec: {
    tags: ImageStreamTag[];
  };
}

interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export const getImageStreamTags = (
  namespace: string,
  imageStreamName: string,
): Cypress.Chainable<string[]> => {
  return cy
    .exec(`oc get imagestream ${imageStreamName} -n ${namespace} -o json`)
    .then((result: ExecResult) => {
      if (result.code !== 0) {
        throw new Error(`Failed to get image stream: ${result.stderr}`);
      }
      const imageStream: ImageStream = JSON.parse(result.stdout);
      return imageStream.spec.tags.map((tag) => tag.name);
    })
    .then((tags) => tags.toSorted());
};

export const getNotebookImageNames = (
  namespace: string,
): Cypress.Chainable<NotebookImageInfo[]> => {
  return cy
    .exec(`oc get imagestream -n ${namespace} -o jsonpath='{.items[*].metadata.name}'`)
    .then((result: ExecResult) => {
      if (result.code !== 0) {
        throw new Error(`Failed to get image streams: ${result.stderr}`);
      }
      const imageNames = result.stdout.trim().split(' ');
      const imageInfos: NotebookImageInfo[] = [];

      // Create a chain of promises for each notebook image
      const imagePromises = imageNames
        .filter((imageName) => imageName.includes('notebook'))
        .map((imageName) => {
          return cy
            .exec(
              `oc get imagestream ${imageName} -n ${namespace} -o jsonpath='{.spec.tags[*].name}'`,
            )
            .then((tagResult: ExecResult) => {
              if (tagResult.code !== 0) {
                throw new Error(`Failed to get image stream tags: ${tagResult.stderr}`);
              }
              const versions = tagResult.stdout.trim().split(' ');
              imageInfos.push({ image: imageName, name: imageName, versions });
            });
        });

      // Wait for all image version queries to complete
      return cy.wrap(Promise.all(imagePromises)).then(() => imageInfos);
    });
};
