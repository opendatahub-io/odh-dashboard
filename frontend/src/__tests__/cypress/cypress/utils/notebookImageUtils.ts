interface ImageStreamTag {
  name: string;
  annotations?: Record<string, string>;
}

interface ImageStream {
  metadata: { name: string };
  spec: { tags?: ImageStreamTag[] };
}

export interface NotebookImageInfo {
  image: string;
  versions: string[];
}

export const getNotebookImageNames = (
  namespace: string,
): Cypress.Chainable<NotebookImageInfo[]> => {
  return cy.exec(`oc get imagestream -n ${namespace} -o json`).then((result) => {
    const imagestreams: ImageStream[] = JSON.parse(result.stdout).items;
    const imageInfos: NotebookImageInfo[] = [];

    imagestreams
      .filter((image) => image.metadata.name.includes('notebook'))
      .forEach((image) => {
        // Filter out outdated tags
        const validTags = (image.spec.tags || []).filter(
          (tag) => tag.annotations?.['opendatahub.io/image-tag-outdated'] !== 'true',
        );
        const versions = validTags.map((tag) => tag.name);
        imageInfos.push({ image: image.metadata.name, versions });
      });

    return imageInfos;
  });
};
