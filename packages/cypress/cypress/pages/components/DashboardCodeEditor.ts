import { Contextual } from './Contextual';

type MonacoModel = {
  getValue: () => string;
  setValue: (value: string) => void;
};

type MonacoGlobal = {
  editor: {
    getModels: () => MonacoModel[];
  };
};

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
    // Monaco virtualizes lines; read/write via Monaco model instead of DOM.
    this.waitForReady();
    cy.window().then((win) => {
      const { monaco } = win as unknown as { monaco?: MonacoGlobal };
      if (!monaco) {
        throw new Error('Monaco editor was not found on window');
      }

      const models = monaco.editor.getModels();
      const model = models[0];
      expect(model, 'Monaco editor model').to.not.equal(undefined);
      const currentContent = model.getValue().replace(/\u00a0/g, ' ');
      expect(currentContent).to.include(oldText);
      const updated = currentContent.replace(oldText, newText);
      model.setValue(updated);
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
