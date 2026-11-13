class SuiteBuilderPage {
  findNameInput() {
    return cy.findByTestId('goal-suite-name');
  }

  findDescriptionInput() {
    return cy.findByTestId('goal-suite-description');
  }

  findMaxBenchmarksInput() {
    return cy.findByTestId('goal-suite-max-benchmarks');
  }

  findStrictnessSelect() {
    return cy.findByTestId('goal-suite-strictness');
  }

  findEvaluationGoalInput() {
    return cy.findByTestId('goal-suite-evaluation-goal');
  }

  findGoalExample(id: string) {
    return cy.findByTestId(`define-goal-example-${id}`);
  }

  findViewExamplesButton() {
    return cy.findByTestId('define-goal-view-examples');
  }

  findSelectedRecommendationModel() {
    return cy.findByTestId('selected-recommendation-model');
  }

  findRecommendButton() {
    return cy.findByTestId('recommend-benchmarks-with-ai');
  }

  findNameError() {
    return cy.findByTestId('suite-builder-name-error');
  }

  findNextButton() {
    return cy.findByTestId('next-suite-settings');
  }

  findBackButton() {
    return cy.findByTestId('suite-builder-back');
  }

  findCurrentStep(stepId: 'suite-settings' | 'define-goal' | 'benchmark-overview' | 'review') {
    const stepTitles = {
      'suite-settings': 'Suite settings',
      'define-goal': 'Define goal',
      'benchmark-overview': 'Benchmark overview',
      review: 'Review',
    };
    return cy.findByRole('button', { name: new RegExp(stepTitles[stepId]) });
  }

  findDefineGoalStep() {
    return cy.findByTestId('define-goal-step');
  }
}

export const suiteBuilderPage = new SuiteBuilderPage();
