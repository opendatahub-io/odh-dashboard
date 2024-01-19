import 'cypress-axe';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      testA11y(context?: Parameters<cy['checkA11y']>[0]): void;
    }
  }
}

Cypress.Commands.overwrite('visit', (orig, url) => {
  orig(url);
  cy.injectAxe();
  cy.configureAxe();
});

Cypress.Commands.add('testA11y', { prevSubject: 'optional' }, (subject, context) => {
  // FIXME need to injectAxe again right before checkking to solve undefined error
  // https://github.com/component-driven/cypress-axe/issues/164
  cy.injectAxe();
  const test = (c: Parameters<typeof cy.checkA11y>[0]) => {
    cy.checkA11y(
      c,
      {
        includedImpacts: ['serious', 'critical'],
      },
      (violations) => {
        cy.task(
          'error',
          `${violations.length} accessibility violation${violations.length === 1 ? '' : 's'} ${
            violations.length === 1 ? 'was' : 'were'
          } detected`,
        );
        // pluck specific keys to keep the table readable
        const violationData = violations.map(({ id, impact, description, nodes }) => ({
          id,
          impact,
          description,
          nodes: nodes.length,
        }));

        cy.task('table', violationData);

        cy.task(
          'log',
          violations
            .map(
              ({ nodes }, i) =>
                `${i}. Affected elements:\n${nodes.map(
                  ({ target, failureSummary, ancestry }) =>
                    `\t${failureSummary} - ${target
                      .map((node) => `"${node}"\n${ancestry}`)
                      .join(', ')}`,
                )}`,
            )
            .join('\n'),
        );
      },
    );
  };
  if (!context && subject) {
    cy.wrap(subject).each(($el) => {
      test($el[0]);
    });
  } else {
    test(context);
  }
});
