import {
  isHashedAsset,
  isStaticAsset,
  getCacheControlForStaticFile,
  CACHE_HEADER_IMMUTABLE,
  CACHE_HEADER_SHORT,
  CACHE_HEADER_NO_CACHE,
} from '../utils/cacheHeaders';

describe('isHashedAsset', () => {
  it.each([
    'app.a1b2c3d4e5f6.bundle.js',
    'chunk-vendors-abcdef0123456789.js',
    'app.1234abcd5678.css',
    'some-chunk.a1b2c3d4e5f6.bundle.css',
    '1013-4cee0676a66ac829f875.js',
  ])('should detect hashed filename: %s', (name) => {
    expect(isHashedAsset(name)).toBe(true);
  });

  it.each([
    'index.html',
    'favicon.ico',
    'manifest.json',
    'robots.txt',
    'remoteEntry.js',
    'images/logo.png',
    'fonts/RedHatDisplay-Regular.woff2',
    'locales/en/translation.json',
    'app.bundle.js',
    'app.css',
    'images/logo-20240608.png',
    'fonts/asset-20240608.woff2',
  ])('should detect non-hashed filename: %s', (name) => {
    expect(isHashedAsset(name)).toBe(false);
  });
});

describe('isStaticAsset', () => {
  it.each([
    'favicon.ico',
    'images/logo.png',
    'images/photo.jpg',
    'images/photo.jpeg',
    'images/icon.svg',
    'images/banner.webp',
    'images/bg.gif',
    'fonts/RedHatDisplay-Regular.woff2',
    'fonts/RedHatText.woff',
    'fonts/mono.ttf',
    'fonts/legacy.eot',
  ])('should detect static asset: %s', (name) => {
    expect(isStaticAsset(name)).toBe(true);
  });

  it.each([
    'app.bundle.js',
    'app.css',
    'index.html',
    'remoteEntry.js',
    'manifest.json',
    'robots.txt',
    'locales/en/translation.json',
  ])('should not detect non-static-asset: %s', (name) => {
    expect(isStaticAsset(name)).toBe(false);
  });
});

describe('getCacheControlForStaticFile', () => {
  it('should return immutable for hashed files', () => {
    expect(getCacheControlForStaticFile('app.a1b2c3d4.bundle.js')).toBe(CACHE_HEADER_IMMUTABLE);
  });

  it('should return short cache for non-hashed images and fonts', () => {
    expect(getCacheControlForStaticFile('favicon.ico')).toBe(CACHE_HEADER_SHORT);
    expect(getCacheControlForStaticFile('fonts/RedHatDisplay.woff2')).toBe(CACHE_HEADER_SHORT);
    expect(getCacheControlForStaticFile('images/logo.png')).toBe(CACHE_HEADER_SHORT);
  });

  it('should return short cache for numeric-suffix assets, not immutable', () => {
    expect(getCacheControlForStaticFile('images/logo-20240608.png')).toBe(CACHE_HEADER_SHORT);
    expect(getCacheControlForStaticFile('fonts/asset-20240608.woff2')).toBe(CACHE_HEADER_SHORT);
  });

  it('should return no-cache for non-hashed code files', () => {
    expect(getCacheControlForStaticFile('remoteEntry.js')).toBe(CACHE_HEADER_NO_CACHE);
    expect(getCacheControlForStaticFile('locales/en/translation.json')).toBe(CACHE_HEADER_NO_CACHE);
    expect(getCacheControlForStaticFile('manifest.json')).toBe(CACHE_HEADER_NO_CACHE);
  });
});
