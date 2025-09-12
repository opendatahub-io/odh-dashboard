import type { MatcherOptions } from '@testing-library/cypress';
import type { Matcher, MatcherOptions as DTLMatcherOptions } from '@testing-library/dom';
import type { UserAuthConfig, DashboardConfig } from '#~/__tests__/cypress/cypress/types';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  getDashboardConfig,
  getNotebookControllerConfig,
  getNotebookControllerCullerConfig,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Visits relative URL (page) and performs a login if necessary.
       * If relativeUrl is '/' or empty string, uses base URL with query parameters (i.e. DevFeatureFlags).
       * If User credentials not provided, uses Admin credentials supplied by environment variables.
       *
       * @param relativeUrl the page to visit.
       * @param credentials login credentials
       */
      visitWithLogin: (
        relativeUrl: string,
        credentials?: UserAuthConfig,
      ) => Cypress.Chainable<void>;

      /**
       * Finds a app nav item relative to the subject element.
       *
       * @param args.name the name of the item
       * @param args.rootSection the root section of the item
       * @param args.subSection the sub-section of the item (optional, for nested navigation)
       */
      findAppNavItem: (args: {
        name: string;
        rootSection?: string;
        subSection?: string;
      }) => Cypress.Chainable<JQuery>;

      /**
       * Find a patternfly kebab toggle button.
       *
       * @param isDropdownToggle - True to indicate that it is a dropdown toggle instead of table kebab actions
       */
      findKebab: (isDropdownToggle?: boolean) => Cypress.Chainable<JQuery>;

      /**
       * Finds a patternfly kebab toggle button, opens the menu, and finds the action.
       *
       * @param name the name of the action in the kebeb menu
       * @param isDropdownToggle - True to indicate that it is a dropdown toggle instead of table kebab actions
       */
      findKebabAction: (
        name: string | RegExp,
        isDropdownToggle?: boolean,
      ) => Cypress.Chainable<JQuery>;

      /**
       * Finds a patternfly dropdown item by first opening the dropdown if not already opened.
       *
       * @param name the name of the item
       */
      findMenuItem: (name: string | RegExp) => Cypress.Chainable<JQuery>;

      /**
       * Finds a patternfly dropdown item by first opening the dropdown if not already opened.
       *
       * @param name the name of the item
       */
      findDropdownItem: (name: string | RegExp) => Cypress.Chainable<JQuery>;

      /**
       * Finds a patternfly dropdown item by data-testid, first opening the dropdown if not already opened.
       *
       * @param testId the name of the item
       */
      findDropdownItemByTestId: (testId: string) => Cypress.Chainable<JQuery>;
      /**
       * Finds a patternfly select option by first opening the select menu if not already opened.
       *
       * @param name the name of the option
       */
      findSelectOption: (name: string | RegExp) => Cypress.Chainable<JQuery>;
      /**
       * Finds a patternfly select option by first opening the select menu if not already opened.
       *
       * @param testId the name of the option
       */
      findSelectOptionByTestId: (testId: string) => Cypress.Chainable<JQuery>;
      /**
       * Finds a patternfly checkbox label by test-id and returns a number in that label
       *
       * @param testId the test-id of checkbox
       */
      findCheckboxLabelNumberByTestId: (testId: string) => Cypress.Chainable<number>;

      /**
       * Shortcut to first clear the previous value and then type text into DOM element.
       *
       * @see https://on.cypress.io/type
       */
      fill: (
        text: string,
        options?: Partial<Cypress.TypeOptions> | undefined,
      ) => Cypress.Chainable<unknown>;

      /**
       * Returns a PF Switch label for clickable actions.
       *
       * @param dataId - the data test id you provided to the PF Switch
       */
      pfSwitch: (dataId: string) => Cypress.Chainable<JQuery>;

      /**
       * Returns a PF Switch input behind the checkbox to compare .should('be.checked') like ops
       *
       * @param dataId
       */
      pfSwitchValue: (dataId: string) => Cypress.Chainable<JQuery>;

      /**
       * The bottom two functions, findByTestId and findAllByTestId have the disabled rule
       * method-signature-style because they are overwrites.
       * Thus, we cannot change it to use the property signature for functions.
       * https://typescript-eslint.io/rules/method-signature-style/
       */

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
      // eslint-disable-next-line @typescript-eslint/method-signature-style
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
      // eslint-disable-next-line @typescript-eslint/method-signature-style
      findAllByTestId(id: Matcher | Matcher[], options?: MatcherOptions): Chainable<JQuery>;

      /**
       * Retrieves the DashboardConfig from OpenShift and returns either the full config or a specific value.
       *
       * When no key is provided, returns the entire DashboardConfig object.
       * When a key is provided, returns the specific value for that key.
       *
       * @param key Optional. The specific config key to retrieve. Use dot notation for nested properties.
       *
       * @returns A Cypress.Chainable that resolves to the requested config value or the full config object.
       */
      getDashboardConfig: (key?: string) => Cypress.Chainable<DashboardConfig | unknown>;

      /**
       * Retrieves the Notebook Controller Config from OpenShift and returns either the full config or a specific value.
       *
       * When no key is provided, returns the entire Notebook Controller Config object.
       * When a key is provided, returns the specific value for that key.
       *
       * @param key Optional. The specific config key to retrieve. Use dot notation for nested properties.
       *
       * @returns A Cypress.Chainable that resolves to the requested config value or the full config object.
       */
      getNotebookControllerConfig: (key?: string) => Cypress.Chainable<DashboardConfig | unknown>;

      /**
       * Retrieves the Notebook Controller Culler Config from OpenShift and returns either the full config or a specific value.
       *
       * When no key is provided, returns the entire Notebook Controller Culler Config object.
       * When a key is provided, returns the specific value for that key.
       *
       * @param key Optional. The specific config key to retrieve. Use dot notation for nested properties.
       *
       * @returns A Cypress.Chainable that resolves to the requested config value or the full config object.
       */
      getNotebookControllerCullerConfig: (
        key?: string,
      ) => Cypress.Chainable<DashboardConfig | unknown>;
    }
  }
}

Cypress.Commands.addQuery(
  'findAppNavItem',
  (args: { name: string; rootSection?: string; subSection?: string }) => {
    Cypress.log({
      displayName: 'findAppNavItem',
      message: `name: ${args.name}, rootSection: ${args.rootSection ?? 'none'}, subSection: ${
        args.subSection ?? 'none'
      }`,
    });

    return (subject) => {
      Cypress.ensure.isElement(subject, 'findAppNavItem', cy);
      const $el: JQuery<HTMLElement> = subject;

      let $parent = $el;

      if (args.rootSection) {
        const $rootSectionElement = $parent
          .find(`:contains('${args.rootSection}')`)
          .closest('button');
        if ($rootSectionElement.length) {
          // Expand the root section if it's collapsed
          if ($rootSectionElement.attr('aria-expanded') === 'false') {
            $rootSectionElement.trigger('click');
          }
          // Move to the expanded root section's content area
          $parent = $rootSectionElement.parent();
        } else {
          Cypress.log({
            displayName: 'findAppNavItem',
            message: `Root section '${args.rootSection}' not found`,
          });
          return $parent.find('__non_existent_selector__');
        }
      }

      if (args.subSection && args.rootSection) {
        const $subSectionElement = $parent
          .find(`:contains('${args.subSection}')`)
          .closest('button');
        if ($subSectionElement.length) {
          // Expand the sub-section if it's collapsed
          if ($subSectionElement.attr('aria-expanded') === 'false') {
            $subSectionElement.trigger('click');
          }
          // Move to the expanded sub-section's content area
          $parent = $subSectionElement.parent();
        } else {
          Cypress.log({
            displayName: 'findAppNavItem',
            message: `Sub-section '${args.subSection}' not found in root section '${args.rootSection}'`,
          });
          return $parent.find('__non_existent_selector__');
        }
      }

      return $parent.find(`:contains('${args.name}')`).closest('a');
    };
  },
);

Cypress.Commands.add('visitWithLogin', (relativeUrl, credentials = HTPASSWD_CLUSTER_ADMIN_USER) => {
  if (Cypress.env('MOCK')) {
    cy.visit(relativeUrl);
  } else {
    let fullUrl: string;
    if (relativeUrl.replace(/\//g, '')) {
      fullUrl = new URL(relativeUrl, Cypress.config('baseUrl') || '').href;
    } else {
      fullUrl = new URL(Cypress.config('baseUrl') || '').href;
    }
    cy.step(`Navigate to: ${fullUrl}`);
    cy.intercept('GET', fullUrl, { log: false }).as('page');
    cy.visit(fullUrl, { failOnStatusCode: false });
    cy.wait('@page', { log: false }).then((interception) => {
      const statusCode = interception.response?.statusCode;
      if (statusCode === 403) {
        cy.log('Log in');
        cy.get('form[action="/oauth/start"]').submit();
        cy.findAllByRole('link', credentials.AUTH_TYPE ? { name: credentials.AUTH_TYPE } : {})
          .last()
          .then(($link) => {
            cy.wrap($link).click();
          });
        cy.get('input[name=username]').fill(credentials.USERNAME);
        cy.get('input[name=password]').fill(credentials.PASSWORD);
        cy.get('form').submit();
      } else if (!interception.response || statusCode !== 200) {
        throw new Error(`Failed to visit '${fullUrl}'. Status code: ${statusCode || 'unknown'}`);
      }
    });
  }
});

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
        return cy.get('[data-ouia-component-type="PF6/Dropdown"]').findByRole('menuitem', { name });
      });
  },
);

Cypress.Commands.add('findDropdownItem', { prevSubject: 'element' }, (subject, name) => {
  Cypress.log({ displayName: 'findDropdownItem', message: name });
  return cy.wrap(subject).then(($el) => {
    if ($el.attr('aria-expanded') === 'false') {
      cy.wrap($el).click();
    }
    return cy.get('[data-ouia-component-type="PF6/Dropdown"]').findByRole('menuitem', { name });
  });
});

Cypress.Commands.add('findMenuItem', { prevSubject: 'element' }, (subject, name) => {
  Cypress.log({ displayName: 'findMenuItem', message: name });
  return cy.wrap(subject).then(($el) => {
    if ($el.attr('aria-expanded') === 'false') {
      cy.wrap($el).click();
    }
    return cy.get('[data-ouia-component-type="PF6/Menu"]').findByRole('menuitem', { name });
  });
});

Cypress.Commands.add('findDropdownItemByTestId', { prevSubject: 'element' }, (subject, testId) => {
  Cypress.log({ displayName: 'findDropdownItemByTestId', message: testId });
  return cy.wrap(subject).then(($el) => {
    if ($el.attr('aria-expanded') === 'false') {
      cy.wrap($el).click();
    }
    return cy.wrap($el).parent().findByTestId(testId);
  });
});

Cypress.Commands.add('findSelectOption', { prevSubject: 'element' }, (subject, name) => {
  Cypress.log({ displayName: 'findSelectOption', message: name });
  return cy.wrap(subject).then(($el) => {
    if ($el.attr('aria-expanded') === 'false') {
      cy.wrap($el).click();
    }
    //cy.get('[role=listbox]') TODO fix cases where there are multiple listboxes
    return cy.findByRole('option', { name });
  });
});

Cypress.Commands.add('findCheckboxLabelNumberByTestId', (testId) => {
  if (typeof testId !== 'string') {
    throw new Error(`Invalid testId: expected string, got ${typeof testId}`);
  }
  Cypress.log({
    displayName: 'findCheckboxLabelNumberByTestId',
    message: `testId: ${JSON.stringify(testId)}`,
  });
  const sanitizedTestId = Cypress.$.escapeSelector(testId);
  return cy
    .get(`label[for=${sanitizedTestId}--check-box]`)
    .invoke('text')
    .then((labelText) => {
      const numberMatch = labelText.match(/\((\d+)\)/);
      if (numberMatch) {
        return parseInt(numberMatch[1], 10);
      }
      throw new Error('Number not found in label text');
    });
});

Cypress.Commands.add('findSelectOptionByTestId', { prevSubject: 'element' }, (subject, testId) => {
  Cypress.log({ displayName: 'findSelectOptionByTestId', message: testId });
  return cy.wrap(subject).then(($el) => {
    if ($el.attr('aria-expanded') === 'false') {
      cy.wrap($el).click();
    }
    return cy.wrap($el).parent().findByTestId(testId);
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
Cypress.Commands.add('getNotebookControllerConfig', getNotebookControllerConfig);
Cypress.Commands.add('getDashboardConfig', getDashboardConfig);
Cypress.Commands.add('getNotebookControllerCullerConfig', getNotebookControllerCullerConfig);

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
