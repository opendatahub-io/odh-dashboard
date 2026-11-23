import { describe, expect as assert, it } from '@jest/globals';
import { BOT_PROTECTED_DOMAINS, getErrorType, isBotProtectedUrl } from '../urlValidatorShared';
import { categorizeValidationResults } from '../urlResultProcessor';

describe('getErrorType', () => {
  it('classifies success status codes as valid', () => {
    assert(getErrorType(200)).toBe('valid');
    assert(getErrorType(301)).toBe('valid');
  });

  it('classifies rate limiting and gateway errors as transient', () => {
    assert(getErrorType(429)).toBe('transient');
    assert(getErrorType(503)).toBe('transient');
  });

  it('classifies 403 on a bot-protected domain as blocked', () => {
    assert(getErrorType(403, undefined, 'https://docs.redhat.com/en/documentation')).toBe(
      'blocked',
    );
    assert(getErrorType(403, undefined, 'https://access.redhat.com/articles/7136121')).toBe(
      'blocked',
    );
  });

  it('classifies 403 on any other domain as permanent', () => {
    assert(getErrorType(403, undefined, 'https://example.com/page')).toBe('permanent');
  });

  it('keeps classifying 404 on a bot-protected domain as permanent (still a broken link)', () => {
    assert(getErrorType(404, undefined, 'https://docs.redhat.com/en/documentation')).toBe(
      'permanent',
    );
  });

  it('stays backwards compatible when no URL is provided', () => {
    assert(getErrorType(403)).toBe('permanent');
    assert(getErrorType(200)).toBe('valid');
  });

  it('classifies network-level failures (status 0) as transient', () => {
    assert(getErrorType(0, 'socket hang up')).toBe('transient');
  });
});

describe('isBotProtectedUrl', () => {
  it('matches bot-protected domains and their subdomains', () => {
    [...BOT_PROTECTED_DOMAINS].forEach((domain) => {
      assert(isBotProtectedUrl(`https://${domain}/some/path`)).toBe(true);
      assert(isBotProtectedUrl(`https://sub.${domain}/some/path`)).toBe(true);
    });
  });

  it('does not match unrelated domains or suffix look-alikes', () => {
    assert(isBotProtectedUrl('https://docs.starburst.io/latest')).toBe(false);
    assert(isBotProtectedUrl('https://notdocs.redhat.com.evil.com/page')).toBe(false);
    assert(isBotProtectedUrl('https://access.redhat.com.evil.com/page')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    assert(isBotProtectedUrl('not-a-url')).toBe(false);
  });
});

describe('categorizeValidationResults', () => {
  it('routes bot-blocked 403s away from permanent errors', () => {
    const results = [
      {
        url: 'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed',
        status: 403,
      },
      { url: 'https://access.redhat.com/articles/7136121', status: 403 },
      { url: 'https://docs.starburst.io/latest/k8s/requirements.html', status: 200 },
      { url: 'https://example.com/really-broken', status: 404 },
    ];

    const categorized = categorizeValidationResults(results);
    assert(categorized.blockedErrors).toHaveLength(2);
    assert(categorized.successResults).toHaveLength(1);
    assert(categorized.permanentErrors).toHaveLength(1);
    assert(categorized.transientErrors).toHaveLength(0);
  });
});
