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
    const originalAnchorClick = win.HTMLAnchorElement.prototype.click;

    // Capture string content from PatternFly download Blobs (`type: 'text'`).
    // Monaco worker Blobs use `application/javascript` — leave those alone.
    cy.stub(win, 'Blob').callsFake(function BlobStub(
      blobParts?: BlobPart[],
      options?: BlobPropertyBag,
    ) {
      if (options?.type === 'text' && Array.isArray(blobParts)) {
        const [firstPart] = blobParts;
        if (typeof firstPart === 'string') {
          pendingContent = firstPart;
        }
      }
      return new OriginalBlob(blobParts, options);
    });

    cy.stub(win.HTMLAnchorElement.prototype, 'click').callsFake(function anchorClickStub(
      this: HTMLAnchorElement,
    ) {
      if (this.download) {
        downloads.push({ fileName: this.download, content: pendingContent });
        pendingContent = '';
        return;
      }
      return originalAnchorClick.call(this);
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
