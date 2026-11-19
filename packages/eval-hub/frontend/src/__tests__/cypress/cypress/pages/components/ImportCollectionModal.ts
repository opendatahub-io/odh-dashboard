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
    super('Import collection from file');
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
    // reliable readiness signal. The height assertion guards the modal's
    // flex chain, which collapses the editor when a wrapper refuses to grow.
    return this.findEditor()
      .find('.monaco-editor')
      .should('be.visible')
      .and(($editor) => {
        expect($editor.outerHeight() ?? 0, 'Monaco editor height').to.be.greaterThan(200);
      });
  }

  findFileInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findEditor().findByTestId('import-collection-file-input');
  }

  /** Monaco's error marker squiggle (parse errors). */
  findErrorSquiggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findEditor().find('.squiggly-error');
  }

  /** Monaco's warning marker squiggles (advisory warnings). */
  findWarningSquiggles(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findEditor().find('.squiggly-warning');
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
   * Asserts the current model content. The editor value can lag a keystroke
   * because the name field debounces its write, so this retries instead of
   * asserting on a single read.
   */
  shouldContainValue(pattern: RegExp): void {
    this.waitForEditorReady();
    this.findEditor().should(($container) => {
      const win = $container[0].ownerDocument.defaultView as unknown as {
        monaco?: MonacoGlobal;
      };
      if (!win.monaco) {
        throw new Error('Monaco editor was not found on window');
      }
      const editors = win.monaco.editor.getEditors().filter((editor) => {
        const node = editor.getDomNode();
        return node !== null && $container[0].contains(node);
      });
      expect(editors, 'Monaco editor inside the import dialog').to.have.length(1);
      const model = editors[0].getModel();
      if (!model) {
        throw new Error('The import editor has no Monaco model');
      }
      expect(model.getValue()).to.match(pattern);
    });
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

  shouldBeReadOnly(): void {
    this.find().find('.pf-v6-c-code-editor').should('have.class', 'pf-m-read-only');
  }

  findLanguageLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('.pf-v6-c-code-editor__tab-text');
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.find().findByTestId('import-collection-name');
  }

  findResetButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-reset');
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

  findCollisionAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-collision');
  }

  findMultiDocAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-multi-doc');
  }

  findSubmitError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-collection-submit-error');
  }

  findUseSuggestedNameButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findCollisionAlert().findByRole('button', { name: /Use suggested name/ });
  }
}

export const importCollectionModal = new ImportCollectionModal();
