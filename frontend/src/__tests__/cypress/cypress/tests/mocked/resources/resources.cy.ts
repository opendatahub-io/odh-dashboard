import { mockDocs } from '#~/__mocks__/mockDocs';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { mockQuickStarts } from '#~/__mocks__/mockQuickStarts';
import { resources } from '#~/__tests__/cypress/cypress/pages/resources';

const listView = resources.getListView();
const cardView = resources.getCardView();

describe('Resources page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/docs', mockDocs());
    cy.interceptOdh('GET /api/components', null, mockComponents());
    cy.interceptOdh('GET /api/quickstarts', mockQuickStarts());

    resources.visit();
  });

  it('Toggle card and list', () => {
    cardView.find().should('exist');
    listView.find().should('not.exist');

    // check for list view
    const resourcesToolbar = resources.getLearningCenterToolbar();
    resourcesToolbar.findListToggleButton().click();
    cardView.find().should('not.exist');
    listView.find().should('exist');
    listView.findListItems().should('have.length', 7);

    //check for card view
    resourcesToolbar.findCardToggleButton().click();
    cardView.find().should('exist');
    listView.find().should('not.exist');
    cardView.findCardItems().should('have.length', 7);
  });

  it('Category filter for card', () => {
    const resourceFilters = resources.getLearningCenterFilters();

    // Data management
    resourceFilters.findCategoryFilter(1).click();
    cardView.getCard('jupyterhub-use-s3-bucket-data').find().should('exist');
    cardView.findCardItems().should('have.length', 1);
    cardView.getCard('jupyter-doc').find().should('not.exist');

    // Getting started
    resourceFilters.findCategoryFilter(2).click();
    cardView.getCard('create-jupyter-notebook').find().should('exist');
    cardView.findCardItems().should('have.length', 5);
    cardView.getCard('jupyterhub-use-s3-bucket-data').find().should('not.exist');

    // Model serving
    resourceFilters.findCategoryFilter(3).click();
    cardView.getCard('deploy-python-model').find().should('exist');
    cardView.findCardItems().should('have.length', 1);
    cardView.getCard('jupyterhub-use-s3-bucket-data').find().should('not.exist');

    // Notebook environments
    resourceFilters.findCategoryFilter(4).click();
    cardView.getCard('create-jupyter-notebook').find().should('exist');
    cardView.findCardItems().should('have.length', 5);
    cardView.getCard('jupyter-doc').find().should('not.exist');

    // Package management
    resourceFilters.findCategoryFilter(5).click();
    cardView.getCard('jupyterhub-install-python-packages').find().should('exist');
    cardView.findCardItems().should('have.length', 2);
    cardView.getCard('jupyter-doc').find().should('not.exist');
  });

  it('Category filter for list', () => {
    const resourcesToolbar = resources.getLearningCenterToolbar();
    resourcesToolbar.findListToggleButton().click();

    const resourceFilters = resources.getLearningCenterFilters();

    // Data management
    resourceFilters.findCategoryFilter(1).click();
    listView.findList('jupyterhub-use-s3-bucket-data').should('exist');
    listView.findListItems().should('have.length', 1);
    listView.findList('jupyter-doc').should('not.exist');

    // Getting started
    resourceFilters.findCategoryFilter(2).click();
    listView.findList('create-jupyter-notebook').should('exist');
    listView.findListItems().should('have.length', 5);
    listView.findList('jupyterhub-use-s3-bucket-data').should('not.exist');

    // Model serving
    resourceFilters.findCategoryFilter(3).click();
    listView.findList('deploy-python-model').should('exist');
    listView.findListItems().should('have.length', 1);
    listView.findList('jupyterhub-use-s3-bucket-data').should('not.exist');

    // Notebook environments
    resourceFilters.findCategoryFilter(4).click();
    listView.findList('create-jupyter-notebook').should('exist');
    listView.findListItems().should('have.length', 5);
    listView.findList('jupyter-doc').should('not.exist');

    // Package management
    resourceFilters.findCategoryFilter(5).click();
    listView.findList('jupyterhub-install-python-packages').should('exist');
    listView.findListItems().should('have.length', 2);
    listView.findList('jupyter-doc').should('not.exist');
  });

  it('Enabled state filter for card and list', () => {
    const resourcesToolbar = resources.getLearningCenterToolbar();
    const resourceFilters = resources.getLearningCenterFilters();

    // Enabled filter
    resourceFilters.findFilter('enabled-filter-checkbox').should('not.be.checked');
    resourceFilters.findFilter('enabled-filter-checkbox').check();
    cardView.findCardItems().should('have.length', 7);
    resourcesToolbar.findListToggleButton().click();
    listView.findListItems().should('have.length', 7);
    resourceFilters.findFilter('enabled-filter-checkbox').should('be.checked');
    resourceFilters.findFilter('enabled-filter-checkbox').uncheck();

    // Not enabled filter
    resourcesToolbar.findCardToggleButton().click();
    resourceFilters.findFilter('not-enabled-filter-checkbox').should('not.be.checked');
    resourceFilters.findFilter('not-enabled-filter-checkbox').check();
    cardView.find().should('not.exist');
    resourcesToolbar.findListToggleButton().click();
    listView.find().should('not.exist');
    resourceFilters.findFilter('not-enabled-filter-checkbox').should('be.checked');
    resourceFilters.findFilter('not-enabled-filter-checkbox').uncheck();
  });

  it('Resource type filter for card and list view', () => {
    const resourceFilters = resources.getLearningCenterFilters();
    const resourcesToolbar = resources.getLearningCenterToolbar();

    // Documentations
    resourceFilters.findFilter('documentation').should('not.be.checked');
    resourceFilters.findFilter('documentation').check();
    cardView.findCardItems().should('have.length', 1);
    resourcesToolbar.findListToggleButton().click();
    listView.findListItems().should('have.length', 1);
    resourceFilters.findFilter('documentation').should('be.checked');
    resourceFilters.findFilter('documentation').uncheck();

    // HowTo
    resourcesToolbar.findCardToggleButton().click();
    resourceFilters.findFilter('how-to').should('not.be.checked');
    resourceFilters.findFilter('how-to').check();
    cardView.findCardItems().should('have.length', 4);
    resourcesToolbar.findListToggleButton().click();
    listView.findListItems().should('have.length', 4);
    resourceFilters.findFilter('how-to').should('be.checked');
    resourceFilters.findFilter('how-to').uncheck();

    // QuickStart
    resourcesToolbar.findCardToggleButton().click();
    resourceFilters.findFilter('quickstart').should('not.be.checked');
    resourceFilters.findFilter('quickstart').check();
    cardView.findCardItems().should('have.length', 2);
    resourcesToolbar.findListToggleButton().click();
    listView.findListItems().should('have.length', 2);
    resourceFilters.findFilter('quickstart').should('be.checked');
    resourceFilters.findFilter('quickstart').uncheck();

    // Tutorial
    resourcesToolbar.findCardToggleButton().click();
    resourceFilters.findFilter('tutorial').should('not.be.checked');
    resourceFilters.findFilter('tutorial').check();
    cardView.find().should('not.exist');
    resourcesToolbar.findListToggleButton().click();
    listView.find().should('not.exist');
    resourceFilters.findFilter('tutorial').should('be.checked');
    resourceFilters.findFilter('tutorial').uncheck();
  });

  it('Provider and Provider type filters for card and list view', () => {
    const resourceFilters = resources.getLearningCenterFilters();
    const resourcesToolbar = resources.getLearningCenterToolbar();

    // Jupyter
    resourceFilters.findFilter('Jupyter').should('not.be.checked');
    resourceFilters.findFilter('Jupyter').check();
    cardView.findCardItems().should('have.length', 7);
    resourcesToolbar.findListToggleButton().click();
    listView.findListItems().should('have.length', 7);
    resourceFilters.findFilter('Jupyter').should('be.checked');
    resourceFilters.findFilter('Jupyter').uncheck();

    // Red Hat managed
    resourcesToolbar.findCardToggleButton().click();
    resourceFilters.findFilter('Red Hat managed').should('not.be.checked');
    resourceFilters.findFilter('Red Hat managed').check();
    cardView.findCardItems().should('have.length', 7);
    resourcesToolbar.findListToggleButton().click();
    listView.findListItems().should('have.length', 7);
    resourceFilters.findFilter('Red Hat managed').should('be.checked');
    resourceFilters.findFilter('Red Hat managed').uncheck();
  });

  it('Check for no result match', () => {
    const resourcesFilters = resources.getLearningCenterFilters();
    resourcesFilters.findFilter('tutorial').check();
    resources.findEmptyState().should('exist');
    resources.findClearFilterButton().should('exist');
    resources.findClearFilterButton().click();

    resources.findEmptyState().should('not.exist');
    cardView.findCardItems().should('have.length', 7);
  });

  it('Search functionality for card view', () => {
    const resourcesToolbar = resources.getLearningCenterToolbar();

    resourcesToolbar.findSearchInput().fill('Creating a Jupyter notebook');
    cardView.findCardItems().should('have.length', 1);
    cardView.getCard('create-jupyter-notebook').find().should('exist');

    resourcesToolbar.findSearchInput().clear().type('How to');
    cardView.findCardItems().should('have.length', 5);
    cardView.getCard('deploy-python-model').find().should('exist');
    cardView.getCard('jupyterhub-install-python-packages').find().should('exist');
    cardView.getCard('jupyterhub-update-server-settings').find().should('exist');
    cardView.getCard('jupyterhub-use-s3-bucket-data').find().should('exist');
    cardView.getCard('jupyterhub-view-installed-packages').find().should('exist');
  });

  it('Search functionality for list view', () => {
    const resourcesToolbar = resources.getLearningCenterToolbar();
    resourcesToolbar.findListToggleButton().click();

    resourcesToolbar.findSearchInput().fill('Creating a Jupyter notebook');
    listView.findListItems().should('have.length', 1);
    listView.findList('create-jupyter-notebook').should('exist');

    resourcesToolbar.findSearchInput().clear().type('How to');
    listView.findListItems().should('have.length', 5);
    listView.findList('deploy-python-model').should('exist');
    listView.findList('jupyterhub-install-python-packages').should('exist');
    listView.findList('jupyterhub-update-server-settings').should('exist');
    listView.findList('jupyterhub-use-s3-bucket-data').should('exist');
    listView.findList('jupyterhub-view-installed-packages').should('exist');
  });

  it('Check for sorting of cards', () => {
    const resourcesToolbar = resources.getLearningCenterToolbar();
    resourcesToolbar.selectResourceType('type');
    let resourceCard = cardView.getCard('jupyter-doc');
    resourceCard.shouldCardBeInFirstPosition();

    resourceCard = cardView.getCard('create-jupyter-notebook');
    resourcesToolbar.selectResourceType('application');
    resourceCard.shouldCardBeInFirstPosition();

    resourceCard = cardView.getCard('jupyter-doc');
    resourcesToolbar.selectResourceType('duration');
    resourceCard.shouldCardBeInFirstPosition();

    resourceCard = cardView.getCard('jupyterhub-view-installed-packages');
    resourcesToolbar.selectResourceOrder('DESC');
    resourceCard.shouldCardBeInFirstPosition();

    resourceCard = cardView.getCard('jupyter-doc');
    resourcesToolbar.selectResourceOrder('ASC');
    resourceCard.shouldCardBeInFirstPosition();
  });

  it('check for sorting of lists', () => {
    const resourcesToolbar = resources.getLearningCenterToolbar();
    resourcesToolbar.findListToggleButton().click();

    // sort by name
    listView.shouldListBeInFirstPosition('create-jupyter-notebook');
    listView.findSortUpButton('name').click();
    listView.shouldListBeInFirstPosition('jupyter-doc');
    listView.findSortDownButton('name').click();
    listView.shouldListBeInFirstPosition('create-jupyter-notebook');

    // sort by Application
    listView.findSortButton('application').click();
    listView.shouldListBeInFirstPosition('create-jupyter-notebook');
    listView.findSortUpButton('application').click();
    listView.shouldListBeInFirstPosition('jupyter-doc');
    listView.findSortDownButton('application').click();
    listView.shouldListBeInFirstPosition('create-jupyter-notebook');

    // sort by Type
    listView.findSortButton('type').click();
    listView.shouldListBeInFirstPosition('jupyter-doc');
    listView.findSortUpButton('type').click();
    listView.shouldListBeInFirstPosition('deploy-python-model');
    listView.findSortDownButton('type').click();
    listView.shouldListBeInFirstPosition('jupyter-doc');

    // sort by duration
    listView.findSortButton('duration').click();
    listView.shouldListBeInFirstPosition('jupyter-doc');
    listView.findSortUpButton('duration').click();
    listView.shouldListBeInFirstPosition('jupyterhub-view-installed-packages');
    listView.findSortDownButton('duration').click();
    listView.shouldListBeInFirstPosition('jupyter-doc');
  });

  it('Check for Quick start card drawer', () => {
    const resourceCard = cardView.getCard('create-jupyter-notebook');
    resourceCard.findQuickStartCardOpenButton().should('have.text', 'Open');
    resourceCard.findQuickStartCardOpenButton().click();

    const quickStartDrawer = resources.getQuickStartDrawer();
    quickStartDrawer.find().should('exist');

    resourceCard.findQuickStartCardOpenButton().should('have.text', 'Close');
    quickStartDrawer.findQuickStartButton().should('be.enabled');
    quickStartDrawer.findQuickStartButton().click();
    resourceCard.findQuickStartCardOpenButton().should('have.text', 'Continue');

    // Checking for leave quick start modal
    quickStartDrawer.findCloseDrawerButton().click();
    resources.findLeaveQuickStartDialogue().should('exist');
    resources.findLeaveButton().click();

    resourceCard.findQuickStartCardOpenButton().should('have.text', 'Continue');
    resourceCard.findQuickStartCardOpenButton().click();
    quickStartDrawer.find().should('exist');

    quickStartDrawer.findNextButton().should('be.enabled');
    quickStartDrawer.findBackButton().should('be.enabled');
    quickStartDrawer.findRestartButton().should('be.enabled');
    quickStartDrawer.findRadioYesButton().click();
    quickStartDrawer.findNextButton().click();
    quickStartDrawer.findRadioYesButton().click();
    quickStartDrawer.findNextButton().click();
    quickStartDrawer.findRadioYesButton().click();
    quickStartDrawer.findNextButton().click();
    quickStartDrawer.findCloseButton().click();
    quickStartDrawer.find().should('not.exist');

    resourceCard.findQuickStartCardOpenButton().should('have.text', 'Restart');
    resourceCard.findQuickStartCardOpenButton().click();
    quickStartDrawer.find().should('exist');

    resourceCard.findQuickStartCardOpenButton().should('have.text', 'Close');
    resourceCard.findQuickStartCardOpenButton().click();
  });

  it('check for other card footer link', () => {
    let resourceCard = cardView.getCard('jupyter-doc');
    resourceCard.findDocumentationCardFooterButton().should('have.text', 'View documentation');

    resourceCard = cardView.getCard('jupyterhub-view-installed-packages');
    resourceCard.findHowToArticleCardFooterButton().should('have.text', 'Read how-to article');
    resourceCard = cardView.getCard('create-jupyter-notebook');

    resourceCard.findQuickStartCardOpenButton().should('have.text', 'Open');
  });
});
