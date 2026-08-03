/**
 * Utility functions for CodeEditor download testing in Cypress.
 * PatternFly CodeEditor downloads via Blob + URL.createObjectURL + anchor click.
 */

export type CapturedDownload = {
  fileName: string;
  content: string;
};

/**
 * Stubs browser download APIs and captures file name + content.
 * Must be called AFTER the editor is visible (window/stubs can reset on navigation).
 *
 * @param aliasName The alias name to use for the captured downloads array (without @).
 */
export const stubDownload = (aliasName: string): void => {
  cy.window().then((win) => {
    const downloads: CapturedDownload[] = [];
    cy.wrap(downloads).as(aliasName);

    let pendingContent = '';
    const OriginalBlob = win.Blob;
    cy.stub(win, 'Blob').callsFake(function BlobStub(
      blobParts?: BlobPart[],
      options?: BlobPropertyBag,
    ) {
      if (Array.isArray(blobParts)) {
        const [firstPart] = blobParts;
        if (typeof firstPart === 'string') {
          pendingContent = firstPart;
        }
      }
      return new OriginalBlob(blobParts, options);
    });

    cy.stub(win.URL, 'createObjectURL').callsFake(() => 'blob:cypress-mock-download');

    cy.stub(win.HTMLAnchorElement.prototype, 'click').callsFake(function anchorClickStub(
      this: HTMLAnchorElement,
    ) {
      if (this.download) {
        downloads.push({ fileName: this.download, content: pendingContent });
      }
    });
  });
};

/**
 * Gets the captured download records.
 *
 * @param aliasName The alias name used in stubDownload (without @).
 */
export const getDownloadedContent = (aliasName: string): Cypress.Chainable<CapturedDownload[]> =>
  cy.get<CapturedDownload[]>(`@${aliasName}`);
