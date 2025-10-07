import { Contextual } from './components/Contextual';
import { appChrome } from './appChrome';

class Resources {
  visit() {
    cy.visitWithLogin('/learning-resources');
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Learning resources' }).click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findClearFilterButton() {
    return cy.findByTestId('clear-all-filters');
  }

  getCardView(timeout: number = Cypress.config('defaultCommandTimeout')) {
    return new CardView(() =>
      // When using custom resources it can take time to show in view due to polling
      cy.findByTestId('learning-center-card-view', { timeout }),
    );
  }

  getListView() {
    return new ListView(() => cy.findByTestId('learning-center-list-view'));
  }

  getLearningCenterFilters() {
    return new LearningCenterFilters(() => cy.findByTestId('learning-center-filters'));
  }

  getLearningCenterToolbar() {
    return new LearningCenterToolbar(() => cy.findByTestId('learning-center-toolbar'));
  }

  getQuickStartDrawer() {
    return new QuickStartDrawer(() => cy.findByTestId('qs-drawer-creatingABasicWorkbench'));
  }

  findLeaveQuickStartDialogue() {
    return cy.findByRole('dialog');
  }

  findLeaveButton() {
    return cy.findByRole('button', { name: 'Leave' });
  }

  findResetButton() {
    return cy.get('[aria-label="Reset"]');
  }
}

class Card extends Contextual<HTMLElement> {
  shouldCardBeInFirstPosition() {
    this.find().eq(0);
    return this;
  }

  findQuickStartCardOpenButton() {
    return this.find().findByTestId('quick-start-button');
  }

  findDocumentationCardFooterButton() {
    return this.find().findByTestId('view-documentation');
  }

  findHowToArticleCardFooterButton() {
    return this.find().findByTestId('read-how-to-article');
  }
}

export class CardView extends Contextual<HTMLElement> {
  getCard(id: string): Card {
    return new Card(() => this.find().findByTestId(['card', id]));
  }

  findCardItems(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findAllByTestId(['card']);
  }
}

class ListView extends Contextual<HTMLElement> {
  findListItems() {
    return this.find().findAllByTestId(['list']);
  }

  findList(id: string) {
    return this.find().findAllByTestId(['list', id]);
  }

  shouldListBeInFirstPosition(id: string) {
    this.find().findByTestId(['list', id]).eq(0);
    return this;
  }

  findSortButton(type: string) {
    return this.find().findByTestId(['sort-icon', type]);
  }

  findSortDownButton(type: string) {
    return this.find().findByTestId(['sort-down-icon', type]);
  }

  findSortUpButton(type: string) {
    return this.find().findByTestId(['sort-up-icon', type]);
  }
}

class QuickStartDrawer extends Contextual<HTMLElement> {
  findQuickStartButton() {
    return this.find().findByTestId('qs-drawer-start');
  }

  findNextButton() {
    return this.find().findByTestId('qs-drawer-next');
  }

  findBackButton() {
    return this.find().findByTestId('qs-drawer-back');
  }

  findRestartButton() {
    return this.find().findByTestId('qs-drawer-side-note-action');
  }

  findCloseDrawerButton() {
    return this.find().findByTestId('qs-drawer-close');
  }

  findCloseButton() {
    return this.find().findByRole('button', { name: 'Close' });
  }

  findRadioYesButton() {
    return this.find().findByTestId('qs-drawer-check-yes');
  }
}

class LearningCenterFilters extends Contextual<HTMLElement> {
  findFilter(id: string) {
    return this.find().findByTestId(id);
  }

  findResourceCountById(id: string) {
    return this.find()
      .findCheckboxLabelNumberByTestId(id)
      .then((count) => count);
  }

  findCategoryFilter(index: number) {
    return this.find().find('ul>li').eq(index);
  }
}

class LearningCenterToolbar extends Contextual<HTMLElement> {
  findCardToggleButton() {
    return this.find().findByTestId('card-view-toggle-button');
  }

  findListToggleButton() {
    return this.find().findByTestId('list-view-toggle-button');
  }

  findSearchInput() {
    return this.find().findByLabelText('Search input');
  }

  selectResourceType(name: string) {
    this.find()
      .findByTestId('resources-select-type')
      .findByRole('button', { name: 'Options menu' })
      .findSelectOption(name)
      .click();
  }

  private findSortOrderToggle() {
    return this.find()
      .findByTestId('resources-order-type')
      .findByRole('button', { name: 'Options menu' })
      .click();
  }

  selectResourceOrder(order: string) {
    this.findSortOrderToggle().parents().findByTestId(order).click();
  }
}

export const resources = new Resources();
