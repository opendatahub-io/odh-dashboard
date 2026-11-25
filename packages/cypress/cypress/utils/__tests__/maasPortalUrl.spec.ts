import { describe, expect as assert, it } from '@jest/globals';
import { isMaaSPortalUrl } from '../maasPortalUrl';

describe('isMaaSPortalUrl', () => {
  it.each([
    'https://maas.apps.example.com/maas-portal',
    'https://maas.apps.example.com/maas-portal/',
    'https://maas.apps.example.com/maas-portal/api-keys',
    'https://maas.apps.example.com/maas-portal?tab=keys',
    'https://maas.apps.example.com/maas-portal#keys',
  ])('accepts %s', (url) => {
    assert(isMaaSPortalUrl(url)).toBe(true);
  });

  it.each([
    'https://dashboard.apps.example.com/',
    'https://dashboard.apps.example.com/projects',
    'https://maas.apps.example.com/maas-portal-x',
    'https://maas.apps.example.com/maas-portalx/api-keys',
    'https://maas.apps.example.com/other/maas-portal/',
  ])('rejects %s', (url) => {
    assert(isMaaSPortalUrl(url)).toBe(false);
  });
});
