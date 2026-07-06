import { Contextual } from './Contextual';

export class DashboardCodeEditor extends Contextual<HTMLElement> {
  waitForReady(): this {
    this.find().find('.monaco-editor .view-lines', { timeout: 30000 }).should('be.visible');
    return this;
  }

  findInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('.view-lines.monaco-mouse-cursor-text');
  }

  findUpload(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('input[type="file"]');
  }

  findStartFromScratchButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: 'Start from scratch' });
  }

  containsText(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    // .contains() command normalizes &nbsp; to regular spaces while the assertion does not
    return this.find().contains(text);
  }

  clear(): void {
    this.setValue('');
  }

  setValue(value: string): void {
    this.findUpload().selectFile(
      {
        contents: Cypress.Buffer.from(value),
        fileName: 'editor-content.yaml',
        mimeType: 'text/yaml',
      },
      { force: true },
    );
  }

  replaceInEditor(oldText: string, newText: string): void {
    this.find()
      .find('.view-lines .view-line')
      .then(($lines) => {
        const currentContent = Array.from($lines)
          .map((line) => line.textContent.replace(/\u00a0/g, ' '))
          .join('\n');
        expect(currentContent).to.include(oldText);
        const newContent = currentContent.replace(oldText, newText);
        this.findUpload().selectFile(
          {
            contents: Cypress.Buffer.from(newContent),
            fileName: 'editor-content.yaml',
            mimeType: 'text/yaml',
          },
          { force: true },
        );
      });
  }

  copyToClipboard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('button[aria-label="Copy code to clipboard"]');
  }

  upload(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('button[aria-label="Upload code"]');
  }

  download(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('button[aria-label="Download code"]');
  }
}
