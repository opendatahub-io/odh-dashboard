import * as React from 'react';
import { render } from '@testing-library/react';
import { useHostApi, type HostApiServices } from '@odh-dashboard/plugin-core/host-api';
import { DashboardNamespaceContext } from '../../../context/DashboardNamespaceContext';
import HostApiProvider from '../../../context/HostApiProvider';
import TiltFixturesProvider from '../TiltFixturesProvider';
import UriConnectionFormFields from '../UriConnectionFixture';

describe('TiltFixturesProvider', () => {
  it('overrides only the connection type services using the dashboard namespace', () => {
    let connectionTypeFormFields: HostApiServices['ConnectionTypeFormFields'] | undefined;
    let connectionTypesState: ReturnType<HostApiServices['useWatchConnectionTypes']> | undefined;
    let templatesState: ReturnType<HostApiServices['useTemplates']> | undefined;

    const Consumer: React.FC = () => {
      const fixtureHostApi = useHostApi();
      connectionTypeFormFields = fixtureHostApi.ConnectionTypeFormFields;
      connectionTypesState = fixtureHostApi.useWatchConnectionTypes();
      templatesState = fixtureHostApi.useTemplates();
      return null;
    };

    render(
      <DashboardNamespaceContext.Provider value="rhaii-system">
        <HostApiProvider>
          <TiltFixturesProvider>
            <Consumer />
          </TiltFixturesProvider>
        </HostApiProvider>
      </DashboardNamespaceContext.Provider>,
    );

    expect(connectionTypeFormFields).toBe(UriConnectionFormFields);

    const [connectionTypes, loaded, error] = connectionTypesState ?? [];
    expect(connectionTypes).toEqual([
      expect.objectContaining({
        metadata: expect.objectContaining({ name: 'uri-v1', namespace: 'rhaii-system' }),
      }),
    ]);
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
    expect(templatesState?.[0]).toEqual([]);
  });
});
