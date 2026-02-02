import { appChrome } from '../appChrome';

const MLFLOW_EXPERIMENTS_ROUTE = '/develop-train/experiments-mlflow';
const MLFLOW_DEFAULT_PATH = '/experiments';

class MLflowExperimentsPage {
  visit(mlflowPath?: string, namespace?: string) {
    const ns = namespace || 'test-project';
    const baseUrl = `${MLFLOW_EXPERIMENTS_ROUTE}/workspaces/${ns}/experiments`;
    let url: string;
    if (mlflowPath) {
      if (mlflowPath.startsWith('/workspaces/')) {
        url = `${MLFLOW_EXPERIMENTS_ROUTE}${mlflowPath}`;
      } else {
        url = `${MLFLOW_EXPERIMENTS_ROUTE}/workspaces/${ns}${mlflowPath}`;
      }
    } else {
      url = baseUrl;
    }
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

  findProjectSelect() {
    return cy.findByTestId('project-selector-toggle');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().click();
    cy.findByTestId('project-selector-search').fill(name);
    cy.findByTestId('project-selector-menuList')
      .contains('button', name)
      .should('be.visible')
      .click();
  }

  findEmptyState() {
    return cy.findByTestId('mlflow-no-projects-empty-state');
  }

  findLightThemeToggle() {
    return cy.findByTestId('light-theme-toggle');
  }

  findDarkThemeToggle() {
    return cy.findByTestId('dark-theme-toggle');
  }
}

export const mlflowExperimentsPage = new MLflowExperimentsPage();
