import * as path from 'path';

const HASH_PATTERN = /[.-](?=[0-9a-f]*[a-f])[0-9a-f]{8,}/;
const STATIC_ASSET_PATTERN = /\.(woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|avif|bmp)$/i;

export const isHashedAsset = (filePath: string): boolean =>
  HASH_PATTERN.test(path.basename(filePath));

export const isStaticAsset = (filePath: string): boolean => STATIC_ASSET_PATTERN.test(filePath);

export const CACHE_HEADER_IMMUTABLE = 'public, max-age=31536000, immutable';
export const CACHE_HEADER_SHORT = 'public, max-age=86400';
export const CACHE_HEADER_NO_CACHE = 'no-cache';

export const getCacheControlForStaticFile = (filePath: string): string => {
  if (isHashedAsset(filePath)) {
    return CACHE_HEADER_IMMUTABLE;
  }
  if (isStaticAsset(filePath)) {
    return CACHE_HEADER_SHORT;
  }
  return CACHE_HEADER_NO_CACHE;
};
