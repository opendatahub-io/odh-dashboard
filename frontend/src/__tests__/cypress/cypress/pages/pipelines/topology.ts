import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

class Topology {
  findTaskNode(name: string) {
    return cy.get(`[data-id="${name}"][data-kind="node"][data-type="DEFAULT_TASK_NODE"]`);
  }

  findTaskDrawer() {
    return cy.findByTestId('task-drawer');
  }

  findCloseDrawerButton() {
    return this.findTaskDrawer().findByRole('button', { name: 'Close drawer panel' });
  }
}

class PipelineRunBottomDrawer extends Contextual<HTMLDivElement> {
  findBottomDrawerDetailsTab() {
    return this.find().findByTestId('bottom-drawer-tab-Details');
  }
  findBottomDrawerYamlTab() {
    return this.find().findByTestId('bottom-drawer-tab-Run Output');
  }
  findBottomDrawerInputTab() {
    return this.find().findByTestId('bottom-drawer-tab-Input parameters');
  }

  findBottomDrawerDetailItem(key: string) {
    return new DetailsItem(() => this.find().findByTestId(`detail-item-${key}`).parent());
  }
}

class RunDetails extends Topology {
  findBottomDrawer() {
    return new PipelineRunBottomDrawer(() =>
      cy.findByTestId('pipeline-run-drawer-bottom').parent(),
    );
  }
}

class DetailsItem extends Contextual<HTMLDivElement> {
  findValue() {
    return this.find().findByTestId('detail-item-value');
  }
}

class PipelineDetails extends Topology {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/pipeline/view/${pipelineId}`);
    this.wait();
  }

  private wait() {
    cy.get('[data-test-id="topology"]');
    cy.testA11y();
  }
}

class PipelineRunJobDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelineRuns/${namespace}/pipelineRunJob/view/${pipelineId}`);
    this.wait();
  }

  private wait() {
    cy.get('[data-test-id="topology"]');
    cy.testA11y();
  }
}

class PipelineRunDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelineRuns/${namespace}/pipelineRun/view/${pipelineId}`);
    this.wait();
  }

  private wait() {
    cy.get('[data-test-id="topology"]');
    cy.testA11y();
  }
}

export const pipelineDetails = new PipelineDetails();
export const pipelineRunDetails = new PipelineRunDetails();
export const pipelineRunJobDetails = new PipelineRunJobDetails();
