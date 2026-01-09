import { appChrome } from '../appChrome';

const MLFLOW_EXPERIMENTS_ROUTE = '/develop-train/experiments-mlflow';
const MLFLOW_DEFAULT_PATH = '/experiments';

class MLflowExperimentsPage {
  visit(mlflowPath?: string) {
    const url = mlflowPath ? `${MLFLOW_EXPERIMENTS_ROUTE}${mlflowPath}` : MLFLOW_EXPERIMENTS_ROUTE;
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

  getMlflowPath() {
    return cy.url().then((url) => {
      const urlObj = new URL(url);
      const { pathname, search } = urlObj;
      if (pathname.startsWith(MLFLOW_EXPERIMENTS_ROUTE)) {
        const mlflowPath = pathname.slice(MLFLOW_EXPERIMENTS_ROUTE.length) || MLFLOW_DEFAULT_PATH;
        return search ? `${mlflowPath}${search}` : mlflowPath;
      }
      return MLFLOW_DEFAULT_PATH;
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
