// https://cloud.google.com/artifact-registry/docs/docker/names
// The full name for a container image is one of the following formats:
// LOCATION-docker.pkg.dev/PROJECT-ID/REPOSITORY/IMAGE
// LOCATION-docker.pkg.dev/PROJECT-ID/REPOSITORY/IMAGE:TAG
// LOCATION-docker.pkg.dev/PROJECT-ID/REPOSITORY/IMAGE@IMAGE-DIGEST

import { IMAGE_URL_REGEXP } from '../routes/api/images/imageUtils';

describe('IMAGE_URL_REGEXP', () => {
  test('Invalid URL', () => {
    const url = 'docker.io';
    const match = url.match(IMAGE_URL_REGEXP);
    expect(match?.[1]).toBe('');
  });

  test('Docker container URL without tag', () => {
    const url = 'docker.io/library/mysql';
    const match = url.match(IMAGE_URL_REGEXP);
    expect(match?.[1]).toBe('docker.io');
    expect(match?.[3]).toBe(undefined);
  });

  test('Docker container URL with tag', () => {
    const url = 'docker.io/library/mysql:test-tag';
    const match = url.match(IMAGE_URL_REGEXP);
    expect(match?.[1]).toBe('docker.io');
    expect(match?.[3]).toBe('test-tag');
  });

  test('OpenShift internal registry URL without tag', () => {
    const url = 'image-registry.openshift-image-registry.svc:5000/opendatahub/s2i-minimal-notebook';
    const match = url.match(IMAGE_URL_REGEXP);
    expect(match?.[1]).toBe('image-registry.openshift-image-registry.svc:5000');
    expect(match?.[3]).toBe(undefined);
  });

  test('OpenShift internal registry URL with tag', () => {
    const url =
      'image-registry.openshift-image-registry.svc:5000/opendatahub/s2i-minimal-notebook:v0.3.0-py36';
    const match = url.match(IMAGE_URL_REGEXP);
    expect(match?.[1]).toBe('image-registry.openshift-image-registry.svc:5000');
    expect(match?.[3]).toBe('v0.3.0-py36');
  });

  test('Quay URL with port and tag', () => {
    const url = 'quay.io:443/opendatahub/odh-dashboard:main-55e19fa';
    const match = url.match(IMAGE_URL_REGEXP);
    expect(match?.[1]).toBe('quay.io:443');
    expect(match?.[3]).toBe('main-55e19fa');
  });
});
