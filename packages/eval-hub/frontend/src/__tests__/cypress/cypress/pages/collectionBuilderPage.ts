class CollectionBuilderPage {
  findNameInput() {
    return cy.findByTestId('goal-suite-name');
  }

  findDescriptionInput() {
    return cy.findByTestId('goal-suite-description');
  }

  findMaxBenchmarksSlider() {
    return cy.findByRole('slider', { name: 'Number of benchmarks' });
  }

  findMaxBenchmarksInput() {
    return cy.findByRole('spinbutton', { name: 'Number of benchmarks' });
  }

  findMaxBenchmarksHelper() {
    return cy.findByText('Set the maximum number of benchmarks AI should recommend, from 1 to 20.');
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

  findEditRecommendationModelButton() {
    return cy.findByTestId('edit-recommendation-model');
  }

  findRecommendationModelToggle() {
    return cy.findByTestId('recommendation-model-toggle');
  }

  findRecommendationModelOption(name: string) {
    return cy.findByTestId(`recommendation-model-option-${name}`);
  }

  findSaveRecommendationModelButton() {
    return cy.findByTestId('save-recommendation-model');
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

  findBenchmarkOverviewStep() {
    return cy.findByTestId('benchmark-overview-step');
  }

  findGenerationProgress() {
    return cy.findByTestId('collection-generation-progress');
  }

  findGenerationStatusHeading() {
    return cy.findByRole('heading', { name: 'AI is comparing benchmarks with your goal' });
  }

  findSelectedBenchmark(id: string) {
    return cy.findByTestId(`collection-generation-selected-${id}`);
  }

  findSelectedBenchmarkName(id: string) {
    return cy.findByTestId(`collection-generation-benchmark-name-${id}`);
  }

  findSelectionCount() {
    return cy.findByTestId('collection-generation-selection-count');
  }

  findReviewAlternativesButton() {
    return cy.findByTestId('collection-generation-review-alternatives');
  }

  findAlternative(id: string) {
    return cy.findByTestId(`collection-generation-alternative-${id}`);
  }

  findAddAlternativeButton(id: string) {
    return cy.findByTestId(`collection-generation-add-${id}`);
  }

  findCloseAlternativesButton() {
    return cy.findByTestId('collection-generation-close-alternatives');
  }

  findRemoveSelectedBenchmarkButton(id: string) {
    return cy.findByTestId(`collection-generation-remove-${id}`);
  }

  findOverviewNextButton() {
    return cy.findByTestId('next-benchmark-overview');
  }
}

export const collectionBuilderPage = new CollectionBuilderPage();
