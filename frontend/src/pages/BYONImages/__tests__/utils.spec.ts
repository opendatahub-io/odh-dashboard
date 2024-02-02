/* eslint-disable camelcase */
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { mockByon } from '~/__mocks__/mockByon';
import {
  convertBYONImageToK8sResource,
  filterBlankPackages,
  getEnabledStatus,
} from '~/pages/BYONImages/utils';
import { BYONImage, BYONImagePackage } from '~/types';

describe('convertBYONImageToK8sResource', () => {
  it('should convert BYONImage to K8sResourceCommon', () => {
    const image: BYONImage = mockByon([
      {
        display_name: 'My Image',
        name: 'my-image',
      },
    ])[0];
    const expected: K8sResourceCommon = {
      kind: 'ImageStream',
      apiVersion: 'image.openshift.io/v1',
      metadata: {
        name: 'my-image',
        annotations: {
          'openshift.io/display-name': 'My Image',
        },
      },
    };
    expect(convertBYONImageToK8sResource(image)).toEqual(expected);
  });
});

describe('getEnabledStatus', () => {
  it('should return ENABLED if image is visible and has no error', () => {
    const image: BYONImage = mockByon([
      {
        name: 'my-image',
        display_name: 'My Image',
        visible: true,
        error: '',
        packages: [],
      },
    ])[0];
    expect(getEnabledStatus(image)).toBe(1);
  });

  it('should return ERROR if image has error', () => {
    const image: BYONImage = mockByon([
      {
        name: 'my-image',
        display_name: 'My Image',
        visible: true,
        error: 'error message',
        packages: [],
      },
    ])[0];
    expect(getEnabledStatus(image)).toBe(-1);
  });

  it('should return DISABLED if image is not visible', () => {
    const image: BYONImage = mockByon([
      {
        name: 'my-image',
        display_name: 'My Image',
        visible: false,
        error: '',
        packages: [],
      },
    ])[0];
    expect(getEnabledStatus(image)).toBe(0);
  });
});

describe('filterBlankPackages', () => {
  it('should filter out packages with blank name or version', () => {
    const packages: BYONImagePackage[] = [
      { name: '', version: '1.0.0', visible: true },
      { name: 'package1', version: '', visible: true },
      { name: '', version: '', visible: true },
      { name: 'package2', version: '2.0.0', visible: true },
    ];
    const expected: BYONImagePackage[] = [
      { name: '', version: '1.0.0', visible: true },
      { name: 'package1', version: '', visible: true },
      { name: 'package2', version: '2.0.0', visible: true },
    ];
    expect(filterBlankPackages(packages)).toEqual(expected);
  });

  it('should not filter out packages with non-blank name and version', () => {
    const packages: BYONImagePackage[] = [
      { name: 'package1', version: '1.0.0', visible: true },
      { name: 'package2', version: '2.0.0', visible: true },
    ];
    expect(filterBlankPackages(packages)).toEqual(packages);
  });
});
