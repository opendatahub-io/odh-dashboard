import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { NIMPVCStorageMode } from '../../pages/deploymentWizard/fields/NIMPVCField';
import { getNIMWizardTrackingProperties } from '../nimWizardTracking';
import { NIM_IMAGE_FIELD_ID, NIM_PVC_STORAGE_FIELD_ID } from '../../constants';

const wizardState = (fields: Record<string, unknown>): WizardFormData['state'] =>
  fields as WizardFormData['state'];

const imageValue = {
  repository: 'nvcr.io/nim/snowflake/arctic-embed-l',
  tag: '1.0.1',
};

const imageExternalData = {
  [NIM_IMAGE_FIELD_ID]: {
    data: {
      nimImages: {
        images: [
          {
            name: 'arctic-embed-l',
            displayName: 'Snowflake Arctic Embed Large Embedding',
            namespace: 'nim/snowflake',
            tags: ['1.0.1'],
          },
        ],
      },
    },
  },
};

describe('getNIMWizardTrackingProperties', () => {
  it('should track the catalog image display name and new storage choices', () => {
    expect(
      getNIMWizardTrackingProperties(
        wizardState({
          [NIM_IMAGE_FIELD_ID]: imageValue,
          [NIM_PVC_STORAGE_FIELD_ID]: {
            storageMode: NIMPVCStorageMode.NEW,
            pvcName: 'user-pvc',
            subPath: 'private-path',
            storageClassName: 'gp3-csi',
            storageSizeGi: 75,
          },
        }),
        imageExternalData,
      ),
    ).toEqual({
      nimImage: 'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
      nimImageName: 'Snowflake Arctic Embed Large Embedding',
      nimPvcType: 'new',
      nimStorageSizeGi: 75,
      nimStorageClassName: 'gp3-csi',
    });
  });

  it('should track existing storage without new-storage properties or names', () => {
    expect(
      getNIMWizardTrackingProperties(
        wizardState({
          [NIM_IMAGE_FIELD_ID]: imageValue,
          [NIM_PVC_STORAGE_FIELD_ID]: {
            storageMode: NIMPVCStorageMode.EXISTING,
            pvcName: 'user-pvc',
            subPath: 'private-path',
            storageClassName: '',
            storageSizeGi: 75,
          },
        }),
        imageExternalData,
      ),
    ).toEqual({
      nimImage: 'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
      nimImageName: 'Snowflake Arctic Embed Large Embedding',
      nimPvcType: 'existing',
    });
  });

  it('should match catalog tags when the selected tag needs normalization', () => {
    expect(
      getNIMWizardTrackingProperties(
        wizardState({
          [NIM_IMAGE_FIELD_ID]: {
            repository: 'nvcr.io/nim/snowflake/arctic-embed-l',
            tag: '1.0',
          },
          [NIM_PVC_STORAGE_FIELD_ID]: {
            storageMode: NIMPVCStorageMode.EXISTING,
            storageClassName: '',
            storageSizeGi: 75,
          },
        }),
        {
          [NIM_IMAGE_FIELD_ID]: {
            data: {
              nimImages: {
                images: [
                  {
                    name: 'arctic-embed-l',
                    displayName: 'Snowflake Arctic Embed Large Embedding',
                    namespace: 'nim/snowflake',
                    tags: ['1.0'],
                  },
                ],
              },
            },
          },
        },
      ),
    ).toEqual({
      nimImage: 'nvcr.io/nim/snowflake/arctic-embed-l:1.0',
      nimImageName: 'Snowflake Arctic Embed Large Embedding',
      nimPvcType: 'existing',
    });
  });

  it('should omit the display name when the catalog image is unavailable', () => {
    expect(
      getNIMWizardTrackingProperties(
        wizardState({
          [NIM_IMAGE_FIELD_ID]: imageValue,
          [NIM_PVC_STORAGE_FIELD_ID]: {
            storageMode: NIMPVCStorageMode.NEW,
            storageClassName: '',
            storageSizeGi: 50,
          },
        }),
        { [NIM_IMAGE_FIELD_ID]: { data: { nimImages: { images: [] } } } },
      ),
    ).toEqual({
      nimImage: 'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
      nimPvcType: 'new',
      nimStorageSizeGi: 50,
    });
  });
});
