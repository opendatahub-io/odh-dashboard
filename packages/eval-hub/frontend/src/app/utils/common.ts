export const parseS3Url = (url: string): { bucket: string; key: string } | null => {
  const match = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    return null;
  }
  return { bucket: match[1], key: match[2] };
};
