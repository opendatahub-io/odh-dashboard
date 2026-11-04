/* eslint-disable camelcase */
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import {
  redactEvalHubPathSegments,
  redactEvalHubUrl,
  sanitizeEvalHubPageContext,
} from '~/app/tracking/evalhubPageContextRedaction';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('redactEvalHubPathSegments', () => {
  it('should redact namespace, job, and collection identifiers from results routes', () => {
    expect(redactEvalHubPathSegments('/evaluation/my-ns/results/job-123')).toBe(
      '/evaluation/[redacted]/results/[redacted]',
    );
  });

  it('should redact identifiers from collection edit and copy routes', () => {
    expect(redactEvalHubPathSegments('/evaluation/ns-1/create/collections/col-9/copy')).toBe(
      '/evaluation/[redacted]/create/collections/[redacted]/copy',
    );
    expect(redactEvalHubPathSegments('/evaluation/ns-1/create/collections/col-9/edit')).toBe(
      '/evaluation/[redacted]/create/collections/[redacted]/edit',
    );
  });

  it('should redact identifiers from reconfigure and curated collection routes', () => {
    expect(redactEvalHubPathSegments('/evaluation/ns-1/reconfigure/job-42')).toBe(
      '/evaluation/[redacted]/reconfigure/[redacted]',
    );
    expect(redactEvalHubPathSegments('/evaluation/ns-1/collections/toxicity')).toBe(
      '/evaluation/[redacted]/collections/[redacted]',
    );
  });

  it('should keep structural-only routes intact', () => {
    expect(redactEvalHubPathSegments('/evaluation/ns-1/create/collections/new')).toBe(
      '/evaluation/[redacted]/create/collections/new',
    );
    expect(redactEvalHubPathSegments('/evaluation/ns-1/compare-runs/benchmarks')).toBe(
      '/evaluation/[redacted]/compare-runs/benchmarks',
    );
    expect(redactEvalHubPathSegments('/evaluation')).toBe('/evaluation');
    expect(redactEvalHubPathSegments('/')).toBe('/');
  });
});

describe('redactEvalHubUrl', () => {
  it('should redact identifier segments and drop query strings and hashes', () => {
    expect(
      redactEvalHubUrl('https://dashboard.example.com/evaluation/my-ns/results/job-1?tab=x#frag'),
    ).toBe('https://dashboard.example.com/evaluation/[redacted]/results/[redacted]');
  });

  it('should redact the referrer URL of a previous EvalHub page', () => {
    expect(redactEvalHubUrl('https://dashboard.example.com/evaluation/my-ns/create/start')).toBe(
      'https://dashboard.example.com/evaluation/[redacted]/create/start',
    );
  });

  it('should fail closed for unparseable URLs', () => {
    expect(redactEvalHubUrl('https://')).toBe('[redacted]');
  });
});

describe('sanitizeEvalHubPageContext', () => {
  it('should redact url, path, and referrer and drop the search string', () => {
    expect(
      sanitizeEvalHubPageContext({
        path: '/evaluation/my-ns/results/job-1',
        referrer: 'https://dashboard.example.com/evaluation/my-ns/create/start',
        search: '?tab=evaluate',
        title: 'Evaluation results',
        url: 'https://dashboard.example.com/evaluation/my-ns/results/job-1?tab=evaluate',
      }),
    ).toEqual({
      path: '/evaluation/[redacted]/results/[redacted]',
      referrer: 'https://dashboard.example.com/evaluation/[redacted]/create/start',
      search: '',
      title: 'Evaluation results',
      url: 'https://dashboard.example.com/evaluation/[redacted]/results/[redacted]',
    });
  });

  it('should preserve undefined keys', () => {
    expect(sanitizeEvalHubPageContext({})).toEqual({ search: '' });
  });
});

type MiddlewarePayload = {
  obj: {
    properties?: { event_source?: unknown } & Record<string, unknown>;
    context?: { page?: Record<string, unknown> } & Record<string, unknown>;
  };
};

type RegisteredMiddleware = (middleware: {
  payload: MiddlewarePayload;
  next: (payload: MiddlewarePayload) => void;
}) => void;

describe('registerEvalHubPageContextRedaction', () => {
  const mockAddSourceMiddleware = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.analytics = { addSourceMiddleware: mockAddSourceMiddleware };
    window.__evalHubTrackingEvents?.clear();
  });

  afterEach(() => {
    delete window.analytics;
  });

  // The registration guard is module state, so each of these tests needs a
  // fresh copy of the tracking modules.
  const loadFreshModules = (): { register: () => void; track: typeof trackEvalHubEvent } => {
    let modules: { register: () => void; track: typeof trackEvalHubEvent } | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const redaction = require('~/app/tracking/evalhubPageContextRedaction') as {
        registerEvalHubPageContextRedaction: () => void;
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tracking = require('~/app/tracking/evalhubTracking') as {
        trackEvalHubEvent: typeof trackEvalHubEvent;
      };
      modules = {
        register: redaction.registerEvalHubPageContextRedaction,
        track: tracking.trackEvalHubEvent,
      };
    });
    return modules!;
  };

  const getRegisteredMiddleware = (): RegisteredMiddleware =>
    mockAddSourceMiddleware.mock.calls[0][0] as RegisteredMiddleware;

  it('should register a source middleware exactly once per session', () => {
    const { register } = loadFreshModules();
    register();
    register();

    expect(mockAddSourceMiddleware).toHaveBeenCalledTimes(1);
  });

  it('should be wired into trackEvalHubEvent', () => {
    const { track } = loadFreshModules();
    track(EVAL_HUB_EVENTS.JOB_CREATE_OPENED, { surface: 'benchmark_suites_page' });

    expect(mockAddSourceMiddleware).toHaveBeenCalledTimes(1);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
  });

  it('should redact context.page for EvalHub events only', () => {
    const { register } = loadFreshModules();
    register();
    const middleware = getRegisteredMiddleware();

    const evalHubPayload: MiddlewarePayload = {
      obj: {
        properties: { event_source: 'evalhub_ui' },
        context: {
          page: {
            path: '/evaluation/my-ns/results/job-1',
            url: 'https://dashboard.example.com/evaluation/my-ns/results/job-1',
            referrer: 'https://dashboard.example.com/evaluation/my-ns',
            search: '?tab=evaluate',
            title: 'Evaluation results',
          },
        },
      },
    };
    const next = jest.fn();
    middleware({ payload: evalHubPayload, next });
    expect(next).toHaveBeenCalledWith(evalHubPayload);
    expect(evalHubPayload.obj.context?.page).toEqual({
      path: '/evaluation/[redacted]/results/[redacted]',
      url: 'https://dashboard.example.com/evaluation/[redacted]/results/[redacted]',
      referrer: 'https://dashboard.example.com/evaluation/[redacted]',
      search: '',
      title: 'Evaluation results',
    });

    const otherPayload: MiddlewarePayload = {
      obj: {
        properties: { event_source: 'other_module' },
        context: { page: { path: '/projects/my-project' } },
      },
    };
    const otherNext = jest.fn();
    middleware({ payload: otherPayload, next: otherNext });
    expect(otherNext).toHaveBeenCalledWith(otherPayload);
    expect(otherPayload.obj.context?.page).toEqual({ path: '/projects/my-project' });
  });

  it('should not register when Segment is not initialized', () => {
    let register: () => void | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const redaction = require('~/app/tracking/evalhubPageContextRedaction') as {
        registerEvalHubPageContextRedaction: () => void;
      };
      register = redaction.registerEvalHubPageContextRedaction;
    });
    delete window.analytics;
    register!();
    expect(mockAddSourceMiddleware).not.toHaveBeenCalled();

    window.analytics = { addSourceMiddleware: mockAddSourceMiddleware };
    register!();
    expect(mockAddSourceMiddleware).toHaveBeenCalledTimes(1);
  });

  it('should leave form tracking events flowing through the same middleware path', () => {
    const { track } = loadFreshModules();
    track(EVAL_HUB_EVENTS.COLLECTION_SAVED, {
      outcome: TrackingOutcome.submit,
      success: true,
      saveMode: 'create',
      action: 'save',
      fromCurated: false,
      countOfEvaluatesAssetTypes: 1,
    });

    expect(mockAddSourceMiddleware).toHaveBeenCalledTimes(1);
    expect(mockFireFormTrackingEvent).toHaveBeenCalledTimes(1);
  });
});
