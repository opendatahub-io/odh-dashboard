class SuiteBuilderPage {
  findNameInput() {
    return cy.findByTestId('goal-suite-name');
  }

  findDescriptionInput() {
    return cy.findByTestId('goal-suite-description');
  }

  findMaxBenchmarksSlider() {
    return cy.findByRole('slider', { name: 'Number of benchmarks' });
  }

  findMaxBenchmarksSummary() {
    return cy.findByTestId('goal-suite-max-benchmarks-summary');
  }

  findMaxBenchmarksHelper() {
    return cy.findByText('Choose the maximum number of benchmarks AI should recommend');
  }

  findStrictnessSelect() {
    return cy.findByTestId('goal-suite-strictness');
  }

  findGenerationEffortSelect() {
    return cy.findByTestId('goal-suite-generation-effort');
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
      'suite-settings': 'Collection settings',
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
