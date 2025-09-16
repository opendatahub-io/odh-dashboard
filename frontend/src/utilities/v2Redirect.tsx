import React, { useMemo } from 'react';
import { Navigate, Route, useParams, useLocation, Params } from 'react-router-dom';

/**
 * Temporary migration utility for v2 to v3 route compatibility.
 *
 * This module handles automatic redirection from v2 route patterns to their v3 equivalents,
 * ensuring seamless navigation during the transition period. It supports parameter mapping, wildcard
 * routes, and preserves URL state (query parameters, hash, etc.) across redirects.
 *
 * Note: Although this file is generic in nature, it is solely meant for migrating v2 to v3 routes.
 *
 * This file and all its exports should be removed once v2 route support is officially discontinued.
 * All references to buildV2RedirectElement and buildV2RedirectRoutes should also be cleaned up at that time.
 */

interface RedirectConfig {
  from: string;
  to: string;
}

// Regex pattern to escape special characters for safe use in regex
const REGEX_ESCAPE_PATTERN = /[.*+?^${}()|[\]\\]/g;
// Replacement string for escaping special regex characters (replaces matched chars with escaped versions)
const REGEX_ESCAPE_REPLACEMENT = '\\$&';
// Regex pattern to match optional parameters that weren't matched (e.g., :param?)
const OPTIONAL_PARAM_PATTERN = /:\w+\?/g;
// Regex pattern to match multiple consecutive forward slashes for cleanup
const MULTIPLE_SLASHES_PATTERN = /\/+/g;

/**
 * Escapes a string for safe use in regex patterns.
 * @param str - The string to escape
 * @returns The escaped string with special regex characters escaped
 */
const escapeForRegex = (str: string): string =>
  str.replace(REGEX_ESCAPE_PATTERN, REGEX_ESCAPE_REPLACEMENT);

/**
 * Creates a regex pattern for matching route parameters.
 * @param parameterName - The name of the parameter to match
 * @returns RegExp that matches the parameter pattern (e.g., :paramName or :paramName?)
 */
const createParameterPattern = (parameterName: string): RegExp => {
  const escapedParam = escapeForRegex(parameterName);
  return new RegExp(`:${escapedParam}\\??`, 'g');
};

/**
 * Creates a regex pattern for matching path segments at the end of a URL.
 * @param pathSegment - The path segment to match
 * @returns RegExp that matches the path segment at the end of a URL
 */
const createPathPattern = (pathSegment: string): RegExp => {
  const escapedPath = escapeForRegex(pathSegment);
  return new RegExp(`/${escapedPath}$`);
};

/**
 * Replaces route parameters in a path with their actual values.
 * @param path - The path template with parameter placeholders
 * @param params - Object containing parameter values
 * @returns The path with parameters replaced and cleaned up
 */
const replacePathParameters = (path: string, params: Params): string => {
  let result = path;

  for (const [key, value] of Object.entries(params)) {
    if (key !== '*' && value !== undefined) {
      // Create regex pattern for this parameter and replace it with its value
      const paramRegex = createParameterPattern(key);
      result = result.replace(paramRegex, value);
    }
  }

  return (
    result
      // Remove any remaining optional parameters that weren't matched
      .replace(OPTIONAL_PARAM_PATTERN, '')
      // Clean up any double slashes that might have been created
      .replace(MULTIPLE_SLASHES_PATTERN, '/')
  );
};

/**
 * Builds a complete redirect URL from pathname, search, and hash components.
 * @param args - Object containing pathname, search, and hash
 * @returns The complete URL string, or empty string if it resolves to root
 */
const buildRedirectUrl = (args: { pathname: string; search: string; hash: string }): string => {
  const { pathname, search, hash } = args;
  const fullUrl = `${pathname}${search}${hash}`;
  return fullUrl === '/' ? '' : fullUrl;
};

/**
 * Component that handles relative path redirects by replacing the matched portion of the current path.
 * Preserves URL state (search params, hash) during redirection.
 */
const RelativeRedirect: React.FC<RedirectConfig> = ({ from, to }) => {
  const location = useLocation();
  const params = useParams();

  const redirectTo = useMemo(() => {
    const processedFrom = replacePathParameters(from, params);
    const processedTo = replacePathParameters(to, params);

    const fromPattern = createPathPattern(processedFrom);
    const redirectPath = location.pathname.replace(fromPattern, `/${processedTo}`);

    return buildRedirectUrl({
      pathname: redirectPath,
      search: location.search,
      hash: location.hash,
    });
  }, [from, to, params, location.pathname, location.search, location.hash]);

  return <Navigate to={redirectTo} state={location.state} replace />;
};

/**
 * Component that handles absolute path redirects to a fixed destination.
 * Preserves location state during redirection.
 */
const AbsoluteRedirect: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={to} state={location.state} replace />;
};

/**
 * Component that handles wildcard route redirects, preserving the captured wildcard portion.
 * Maps parameters and appends the wildcard path to the target destination.
 */
const WildcardRedirect: React.FC<{
  targetPath: string;
}> = ({ targetPath }) => {
  const params = useParams();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const wildcardPath = params['*'] ? `/${params['*']}` : '';

    const processedPath = replacePathParameters(targetPath, params).replace('/*', wildcardPath);

    return buildRedirectUrl({
      pathname: processedPath,
      search: location.search,
      hash: location.hash,
    });
  }, [targetPath, params, location.search, location.hash]);

  return <Navigate to={redirectTo} state={location.state} replace />;
};

/**
 * Builds the appropriate redirect element based on the redirect configuration.
 * Determines whether to use wildcard, relative, or absolute redirection.
 * @param config - The redirect configuration object
 * @returns React element for the appropriate redirect type
 */
export const buildV2RedirectElement = (config: RedirectConfig): React.ReactElement => {
  const { from, to } = config;

  if (from.endsWith('/*')) {
    return <WildcardRedirect targetPath={to} />;
  }

  if (!to.startsWith('/')) {
    return <RelativeRedirect from={from} to={to} />;
  }

  return <AbsoluteRedirect to={to} />;
};

/**
 * Builds an array of Route elements for route redirection.
 * @param redirectMap - Object mapping source routes to target routes
 * @returns Array of Route elements configured for redirection
 */
export const buildV2RedirectRoutes = (
  redirectMap: Record<string, string>,
): React.ReactElement[] => {
  const routes: React.ReactElement[] = [];

  for (const [from, to] of Object.entries(redirectMap)) {
    routes.push(
      <Route
        key={`redirect-${from}-${to}`}
        path={from}
        element={buildV2RedirectElement({ from, to })}
      />,
    );
  }

  return routes;
};
