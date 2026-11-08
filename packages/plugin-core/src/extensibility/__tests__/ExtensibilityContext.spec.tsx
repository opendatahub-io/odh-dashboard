import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { useExtensions } from '../../core/useExtensions';
import { ExtensibilityContextProvider } from '../ExtensibilityContext';

jest.mock('@module-federation/runtime', () => ({
  init: jest.fn(() => ({ options: { remotes: [] } })),
  loadRemote: jest.fn(),
  registerRemotes: jest.fn(),
}));

const mockLoadRemote = jest.mocked(loadRemote);

const isTestExtension = (e: Extension): e is Extension<'test.ext', { id: string }> =>
  e.type === 'test.ext';

const staticExtensions: Record<string, Extension[]> = {
  staticPlugin: [{ type: 'test.ext', properties: { id: 'static' } }],
};

const ExtensionIds: React.FC = () => {
  const extensions = useExtensions(isTestExtension);
  return <div data-testid="ids">{extensions.map((e) => e.properties.id).join(',')}</div>;
};

describe('ExtensibilityContextProvider', () => {
  it('should provide static extensions to children through the plugin store', () => {
    render(
      <ExtensibilityContextProvider staticExtensions={staticExtensions}>
        <ExtensionIds />
      </ExtensibilityContextProvider>,
    );
    expect(screen.getByTestId('ids')).toHaveTextContent('static');
  });

  it('should render the loading fallback until remote extensions are loaded', async () => {
    let resolveRemote: (value: { default: Extension[] }) => void = () => undefined;
    mockLoadRemote.mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );

    render(
      <ExtensibilityContextProvider
        staticExtensions={staticExtensions}
        mfRemotes={JSON.stringify([{ name: 'remoteA', remoteEntry: '/remoteEntry.js' }])}
        loadingFallback={<div>loading</div>}
      >
        <ExtensionIds />
      </ExtensibilityContextProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('ids')).not.toBeInTheDocument();

    resolveRemote({ default: [{ type: 'test.ext', properties: { id: 'remote' } }] });

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('static,remote'));
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });
});
