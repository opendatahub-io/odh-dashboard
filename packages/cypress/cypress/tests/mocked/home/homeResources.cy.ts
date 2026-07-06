import { mockDocs } from '@odh-dashboard/internal/__mocks__/mockDocs';
import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { mockQuickStarts } from '@odh-dashboard/internal/__mocks__/mockQuickStarts';
import { homePage } from '../../../pages/home/home';
import { verifyRelativeURL } from '../../../utils/url';

describe('Home page Resources section', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/docs', mockDocs());
    cy.interceptOdh('GET /api/components', null, mockComponents());
    cy.interceptOdh('GET /api/quickstarts', mockQuickStarts());
    homePage.initHomeIntercepts();
    homePage.visit();
  });

  it('should show the resources section', () => {
    const homeResourceSection = homePage.getHomeResourceSection();
    homeResourceSection.find().scrollIntoView();
    homeResourceSection.findCard('create-jupyter-notebook').should('be.visible');
  });

  it('should hide the the resource section if none are available', () => {
    cy.interceptOdh('GET /api/docs', []);
    cy.interceptOdh('GET /api/components', null, []);
    cy.interceptOdh('GET /api/quickstarts', []);
    homePage.visit();
    homePage.getHomeResourceSection().find().should('not.exist');
  });
  it('should navigate to the resources page', () => {
    const homeResourceSection = homePage.getHomeResourceSection();
    homeResourceSection.findGoToResourceLink().scrollIntoView();
    homeResourceSection.findGoToResourceLink().click();
    verifyRelativeURL('/learning-resources');
  });
});
