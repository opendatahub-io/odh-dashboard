/**
 * Runs the create-connection page-object helper against rendered wizard cards in JSDOM.
 * The fake Cypress chain implements only the methods the helper uses, so the test covers the real
 * selector composition (card test ID, exact-title filter, card-scoped radio, click, assertions)
 * without a browser or cluster.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { dataConnectHubConnectionsPage } from '../connectionsPage';

type FakeChain = {
  findAllByTestId: (pattern: RegExp | string) => FakeChain;
  filter: (callback: (index: number, element: HTMLElement) => boolean) => FakeChain;
  find: (selector: string) => FakeChain;
  click: () => FakeChain;
  should: (assertion: string) => FakeChain;
};

const createChain = (subject: Element | Element[], clicked: HTMLElement[]): FakeChain => {
  const elements = Array.isArray(subject) ? subject : [subject];
  const chain: FakeChain = {
    findAllByTestId(pattern) {
      const matches = elements.flatMap((element) =>
        Array.from(element.querySelectorAll<HTMLElement>('[data-testid]')).filter((candidate) => {
          const testId = candidate.dataset.testid ?? '';
          return typeof pattern === 'string' ? testId === pattern : pattern.test(testId);
        }),
      );
      return createChain(matches, clicked);
    },
    filter(callback) {
      return createChain(
        elements.filter((element, index) => callback(index, element as HTMLElement)),
        clicked,
      );
    },
    find(selector) {
      return createChain(
        elements.flatMap((element) => Array.from(element.querySelectorAll(selector))),
        clicked,
      );
    },
    click() {
      elements.forEach((element) => {
        if (element instanceof HTMLInputElement) {
          const radio = element;
          radio.checked = true;
        }
        clicked.push(element as HTMLElement);
      });
      return chain;
    },
    should(assertion) {
      if (elements.length === 0) {
        throw new Error(`No element found to satisfy "${assertion}"`);
      }
      const [target] = elements;
      if (assertion === 'be.checked') {
        expect((target as HTMLInputElement).checked).toBe(true);
      } else if (assertion === 'be.enabled') {
        expect((target as HTMLButtonElement).disabled).toBe(false);
      }
      return chain;
    },
  };
  return chain;
};

const installFakeCypress = (clicked: HTMLElement[]): void => {
  Object.assign(globalThis, {
    cy: {
      findByTestId: (testId: string) => {
        const element = document.querySelector(`[data-testid="${testId}"]`);
        if (!element) {
          throw new Error(`No element with data-testid "${testId}"`);
        }
        return createChain(element, clicked);
      },
    },
  });
};

const createConnectionTypeCard = (typeId: string, title: string) => {
  const card = document.createElement('div');
  card.dataset.testid = `${typeId}--ConnectionTypeCard`;
  const cardTitle = document.createElement('div');
  cardTitle.id = `${typeId}--ConnectionTypeCard-card-title`;
  cardTitle.textContent = title;
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.dataset.testid = `${typeId}--ConnectionTypeCard-select`;
  card.append(cardTitle, radio);
  return { card, radio };
};

let postgresRadio: HTMLInputElement;
let uriRadio: HTMLInputElement;

beforeEach(() => {
  document.body.innerHTML = '';
  const tearsheet = document.createElement('div');
  tearsheet.dataset.testid = 'create-connection-tearsheet';
  const postgres = createConnectionTypeCard('postgres-id', 'PostgreSQL');
  const uri = createConnectionTypeCard('uri-id', 'URI');
  postgresRadio = postgres.radio;
  uriRadio = uri.radio;
  const nextButton = document.createElement('button');
  nextButton.dataset.testid = 'connection-wizard-next';
  tearsheet.append(postgres.card, uri.card);
  document.body.append(tearsheet, nextButton);
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'cy');
});

describe('dataConnectHubConnectionsPage.selectConnectionType', () => {
  it('selects the radio for the requested card and verifies the wizard can advance', () => {
    const clicked: HTMLElement[] = [];
    installFakeCypress(clicked);

    dataConnectHubConnectionsPage.selectConnectionType('PostgreSQL');

    expect(clicked).toEqual([postgresRadio]);
    expect(postgresRadio.checked).toBe(true);
    expect(uriRadio.checked).toBe(false);
  });

  it('does not select a card whose title only contains the requested name', () => {
    installFakeCypress([]);

    expect(() => dataConnectHubConnectionsPage.selectConnectionType('Postgres')).toThrow(
      /No element found to satisfy "be.checked"/,
    );
    expect(postgresRadio.checked).toBe(false);
    expect(uriRadio.checked).toBe(false);
  });
});
