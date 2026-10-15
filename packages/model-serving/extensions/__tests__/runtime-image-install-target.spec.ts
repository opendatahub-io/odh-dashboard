import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import extensions from '../runtime-image-install';
import { RUNTIME_IMAGE_INSTALL_ROUTE } from '../../src/components/runtimeImageInstall/const';

describe('Runtime image Install registrations', () => {
  it('should gate the install action and install page route for model serving admins', () => {
    expect(extensions).toHaveLength(2);
    extensions.forEach((extension) => {
      expect(extension.flags?.required).toEqual([SupportedArea.MODEL_SERVING, 'ADMIN_USER']);
    });
    expect(extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'core.action',
          properties: expect.objectContaining({
            group: 'runtime-catalog.runtime-image/details-action',
          }),
        }),
        expect.objectContaining({
          type: 'app.route',
          properties: expect.objectContaining({ path: RUNTIME_IMAGE_INSTALL_ROUTE }),
        }),
      ]),
    );
  });
});
