import { MatcherOptions } from '@testing-library/cypress';
import { Matcher, MatcherOptions as DTLMatcherOptions } from '@testing-library/dom';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Visits the URL and performs a login if necessary.
       * Uses credentials supplied by environment variables if not provided.
       *
       * @param url the URL to visit
       * @param credentials login credentials
       */
      visitWithLogin(
        url: string,
        credentials?: { username?: string; password?: string },
      ): Cypress.Chainable<void>;

      /**
       * Find a patternfly kebab toggle button.
       *
       * @param isDropdownToggle - True to indicate that it is a dropdown toggle instead of table kebab actions
       */
      findKebab(isDropdownToggle?: boolean): Cypress.Chainable<JQuery>;

      /**
       * Finds a patternfly kebab toggle button, opens the menu, and finds the action.
       *
       * @param name the name of the action in the kebeb menu
       * @param isDropdownToggle - True to indicate that it is a dropdown toggle instead of table kebab actions
       */
      findKebabAction(name: string | RegExp, isDropdownToggle?: boolean): Cypress.Chainable<JQuery>;

      /**
       * Finds a patternfly dropdown item by first opening the dropdown if not already opened.
       *
       * @param name the name of the item
       */
      findDropdownItem(name: string | RegExp): Cypress.Chainable<JQuery>;

      /**
       * Finds a patternfly select option by first opening the select menu if not already opened.
       *
       * @param name the name of the option
       */
      findSelectOption(name: string | RegExp): Cypress.Chainable<JQuery>;

      /**
       * Shortcut to first clear the previous value and then type text into DOM element.
       *
       * @see https://on.cypress.io/type
       */
      fill(
        text: string,
        options?: Partial<Cypress.TypeOptions> | undefined,
      ): Cypress.Chainable<unknown>;

      /**
       * Returns a PF Switch label for clickable actions.
       *
       * @param dataId - the data test id you provided to the PF Switch
       */
      pfSwitch(dataId: string): Cypress.Chainable<JQuery>;

      /**
       * Returns a PF Switch input behind the checkbox to compare .should('be.checked') like ops
       *
       * @param dataId
       */
      pfSwitchValue(dataId: string): Cypress.Chainable<JQuery>;

      /**
       * Overwrite `findByTestId` to support an array of Matchers.
       * When an array of Matches is supplied, parses the data-testid attribute value as a
       * whitespace-separated list of words allowing the query to mimic the CSS selector `[data-testid~=value]`.
       *
       * data-testid="card my-id"
       *
       * cy.findByTestId(['card', 'my-id']);
       * cy.findByTestId('card my-id');
       */
      findByTestId(id: Matcher | Matcher[], options?: MatcherOptions): Chainable<JQuery>;

      /**
       * Overwrite `findAllByTestId` to support an array of Matchers.
       * When an array of Matches is supplied, parses the data-testid attribute value as a
       * whitespace-separated list of words allowing the query to mimic the CSS selector `[data-testid~=value]`.
       *
       * data-testid="card my-id"
       *
       * cy.findAllByTestId(['card']);
       * cy.findAllByTestId('card my-id');
       */
      findAllByTestId(id: Matcher | Matcher[], options?: MatcherOptions): Chainable<JQuery>;
    }
  }
}

Cypress.Commands.add(
  'visitWithLogin',
  (
    url,
    credentials = {
      username: Cypress.env('USERNAME'),
      password: Cypress.env('PASSWORD'),
    },
  ) => {
    cy.intercept('GET', url).as('visitWithLogin');

    cy.visit(url, { failOnStatusCode: false });

    cy.wait('@visitWithLogin').then((interception) => {
      if (interception.response?.statusCode === 403) {
        // do login
        cy.findByRole('button', { name: 'Log in with OpenShift' }).click();
        cy.findByRole('link', { name: 'customadmins' }).click();
        cy.findByLabelText('Username *').type(credentials.username);
        cy.findByLabelText('Password *').type(credentials.password);
        cy.findByRole('button', { name: 'Log in' }).click();
      } else if (interception.response?.statusCode !== 200) {
        throw new Error(
          `Failed to visit '${url}'. Status code: ${
            interception.response?.statusCode || 'unknown'
          }`,
        );
      } else {
        cy.log('Already logged in');
      }
    });
  },
);

Cypress.Commands.add('findKebab', { prevSubject: 'element' }, (subject, isDropdownToggle) => {
  Cypress.log({ displayName: 'findKebab' });
  return cy
    .wrap(subject)
    .findByRole('button', { name: isDropdownToggle ? 'Actions' : 'Kebab toggle' });
});

Cypress.Commands.add(
  'findKebabAction',
  { prevSubject: 'element' },
  (subject, name, isDropdownToggle) => {
    Cypress.log({ displayName: 'findKebab', message: name });
    return cy
      .wrap(subject)
      .findKebab(isDropdownToggle)
      .then(($el) => {
        if ($el.attr('aria-expanded') === 'false') {
          cy.wrap($el).click();
        }
        return cy.wrap($el.parent()).findByRole('menuitem', { name });
      });
  },
);

Cypress.Commands.add('findDropdownItem', { prevSubject: 'element' }, (subject, name) => {
  Cypress.log({ displayName: 'findDropdownItem', message: name });
  return cy.wrap(subject).then(($el) => {
    if ($el.find('[aria-expanded=false]').addBack().length) {
      cy.wrap($el).click();
    }
    return cy.wrap($el).findByRole('menuitem', { name });
  });
});

Cypress.Commands.add('findSelectOption', { prevSubject: 'element' }, (subject, name) => {
  Cypress.log({ displayName: 'findSelectOption', message: name });
  return cy.wrap(subject).then(($el) => {
    if ($el.find('[aria-expanded=false]').addBack().length) {
      cy.wrap($el).click();
    }
    //cy.get('[role=listbox]') TODO fix cases where there are multiple listboxes
    return cy.findByRole('option', { name });
  });
});

Cypress.Commands.add('fill', { prevSubject: 'optional' }, (subject, text, options) => {
  cy.wrap(subject).clear();
  return cy.wrap(subject).type(text, options);
});

Cypress.Commands.add('pfSwitch', { prevSubject: 'optional' }, (subject, dataId) => {
  Cypress.log({ displayName: 'pfSwitch', message: dataId });
  return cy.wrap(subject).findByTestId(dataId).parent();
});

Cypress.Commands.add('pfSwitchValue', { prevSubject: 'optional' }, (subject, dataId) => {
  Cypress.log({ displayName: 'pfSwitchValue', message: dataId });
  return cy.wrap(subject).pfSwitch(dataId).find('[type=checkbox]');
});

Cypress.Commands.overwriteQuery('findByTestId', function findByTestId(...args) {
  return enhancedFindByTestId(this, ...args);
});
Cypress.Commands.overwriteQuery('findAllByTestId', function findAllByTestId(...args) {
  return enhancedFindByTestId(this, ...args);
});

const enhancedFindByTestId = (
  command: Cypress.Command,
  originalFn: Cypress.QueryFn<'findAllByTestId' | 'findByTestId'>,
  matcher: Matcher | Matcher[],
  options?: MatcherOptions,
) => {
  if (Array.isArray(matcher)) {
    return originalFn.call(
      command,
      (content, node) => {
        const values = content.trim().split(/\s+/);
        return matcher.every((m) =>
          values.some((v) => {
            if (typeof m === 'string' || typeof m === 'number') {
              return options && (options as DTLMatcherOptions).exact
                ? v.toLowerCase().includes(matcher.toString().toLowerCase())
                : v === String(m);
            }
            if (typeof m === 'function') {
              return m(v, node);
            }
            return m.test(v);
          }),
        );
      },
      options,
    );
  }
  return originalFn.call(command, matcher, options);
};
