const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE') || 'opendatahub';

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
    annotations?: {
      [key: string]: string;
    };
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

/**
 * Gets the display name of an imagestream based on the opendatahub.io/notebook-image-name annotation
 * @param imageStreamName - The name of the imagestream (e.g., 'code-server-notebook')
 * @param namespace - The namespace where the imagestream is located (defaults to APPLICATIONS_NAMESPACE)
 * @returns The display name from the annotation or the imagestream name as fallback
 */
export const getImageStreamDisplayName = (
  imageStreamName: string,
  namespace: string = applicationNamespace,
): Cypress.Chainable<string> => {
  return cy
    .exec(`oc get imagestream ${imageStreamName} -n ${namespace} -o json`)
    .then((result: ExecResult) => {
      if (result.code !== 0) {
        throw new Error(`Failed to get image stream: ${result.stderr}`);
      }
      const imageStream: ImageStream = JSON.parse(result.stdout);

      // Get display name from opendatahub.io/notebook-image-name annotation
      const displayName = imageStream.metadata.annotations?.['opendatahub.io/notebook-image-name'];

      // Fallback to imagestream name if annotation is not present
      return displayName || imageStream.metadata.name;
    });
};

/**
 * Checks if an imagestream exists in the given namespace
 * @param imageStreamName - The name of the imagestream
 * @param namespace - The namespace to check (defaults to APPLICATIONS_NAMESPACE)
 * @returns Promise that resolves to true if imagestream exists, false otherwise
 */
export const imageStreamExists = (
  imageStreamName: string,
  namespace: string = applicationNamespace,
): Cypress.Chainable<boolean> => {
  return cy
    .exec(`oc get imagestream ${imageStreamName} -n ${namespace} --ignore-not-found -o name`)
    .then((result: ExecResult) => {
      return result.stdout.trim() !== '';
    });
};

/**
 * Gets all available notebook imagestreams in a namespace
 * @param namespace - The namespace to search (defaults to APPLICATIONS_NAMESPACE)
 * @returns Array of imagestream names that contain 'notebook'
 */
export const getAvailableNotebookImageStreams = (
  namespace: string = applicationNamespace,
): Cypress.Chainable<string[]> => {
  return cy
    .exec(`oc get imagestream -n ${namespace} -o jsonpath='{.items[*].metadata.name}'`)
    .then((result: ExecResult) => {
      if (result.code !== 0) {
        throw new Error(`Failed to get image streams: ${result.stderr}`);
      }
      const imageNames = result.stdout.trim().split(' ').filter(Boolean);
      return imageNames.filter((imageName) => imageName.includes('notebook'));
    });
};

/**
 * Selects an appropriate imagestream for testing. Prefers the specified imagestream,
 * but falls back to any available notebook imagestream if the preferred one doesn't exist.
 * @param preferredImageStream - The preferred imagestream name (e.g., 'code-server-notebook')
 * @param namespace - The namespace to search (defaults to APPLICATIONS_NAMESPACE)
 * @returns The name of the imagestream to use for testing
 */
export const selectTestImageStream = (
  preferredImageStream: string,
  namespace: string = applicationNamespace,
): Cypress.Chainable<string> => {
  return imageStreamExists(preferredImageStream, namespace).then((exists) => {
    if (exists) {
      cy.log(`Using preferred imagestream: ${preferredImageStream}`);
      return cy.wrap(preferredImageStream);
    }
    cy.log(`Preferred imagestream ${preferredImageStream} not found, looking for alternatives`);
    return getAvailableNotebookImageStreams(namespace).then((availableImageStreams) => {
      if (availableImageStreams.length === 0) {
        throw new Error(`No notebook imagestreams found in namespace: ${namespace}`);
      }
      const selectedImageStream = availableImageStreams[0];
      cy.log(`Using alternative imagestream: ${selectedImageStream}`);
      return selectedImageStream;
    });
  });
};

/**
 * Helper function to assert that a notebook row displays the correct image name
 * based on the imagestream's display name annotation
 * @param imageStreamName - The name of the imagestream (e.g., 'code-server-notebook')
 * @param notebookRowTestId - The test id of the notebook row element (optional)
 * @param namespace - The namespace where the imagestream is located (defaults to APPLICATIONS_NAMESPACE)
 */
export const verifyNotebookImageDisplayName = (
  imageStreamName: string,
  notebookRowTestId?: string,
  namespace: string = applicationNamespace,
): void => {
  getImageStreamDisplayName(imageStreamName, namespace).then((expectedName) => {
    const selector = notebookRowTestId
      ? `[data-testid="${notebookRowTestId}"] [data-testid="image-display-name"]`
      : '[data-testid="image-display-name"]';
    cy.get(selector).should('contain.text', expectedName);
  });
};

/**
 * Validates that a notebook row shows the correct image display name for a given imagestream
 * @param imageStreamName - The name of the imagestream
 * @param rowSelector - Cypress chainable that returns the notebook row element
 * @param namespace - The namespace where the imagestream is located (defaults to APPLICATIONS_NAMESPACE)
 */
export const validateNotebookRowImageName = (
  imageStreamName: string,
  rowSelector: () => Cypress.Chainable<JQuery<HTMLElement>>,
  namespace: string = applicationNamespace,
): void => {
  getImageStreamDisplayName(imageStreamName, namespace).then((expectedName) => {
    rowSelector().findByTestId('image-display-name').should('contain.text', expectedName);
  });
};

/**
 * Utility function to verify notebook image name from imagestream - can be used in page objects
 * @param imageStreamName - The name of the imagestream
 * @param namespace - The namespace where the imagestream is located (defaults to APPLICATIONS_NAMESPACE)
 */
export const shouldHaveNotebookImageNameFromImageStream = (
  imageStreamName: string,
  namespace: string = applicationNamespace,
): void => {
  getImageStreamDisplayName(imageStreamName, namespace).then((expectedName) => {
    cy.findByTestId('image-display-name').should('contain.text', expectedName);
  });
};

/**
 * Attempts to select a notebook image in UI, with backend fallback if not found
 * @param preferredImageStream - The preferred imagestream name (e.g., 'code-server-notebook')
 * @param createSpawnerPage - The page object instance for UI interaction
 * @param namespace - The namespace to search for alternatives if preferred fails (defaults to APPLICATIONS_NAMESPACE)
 * @returns The name of the imagestream that was actually selected
 */
export const selectNotebookImageWithBackendFallback = (
  preferredImageStream: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  createSpawnerPage: any,
  namespace: string = applicationNamespace,
): Cypress.Chainable<string> => {
  // Try to select the preferred image directly using page object method first
  cy.log(`Trying to select ${preferredImageStream} directly`);

  // Open the dropdown first so we can check if the element exists
  return createSpawnerPage
    .findNotebookImageSelector()
    .click()
    .then(() => {
      // Check if the preferred image exists in the dropdown
      return cy.get('body').then(($body) => {
        if ($body.find(`[data-testid="${preferredImageStream}"]`).length > 0) {
          // Preferred image found - select it
          cy.log(`Successfully found ${preferredImageStream} in dropdown`);
          return createSpawnerPage
            .findNotebookImage(preferredImageStream)
            .click()
            .then(() => cy.wrap(preferredImageStream));
        }
        // Preferred image not found - use backend fallback
        cy.log(`${preferredImageStream} not found in UI, using backend fallback`);
        return getAvailableNotebookImageStreams(namespace).then((availableImageStreams) => {
          if (availableImageStreams.length === 0) {
            throw new Error(`No notebook imagestreams found in namespace: ${namespace}`);
          }

          const [firstAvailableImage] = availableImageStreams;
          cy.log(`Selected fallback imagestream: ${firstAvailableImage}`);
          return createSpawnerPage
            .findNotebookImage(firstAvailableImage)
            .click()
            .then(() => cy.wrap(firstAvailableImage));
        });
      });
    });
};

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
