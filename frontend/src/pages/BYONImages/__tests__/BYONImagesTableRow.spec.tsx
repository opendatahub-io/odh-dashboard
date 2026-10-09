import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { ImageStreamAnnotation } from '#~/types';
import { mapImageStreamToBYONImage } from '#~/utilities/imageStreamUtils';
import BYONImagesTableRow from '#~/pages/BYONImages/BYONImagesTableRow';

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'opendatahub' }),
}));
jest.mock('#~/pages/BYONImages/ImageStatusToggle', () => () => null);
jest.mock('#~/pages/BYONImages/BYONImageHardwareProfiles', () => () => null);

describe('BYONImagesTableRow tier label', () => {
  it.each([
    ['secure', 'Secure', 'blue'],
    ['Secure', 'Secure', 'blue'],
    ['community', 'Community', 'green'],
    ['custom', 'Custom', 'purple'],
    ['future-tier', 'Future-tier', 'grey'],
    ['', 'Custom', 'purple'],
    [undefined, 'Custom', 'purple'],
  ])(
    'should display tier %s beside Pre-installed with the selector styling',
    (tier, label, color) => {
      const image = mapImageStreamToBYONImage(
        mockImageStreamK8sResource({
          opts: { metadata: { annotations: { [ImageStreamAnnotation.NOTEBOOK_TIER]: tier } } },
        }),
      );
      render(
        <table>
          <BYONImagesTableRow
            obj={image}
            images={[image]}
            rowIndex={0}
            hardwareProfiles={[[], true, undefined]}
            onEditImage={jest.fn()}
            onDeleteImage={jest.fn()}
            claimSessionToggleIndex={jest.fn()}
          />
        </table>,
      );

      const nameCell = screen.getByRole('cell', { name: /Test Image/ });
      expect(within(nameCell).getByTestId('pre-installed-label')).toBeVisible();
      const tierLabel = within(nameCell).getByTestId('image-tier-label');
      expect(tierLabel).toHaveTextContent(label);
      // Grey is PatternFly's default label color and has no modifier class.
      if (color !== 'grey') {
        expect(tierLabel).toHaveClass(`pf-m-${color}`);
      }
    },
  );

  it('should show the tier for imported images without a Pre-installed label', () => {
    const image = mapImageStreamToBYONImage(
      mockImageStreamK8sResource({
        opts: { metadata: { labels: { 'app.kubernetes.io/created-by': 'byon' } } },
      }),
    );
    render(
      <table>
        <BYONImagesTableRow
          obj={image}
          images={[image]}
          rowIndex={0}
          hardwareProfiles={[[], true, undefined]}
          onEditImage={jest.fn()}
          onDeleteImage={jest.fn()}
          claimSessionToggleIndex={jest.fn()}
        />
      </table>,
    );

    expect(screen.queryByTestId('pre-installed-label')).not.toBeInTheDocument();
    expect(screen.getByTestId('image-tier-label')).toHaveTextContent('Custom');
  });
});
