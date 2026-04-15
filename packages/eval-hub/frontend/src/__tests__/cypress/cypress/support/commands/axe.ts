import 'cypress-axe';

type A11yOptions = {
  context?: Parameters<cy['checkA11y']>[0];
  axeOptions?: Parameters<cy['checkA11y']>[1];
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      testA11y: (contextOrOptions?: A11yOptions['context'] | A11yOptions) => void;
    }
  }
}

Cypress.Commands.add('testA11y', { prevSubject: 'optional' }, (subject, contextOrOptions) => {
  const isOptionsObject = (v: A11yOptions['context'] | A11yOptions | undefined): v is A11yOptions =>
    v != null && typeof v === 'object' && ('context' in v || 'axeOptions' in v);

  const resolvedContext = isOptionsObject(contextOrOptions)
    ? contextOrOptions.context
    : contextOrOptions;
  const extraAxeOptions = isOptionsObject(contextOrOptions)
    ? contextOrOptions.axeOptions
    : undefined;

  const test = (c: Parameters<typeof cy.checkA11y>[0]) => {
    cy.window({ log: false }).then((win) => {
      // inject on demand
      if (!(win as { axe: unknown }).axe) {
        cy.injectAxe();
      }
      cy.checkA11y(
        c,
        {
          includedImpacts: ['serious', 'critical'],
          ...extraAxeOptions,
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
    });
  };
  if (!resolvedContext && subject) {
    cy.wrap(subject).each(($el) => {
      Cypress.log({ displayName: 'testA11y', $el });
      test($el[0]);
    });
  } else {
    Cypress.log({ displayName: 'testA11y' });
    test(resolvedContext);
  }
});
