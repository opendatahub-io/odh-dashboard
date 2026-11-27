/**
 * Covers the exact-match rules the Data Connect Hub page object uses to identify a connection-type
 * card and a connections-table row, without starting Cypress or a cluster.
 */
import { describe, expect, it } from '@jest/globals';
import { connectionRowMatches, connectionTypeCardMatches } from '../connectionSelectors';

const createConnectionRow = (name: string, description?: string, type = 'URI'): HTMLElement => {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  const link = document.createElement('a');
  link.textContent = name;
  nameCell.append(link);
  if (description) {
    const descriptionText = document.createElement('div');
    descriptionText.textContent = description;
    nameCell.append(descriptionText);
  }
  const typeCell = document.createElement('td');
  typeCell.textContent = type;
  const statusCell = document.createElement('td');
  statusCell.textContent = 'Unverified';
  row.append(nameCell, typeCell, statusCell);
  return row;
};

const createConnectionTypeCard = (title: string, typeId = 'type-id'): HTMLElement => {
  const card = document.createElement('div');
  card.dataset.testid = `${typeId}--ConnectionTypeCard`;
  const titleElement = document.createElement('div');
  titleElement.id = `${typeId}--ConnectionTypeCard-card-title`;
  const titleText = document.createElement('div');
  titleText.textContent = title;
  titleElement.append(titleText);
  const radio = document.createElement('input');
  radio.type = 'radio';
  card.append(titleElement, radio);
  return card;
};

describe('connectionRowMatches', () => {
  it('matches the row whose name link has the requested text', () => {
    expect(connectionRowMatches(createConnectionRow('regression-s3'), 'regression-s3')).toBe(true);
  });

  it('does not match a connection whose name only starts with the requested name', () => {
    expect(connectionRowMatches(createConnectionRow('regression-s3-backup'), 'regression-s3')).toBe(
      false,
    );
  });

  it('does not match a row whose description contains the requested name', () => {
    const row = createConnectionRow('archive', 'Replacement for regression-s3');
    expect(connectionRowMatches(row, 'regression-s3')).toBe(false);
  });

  it('does not match a row whose type or status contains the requested name', () => {
    const row = createConnectionRow('archive', undefined, 'regression-s3');
    expect(connectionRowMatches(row, 'regression-s3')).toBe(false);
  });

  it('ignores whitespace around the rendered name', () => {
    const row = createConnectionRow(' regression-s3 ');
    expect(connectionRowMatches(row, 'regression-s3')).toBe(true);
  });
});

describe('connectionTypeCardMatches', () => {
  it('matches the card whose title is exactly the requested display name', () => {
    expect(connectionTypeCardMatches(createConnectionTypeCard('URI'), 'URI')).toBe(true);
  });

  it('does not match a card whose title only contains the requested name', () => {
    expect(connectionTypeCardMatches(createConnectionTypeCard('URI v1'), 'URI')).toBe(false);
    expect(connectionTypeCardMatches(createConnectionTypeCard('My URI'), 'URI')).toBe(false);
  });
});
