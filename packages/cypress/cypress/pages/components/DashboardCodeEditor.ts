import { Contextual } from './Contextual';

type MonacoModel = {
  getValue: () => string;
  setValue: (value: string) => void;
  uri?: { toString: () => string };
};

type MonacoMarker = {
  severity: number;
  message: string;
  resource?: { toString: () => string };
};

type MonacoGlobal = {
  editor: {
    getModels: () => MonacoModel[];
    getModelMarkers: (filter: object) => MonacoMarker[];
    getEditors: () => {
      getDomNode: () => HTMLElement | null;
      getModel: () => MonacoModel | null;
    }[];
    // MarkerSeverity.Error === 8 in monaco-editor
    MarkerSeverity?: { Error: number };
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

  /**
   * Waits until the editor model holds the given text.
   * `setValue` uploads a file, so the editor content only updates once the app has read it and
   * round-tripped the change back through its own state; assert on the model to wait for that.
   */
  shouldContainTextInModel(text: string): void {
    this.waitForReady();
    this.find().then(($container) => {
      // Re-read the live models on each retry, so this only passes once the app has applied the edit
      cy.window().then((win) =>
        cy.wrap(win, { log: false }).should(() => {
          const { monaco } = win as unknown as { monaco?: MonacoGlobal };
          if (!monaco) {
            throw new Error('Monaco editor was not found on window');
          }
          const editors = monaco.editor.getEditors().filter((editor) => {
            const node = editor.getDomNode();
            return node !== null && $container[0].contains(node);
          });
          expect(editors, 'Monaco editor inside the requested code editor').to.have.length(1);
          expect(editors[0].getModel()?.getValue() ?? '').to.contain(text);
        }),
      );
    });
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

  /**
   * Error markers for the Monaco model mounted in this editor.
   * Severity 8 = MarkerSeverity.Error. Scoped by model URI so other models
   * in the same Monaco instance cannot satisfy the assertion.
   */
  private errorMarkersInContainer(monaco: MonacoGlobal, container: HTMLElement): MonacoMarker[] {
    const editors = monaco.editor.getEditors().filter((editor) => {
      const node = editor.getDomNode();
      return node !== null && container.contains(node);
    });
    expect(editors, 'Monaco editor inside the requested code editor').to.have.length(1);
    const model = editors[0].getModel();
    if (!model?.uri) {
      throw new Error('The code editor has no Monaco model');
    }
    const errorSeverity = monaco.editor.MarkerSeverity?.Error ?? 8;
    return monaco.editor
      .getModelMarkers({ resource: model.uri })
      .filter((marker) => marker.severity === errorSeverity);
  }

  /**
   * Waits for Monaco error markers (monaco-yaml syntax diagnostics) on the editor model.
   */
  expectErrorMarkers(minCount = 1): void {
    this.waitForReady();
    this.find().then(($container) => {
      cy.window().should((win) => {
        const { monaco } = win as unknown as { monaco?: MonacoGlobal };
        if (!monaco) {
          throw new Error('Monaco editor was not found on window');
        }
        const markers = this.errorMarkersInContainer(monaco, $container[0]);
        expect(markers.length, 'Monaco error markers').to.be.at.least(minCount);
      });
    });
  }

  expectNoErrorMarkers(): void {
    this.waitForReady();
    this.find().then(($container) => {
      cy.window().should((win) => {
        const { monaco } = win as unknown as { monaco?: MonacoGlobal };
        if (!monaco) {
          throw new Error('Monaco editor was not found on window');
        }
        const markers = this.errorMarkersInContainer(monaco, $container[0]);
        expect(markers, 'Monaco error markers').to.have.length(0);
      });
    });
  }
}
