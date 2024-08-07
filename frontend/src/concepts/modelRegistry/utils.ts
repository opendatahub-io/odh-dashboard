export type ObjectStorageFields = {
  endpoint: string;
  bucket: string;
  region?: string;
  path: string;
};

export const objectStorageFieldsToUri = (fields: ObjectStorageFields): string | null => {
  const { endpoint, bucket, region, path } = fields;
  if (!endpoint || !bucket || !path) {
    return null;
  }
  const searchParams = new URLSearchParams();
  searchParams.set('endpoint', endpoint);
  if (region) {
    searchParams.set('defaultRegion', region);
  }
  return `s3://${bucket}/${path}?${searchParams.toString()}`;
};

export const uriToObjectStorageFields = (uri: string): ObjectStorageFields | null => {
  try {
    const urlObj = new URL(uri);
    // Some environments include the first token after the protocol (our bucket) in the pathname and some have it as the hostname
    const [bucket, ...pathSplit] = `${urlObj.hostname}/${urlObj.pathname}`
      .split('/')
      .filter(Boolean);
    const path = pathSplit.join('/');
    const searchParams = new URLSearchParams(urlObj.search);
    const endpoint = searchParams.get('endpoint');
    const region = searchParams.get('defaultRegion');
    if (endpoint && bucket && path) {
      return { endpoint, bucket, region: region || undefined, path };
    }
    return null;
  } catch {
    return null;
  }
};
