import { Contextual } from './Contextual';

interface MonacoWindow {
  monaco: {
    editor: {
      getEditors: () => Array<{
        getModel: () => { getValue: () => string; setValue: (value: string) => void } | null;
      }>;
    };
  };
}

/**
 * Page object for the Dashboard Code Editor component.
 * There are two ways to interact with the editor:
 * 1. Interact with the HTML element directly
 * 2. Use the Monaco API to interact with the editor.
 *
 * Interacting with the HTML element can be unreliable.
 * The Monaco API is more reliable but you need to `cy.wait` for the editor to be ready if you try to use it right away.
 */
export class DashboardCodeEditor extends Contextual<HTMLElement> {
  waitForReady(): this {
    // cy.wait is required for the Monaco editor to be fully mounted and ready to accept input.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    this.find()
      .find('.monaco-editor')
      .should(($el) => {
        const win = $el[0].ownerDocument.defaultView as unknown as MonacoWindow;
        const editors = win.monaco.editor.getEditors();
        expect(editors).to.have.length.greaterThan(0);
        expect(editors[0].getModel()).to.not.equal(null);
      });
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
    this.find()
      .find('.monaco-editor')
      .then(($el) => {
        const win = $el[0].ownerDocument.defaultView as unknown as MonacoWindow;
        const model = win.monaco.editor.getEditors()[0]?.getModel();
        if (!model) {
          throw new Error('No Monaco editor model found');
        }
        model.setValue(value);
      });
  }

  replaceInEditor(oldText: string, newText: string): void {
    this.find()
      .find('.monaco-editor')
      .then(($el) => {
        const win = $el[0].ownerDocument.defaultView as unknown as MonacoWindow;
        const model = win.monaco.editor.getEditors()[0]?.getModel();
        if (!model) {
          throw new Error('No Monaco editor model found');
        }
        expect(model.getValue()).to.include(oldText);
        model.setValue(model.getValue().replace(oldText, newText));
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
