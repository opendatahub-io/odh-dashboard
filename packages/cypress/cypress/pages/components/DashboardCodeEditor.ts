import { Contextual } from './Contextual';

type MonacoModel = {
  getValue: () => string;
  setValue: (value: string) => void;
};

type MonacoGlobal = {
  editor: {
    getModels: () => MonacoModel[];
    getEditors: () => {
      getDomNode: () => HTMLElement | null;
      getModel: () => MonacoModel | null;
    }[];
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

  getValue(): Cypress.Chainable<string> {
    this.waitForReady();
    return this.find().then(($container) =>
      cy.window().then((win) => {
        const { monaco } = win as unknown as { monaco?: MonacoGlobal };
        if (!monaco) {
          throw new Error('Monaco editor was not found on window');
        }
        const editors = monaco.editor.getEditors().filter((editor) => {
          const node = editor.getDomNode();
          return node !== null && $container[0].contains(node);
        });
        expect(editors, 'Monaco editor inside the requested code editor').to.have.length(1);
        const model = editors[0].getModel();
        if (!model) {
          throw new Error('The code editor has no Monaco model');
        }
        return model.getValue();
      }),
    );
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
      expect(models.length, 'Monaco editor models').to.be.greaterThan(0);

      const matchingModels = models.filter((m) =>
        m
          .getValue()
          .replace(/\u00a0/g, ' ')
          .includes(oldText),
      );
      expect(
        matchingModels.length,
        `Expected exactly one Monaco model containing: "${oldText}"`,
      ).to.equal(1);

      const model = matchingModels[0];
      const currentContent = model.getValue().replace(/\u00a0/g, ' ');
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
