import { mockDocs } from '@odh-dashboard/internal/__mocks__/mockDocs';
import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { mockQuickStarts } from '@odh-dashboard/internal/__mocks__/mockQuickStarts';
import type { OdhDocument } from '@odh-dashboard/internal/types';
import { OdhDocumentType } from '@odh-dashboard/internal/types';
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

  it('should show the RHOAI tutorial cards', () => {
    const tutorialDoc = (name: string, displayName: string): OdhDocument => ({
      kind: 'OdhDocument',
      metadata: { name, annotations: { 'opendatahub.io/categories': 'Getting started' } },
      spec: {
        appName: 'rhoai',
        displayName,
        description: `${displayName} description`,
        durationMinutes: 60,
        type: OdhDocumentType.Tutorial,
        url: 'https://example.com',
      },
    });
    cy.interceptOdh('GET /api/docs', [
      ...mockDocs(),
      tutorialDoc('rhoai-tutorial-fraud', 'Fraud detection example'),
      tutorialDoc('rhoai-tutorial-hospital-helpdesk', 'Hospital helpdesk GenAI example'),
    ]);
    homePage.visit();

    const homeResourceSection = homePage.getHomeResourceSection();
    homeResourceSection.find().scrollIntoView();
    homeResourceSection.findCard('rhoai-tutorial-fraud').should('exist');
    homeResourceSection.findCard('rhoai-tutorial-hospital-helpdesk').should('exist');
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
  it('should keep the section header visibile when an error occurs', () => {
    cy.interceptOdh('GET /api/docs', { statusCode: 500 });
    homePage.visit();

    const homeResourceSection = homePage.getHomeResourceSection();
    homeResourceSection.findErrorState().should('be.visible');
    homeResourceSection.findSectionHeading().should('be.visible');
  });
});
