import fullExtensions from '../index';
import deployments from '../deployments';

describe('deployment extension entry point', () => {
  it('should register the deployment list and wizard with their serving gate', () => {
    const routes = deployments.filter((extension) => extension.type !== 'app.area');
    expect(routes.map((extension) => extension.type)).toEqual([
      'app.tab-route/tab',
      'app.route',
      'model-serving.platform',
      'model-serving.deployment/wizard-field',
    ]);
    expect(routes[0].properties).toMatchObject({ pageId: 'models-tab-page', id: 'deployments' });
    expect(routes[1].properties).toMatchObject({ path: '/ai-hub/models/deployments/deploy/*' });
    routes.forEach((extension) => {
      expect(extension.flags).toEqual({ required: ['model-serving-shell'] });
    });
  });

  it('should preserve the selected declarations and their order in the full dashboard', () => {
    expect(
      fullExtensions.filter((extension) => deployments.some((selected) => selected === extension)),
    ).toEqual(deployments);
    expect(fullExtensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'core.action',
          properties: expect.objectContaining({ id: 'runtime-image-install' }),
        }),
        expect.objectContaining({ type: 'app.project-details/tab' }),
      ]),
    );
    expect(fullExtensions.some((extension) => extension.type === 'app.tab-route/page')).toBe(true);
    expect(deployments.some((extension) => extension.flags?.required?.includes('ADMIN_USER'))).toBe(
      false,
    );
  });
});
