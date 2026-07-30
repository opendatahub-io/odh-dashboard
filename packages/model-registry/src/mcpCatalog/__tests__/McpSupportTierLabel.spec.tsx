/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { McpCatalogCardLabelProps } from '@mf/modelRegistry/extension-points';
import McpSupportTierLabel from '../McpSupportTierLabel';

type ServerProps = McpCatalogCardLabelProps['server'];
type MetadataProp = NonNullable<ServerProps['customProperties']>[string];

const mockServer: ServerProps = {
  id: '1',
  name: 'Test Server',
  toolCount: 0,
};

const stringProp = (value: string): MetadataProp =>
  ({ metadataType: 'MetadataStringValue', string_value: value } as MetadataProp);

const boolProp = (): MetadataProp =>
  ({ metadataType: 'MetadataBoolValue', bool_value: true } as MetadataProp);

describe('McpSupportTierLabel', () => {
  it.each([
    ['partnerSupported', 'Partner supported'],
    ['redHatSupported', 'Red Hat supported'],
    ['communitySupported', 'Community supported'],
  ])('renders %s as "%s"', (tier, display) => {
    render(
      <McpSupportTierLabel
        server={{
          ...mockServer,
          customProperties: { supportTier: stringProp(tier) },
        }}
      />,
    );
    expect(screen.getByTestId('mcp-catalog-card-support-tier-1')).toHaveTextContent(display);
  });

  it('renders nothing when customProperties is absent', () => {
    const { container } = render(<McpSupportTierLabel server={mockServer} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for unknown tier values', () => {
    const { container } = render(
      <McpSupportTierLabel
        server={{
          ...mockServer,
          customProperties: { supportTier: stringProp('unknownTier') },
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when metadataType is not STRING', () => {
    const { container } = render(
      <McpSupportTierLabel
        server={{
          ...mockServer,
          customProperties: { supportTier: boolProp() },
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
