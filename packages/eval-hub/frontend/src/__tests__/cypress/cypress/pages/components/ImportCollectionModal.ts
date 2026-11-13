import { Modal } from './Modal';

type MonacoModel = {
  getValue: () => string;
};

type MonacoGlobal = {
  editor: {
    getEditors: () => {
      getDomNode: () => HTMLElement | null;
      getModel: () => MonacoModel | null;
    }[];
  };
};

export class ImportCollectionModal extends Modal {
  constructor() {
    super('Import collection');
  }

  // The modal's accessible name incorporates the editor content, so the
  // role-based lookup in the base class cannot match it exactly; find the
  // modal box by its test id instead.
  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('import-collection-modal');
  }

  shouldBeOpen(open = true): void {
    if (open) {
      // Monaco's syntax token colors come from PatternFly's editor theme and
      // trip the color-contrast rule; the editor widget is excluded from the
      // scan while the surrounding dialog remains checked.
      this.find().testA11y({ exclude: ['.monaco-editor'] });
    } else {
      this.find().should('not.exist');
    }
  }

  findEditor(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('import-collection-editor');
  }

  waitForEditorReady(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Not .view-lines: Monaco positions it fixed, which Cypress's
    // visibility algorithm cannot validate; the widget root is the
    // reliable readiness signal.
    return this.findEditor().find('.monaco-editor').should('be.visible');
  }

  findFileInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findEditor().findByTestId('import-collection-file-input');
  }

  /** The Monaco decoration marking the YAML syntax error line. */
  findErrorLine(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findEditor().find('.evalhub-code-editor__error-line');
  }

  /**
   * Monaco virtualizes lines, so the content is read through the Monaco
   * model rather than the DOM.
   */
  getValue(): Cypress.Chainable<string> {
    this.waitForEditorReady();
    return this.findEditor().then(($container) =>
      cy.window().then((win) => {
        const { monaco } = win as unknown as { monaco?: MonacoGlobal };
        if (!monaco) {
          throw new Error('Monaco editor was not found on window');
        }
        const editors = monaco.editor.getEditors().filter((editor) => {
          const node = editor.getDomNode();
          return node !== null && $container[0].contains(node);
        });
        expect(editors, 'Monaco editor inside the import dialog').to.have.length(1);
        const model = editors[0].getModel();
        if (!model) {
          throw new Error('The import editor has no Monaco model');
        }
        return model.getValue();
      }),
    );
  }

  /**
   * Replaces the editor content by selecting it through the dialog's hidden
   * file input, which exercises the same validated read path as a real
   * upload.
   */
  setValue(content: string): void {
    this.findFileInput().selectFile(
      {
        contents: Cypress.Buffer.from(content),
        fileName: 'definition.yaml',
        mimeType: 'text/yaml',
      },
      { force: true },
    );
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByTestId('import-collection-submit');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByTestId('import-collection-cancel');
  }

  findFileError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-file-error');
  }

  findParseError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-parse-error');
  }

  findWarnings(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-warnings');
  }

  findCollisionAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-collision');
  }

  findMultiDocAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-multi-doc');
  }

  findSuccessAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-success');
  }

  findSubmitError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-submit-error');
  }

  findUseSuggestedNameButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findCollisionAlert().findByRole('button', { name: /Use suggested name/ });
  }
}

export const importCollectionModal = new ImportCollectionModal();
