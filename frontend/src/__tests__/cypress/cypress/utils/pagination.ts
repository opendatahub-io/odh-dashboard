import { tablePagination } from '#~/__tests__/cypress/cypress/pages/components/Pagination';

type PaginationProp = {
  totalItems: number;
  firstElement: string;
  paginationVariant: 'top' | 'bottom';
};

export const testPagination = ({
  totalItems,
  firstElement,
  paginationVariant,
}: PaginationProp): void => {
  const pagination = paginationVariant === 'top' ? tablePagination.top : tablePagination.bottom;

  // check for 10 per page
  pagination.findFirstButton().should('be.disabled');
  pagination.findLastButton().click();
  pagination.findInput().should('have.value', Math.ceil(totalItems / 10));
  pagination.findLastButton().should('be.disabled');
  pagination.findFirstButton().click();
  pagination.findInput().should('have.value', '1');
  pagination.findFirstButton().should('be.disabled');

  pagination.findNextButton().click();
  pagination.findInput().should('have.value', '2');
  pagination.findNextButton().click();
  pagination.findInput().should('have.value', '3');

  pagination.findPreviousButton().click();
  pagination.findInput().should('have.value', '2');
  pagination.findPreviousButton().click();
  pagination.findInput().should('have.value', '1');

  // 20 per page
  pagination.selectToggleOption('20 per page');
  pagination.findFirstButton().should('be.disabled');
  cy.findByText(firstElement).should('exist');
  pagination.findLastButton().click();
  cy.findByText(firstElement).should('not.exist');
  pagination.findInput().should('have.value', Math.ceil(totalItems / 20));
  pagination.findLastButton().should('be.disabled');
  pagination.findFirstButton().click();
  pagination.findInput().should('have.value', '1');
  pagination.findFirstButton().should('be.disabled');
  pagination.selectToggleOption('10 per page');
};
