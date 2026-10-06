import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import extensions from '../runtime-image-install';
import { PLACEHOLDER_INSTALL_PATH } from '../../src/components/runtimeImageInstall/const';

describe('Runtime image Install placeholder registrations', () => {
  it('should gate the install action and install page route for admins with the area enabled', () => {
    expect(extensions).toHaveLength(2);
    extensions.forEach((extension) => {
      expect(extension.flags?.required).toEqual([
        SupportedArea.RUNTIME_CATALOG,
        SupportedArea.MODEL_SERVING,
        'ADMIN_USER',
      ]);
    });
    expect(extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'core.action',
          properties: expect.objectContaining({
            group: 'model-runtime-library-placeholder.runtime-image/details-action',
          }),
        }),
        expect.objectContaining({
          type: 'app.route',
          properties: expect.objectContaining({ path: PLACEHOLDER_INSTALL_PATH }),
        }),
      ]),
    );
  });
});
