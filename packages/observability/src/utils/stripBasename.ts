/** Removes a router basename from a root-relative URL, preserving its path, query, and fragment. */
export const stripBasename = (href: string, basename: string): string => {
  const normalizedBasename = basename.replace(/\/+$/, '');
  if (!normalizedBasename) {
    return href;
  }

  // React Router matches basenames case-insensitively. Preserve the original URL when slicing.
  const lowercaseHref = href.toLowerCase();
  const lowercaseBasename = normalizedBasename.toLowerCase();

  if (lowercaseHref === lowercaseBasename) {
    return '/';
  }

  if (lowercaseHref.startsWith(`${lowercaseBasename}/`)) {
    return href.slice(normalizedBasename.length);
  }

  if (
    lowercaseHref.startsWith(`${lowercaseBasename}?`) ||
    lowercaseHref.startsWith(`${lowercaseBasename}#`)
  ) {
    return `/${href.slice(normalizedBasename.length)}`;
  }

  return href;
};
