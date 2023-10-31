// https://cloud.google.com/artifact-registry/docs/docker/names
// The full name for a container image is one of the following formats:
// LOCATION-docker.pkg.dev/PROJECT-ID/REPOSITORY/IMAGE
// LOCATION-docker.pkg.dev/PROJECT-ID/REPOSITORY/IMAGE:TAG
// LOCATION-docker.pkg.dev/PROJECT-ID/REPOSITORY/IMAGE@IMAGE-DIGEST

import { parseImageURL } from '../routes/api/images/imageUtils';

test('Invalid URL: space string', () => {
  const url = '     ';
  const { fullURL, host } = parseImageURL(url);
  expect(fullURL).toBe('');
  expect(host).toBeUndefined();
});

test('Invalid URL: no match', () => {
  const url = '/';
  const { host, tag } = parseImageURL(url);
  expect(host).toBeUndefined();
  expect(tag).toBeUndefined();
});

test('Invalid URL: host only', () => {
  const url = 'docker.io';
  const { host } = parseImageURL(url);
  expect(host).toBe('');
});

test('Invalid URL: host and repo, no image', () => {
  const url = 'docker.io/opendatahub';
  const { host } = parseImageURL(url);
  expect(host).toBe('');
});

test('Valid URL with spaces on both sides', () => {
  const url = '  docker.io/library/mysql:test  ';
  const { fullURL, host, tag } = parseImageURL(url);
  expect(fullURL).toBe('docker.io/library/mysql:test');
  expect(host).toBe('docker.io');
  expect(tag).toBe('test');
});

test('Docker container URL without tag', () => {
  const url = 'docker.io/library/mysql';
  const { host, tag } = parseImageURL(url);
  expect(host).toBe('docker.io');
  expect(tag).toBeUndefined();
});

test('Docker container URL with tag', () => {
  const url = 'docker.io/library/mysql:test-tag';
  const { host, tag } = parseImageURL(url);
  expect(host).toBe('docker.io');
  expect(tag).toBe('test-tag');
});

test('OpenShift internal registry URL without tag', () => {
  const url = 'image-registry.openshift-image-registry.svc:5000/opendatahub/s2i-minimal-notebook';
  const { host, tag } = parseImageURL(url);
  expect(host).toBe('image-registry.openshift-image-registry.svc:5000');
  expect(tag).toBeUndefined();
});

test('OpenShift internal registry URL with tag', () => {
  const url =
    'image-registry.openshift-image-registry.svc:5000/opendatahub/s2i-minimal-notebook:v0.3.0-py36';
  const { host, tag } = parseImageURL(url);
  expect(host).toBe('image-registry.openshift-image-registry.svc:5000');
  expect(tag).toBe('v0.3.0-py36');
});

test('Quay URL with port and tag', () => {
  const url = 'quay.io:443/opendatahub/odh-dashboard:main-55e19fa';
  const { host, tag } = parseImageURL(url);
  expect(host).toBe('quay.io:443');
  expect(tag).toBe('main-55e19fa');
});
