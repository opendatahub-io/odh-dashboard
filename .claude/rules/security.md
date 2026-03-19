---
description: Security review guidelines for auth, secrets, input validation, and K8s API interactions
globs: "backend/**,**/api/**,**/routes/**,**/middleware/**"
alwaysApply: false
---

# ODH Dashboard Security Review Guidelines

## Authentication and Authorization

- All backend routes must validate user authentication via OpenShift token
- Check RBAC permissions before performing Kubernetes operations
- Never expose cluster-admin operations to regular users
- Validate that users have access to the namespace they're operating in

## Secrets and Credentials

- Never hardcode secrets, tokens, API keys, or passwords in source code
- Use Kubernetes Secrets for sensitive configuration
- Environment variables for runtime configuration (never committed)
- Tracked `.env` files must only contain non-sensitive defaults and placeholders — never real credentials
- Sensitive local overrides go in `.env.local` (gitignored). See `.env.local.example` for the template

## Input Validation

- Validate all user input on both frontend and backend
- Sanitize inputs to prevent XSS in React components (avoid `dangerouslySetInnerHTML`)
- Validate Kubernetes resource names follow RFC 1123: lowercase alphanumeric and hyphens only, max 63 chars, must start and end with alphanumeric
- Backend route handlers must validate request body schemas

## Kubernetes API Security

- Use least-privilege RBAC when creating ServiceAccounts or ClusterRoles
- Validate resource ownership before modification or deletion
- Use proper namespace scoping — avoid cluster-wide operations unless necessary
- Check for proper error handling on 403 (Forbidden) responses

## Frontend Security

- Use PatternFly components, but treat XSS prevention as an application responsibility
- Never render untrusted HTML; sanitize/validate any rich content before rendering
- Avoid direct DOM manipulation
- Use React's built-in escaping for dynamic content
- Validate URLs before navigation: enforce http/https scheme allowlist, reject `javascript:` and `data:` protocols

## Proxy and Network

- Backend proxies requests to Kubernetes API — validate proxy targets
- Do not allow open redirects
- Validate WebSocket connections are authenticated
- BFF services should validate upstream API responses

## Dependencies

- Keep dependencies up to date (Renovate is configured for automated updates)
- Review new dependency additions for security advisories
- Prefer well-maintained packages with active security response
