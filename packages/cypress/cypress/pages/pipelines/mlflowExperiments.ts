import { appChrome } from '../appChrome';

class MLflowExperimentsPage {
  visit(pathParam?: string) {
    const url = pathParam
      ? `/develop-train/experiments-mlflow?path=${encodeURIComponent(pathParam)}`
      : '/develop-train/experiments-mlflow';
    cy.visitWithLogin(url);
    this.wait();
  }

  private wait() {
    cy.findByTestId('mlflow-iframe');
    cy.testA11y();
  }

  findMlflowIframe() {
    return cy.findByTestId('mlflow-iframe');
  }

  getPathParam() {
    return cy.url().then((url) => {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('path');
    });
  }

  getEncodedPathParam() {
    return cy.url().then((url) => {
      const match = url.match(/[?&]path=([^&]*)/);
      return match ? match[1] : null;
    });
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Experiments (MLflow)',
      rootSection: 'Develop & train',
    });
  }
}

export const mlflowExperimentsPage = new MLflowExperimentsPage();
