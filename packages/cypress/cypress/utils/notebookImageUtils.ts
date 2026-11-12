interface ImageStreamTag {
  name: string;
  annotations?: Record<string, string>;
}

interface ImageStream {
  metadata: {
    name: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: { tags?: ImageStreamTag[] };
}

export interface NotebookImageInfo {
  image: string;
  versions: string[];
}

export interface NotebookImageSelection {
  imageInfos: NotebookImageInfo[];
  skipped: string[];
}

const NOTEBOOK_IMAGE_LABEL = 'opendatahub.io/notebook-image';
const HIDDEN_IMAGE_ANNOTATION = 'opendatahub.io/notebook-image-hidden';
const OUTDATED_TAG_ANNOTATION = 'opendatahub.io/image-tag-outdated';

// Match the create-workbench spawner: notebook-image=true, and not hidden.
const getSkipReason = (image: ImageStream): string | undefined => {
  const { name, labels, annotations } = image.metadata;
  if (labels?.[NOTEBOOK_IMAGE_LABEL] !== 'true') {
    return `Skipping ${name}: ${NOTEBOOK_IMAGE_LABEL} is not true`;
  }
  if (annotations?.[HIDDEN_IMAGE_ANNOTATION] === 'true') {
    return `Skipping ${name}: ${HIDDEN_IMAGE_ANNOTATION} is true`;
  }
  return undefined;
};

export const collectNotebookImages = (imagestreams: ImageStream[]): NotebookImageSelection => {
  const imageInfos: NotebookImageInfo[] = [];
  const skipped: string[] = [];

  imagestreams
    .filter((image) => image.metadata.name.includes('notebook'))
    .forEach((image) => {
      const reason = getSkipReason(image);
      if (reason) {
        skipped.push(reason);
        return;
      }

      // Filter out outdated tags. Deprecated images stay selectable.
      const validTags = (image.spec.tags || []).filter(
        (tag) => tag.annotations?.[OUTDATED_TAG_ANNOTATION] !== 'true',
      );
      imageInfos.push({ image: image.metadata.name, versions: validTags.map((tag) => tag.name) });
    });

  return { imageInfos, skipped };
};

export const requireNotebookImages = (
  imageInfos: NotebookImageInfo[],
  skipped: string[],
): NotebookImageInfo[] => {
  if (imageInfos.length === 0) {
    const details = skipped.length > 0 ? ` Skipped: ${skipped.join('; ')}.` : '';
    throw new Error(`No eligible notebook images found.${details}`);
  }
  return imageInfos;
};

export const getNotebookImageNames = (namespace: string): Cypress.Chainable<NotebookImageInfo[]> =>
  cy.exec(`oc get imagestream -n ${namespace} -o json`).then((result) => {
    const imagestreams: ImageStream[] = JSON.parse(result.stdout).items;
    const { imageInfos, skipped } = collectNotebookImages(imagestreams);

    skipped.forEach((message) => {
      Cypress.log({ message });
    });

    return requireNotebookImages(imageInfos, skipped);
  });
