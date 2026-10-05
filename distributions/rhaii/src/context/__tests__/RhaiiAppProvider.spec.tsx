import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { useWatchConnectionTypes } from '@odh-dashboard/plugin-core/host-api';
import RhaiiAppProvider from '../RhaiiAppProvider';

jest.mock('../ProjectsContextProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const ORIGINAL_TILT_FIXTURES = process.env.RHAII_TILT_FIXTURES;

const ConnectionTypesConsumer: React.FC = () => {
  const [connectionTypes] = useWatchConnectionTypes();
  return (
    <span data-testid="connection-type-names">
      {connectionTypes.map((connectionType) => connectionType.metadata.name).join(',')}
    </span>
  );
};

beforeEach(() => {
  globalThis.fetch = jest.fn(
    () =>
      new Promise<Response>(() => {
        // Keep the dashboard namespace request pending for this synchronous composition test.
      }),
  );
});

afterEach(() => {
  if (ORIGINAL_TILT_FIXTURES === undefined) {
    delete process.env.RHAII_TILT_FIXTURES;
  } else {
    process.env.RHAII_TILT_FIXTURES = ORIGINAL_TILT_FIXTURES;
  }
  jest.restoreAllMocks();
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe('RhaiiAppProvider Tilt fixture composition', () => {
  it.each([
    ['enabled', 'true', 'uri-v1'],
    ['disabled', 'false', ''],
    ['unset', undefined, ''],
  ] as const)(
    'should expose the expected connection types when fixtures are %s',
    (_state, flag, expected) => {
      if (flag === undefined) {
        delete process.env.RHAII_TILT_FIXTURES;
      } else {
        process.env.RHAII_TILT_FIXTURES = flag;
      }

      render(
        <RhaiiAppProvider>
          <ConnectionTypesConsumer />
        </RhaiiAppProvider>,
      );

      expect(screen.getByTestId('connection-type-names').textContent).toBe(expected);
    },
  );
});
