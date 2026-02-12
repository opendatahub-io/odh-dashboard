import { MlflowEntityType } from './MlflowEntityNamesContext';

type SetNameFn = (type: MlflowEntityType, id: string, name: string) => void;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const getString = (obj: Record<string, unknown>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
};

const createEntityParser = (cfg: {
  type: MlflowEntityType;
  objectKeys?: string[];
  arrayKeys?: string[];
  extract: (obj: Record<string, unknown>) => { id: string; name: string } | undefined;
}): ((data: Record<string, unknown>, setName: SetNameFn) => void) => {
  const objectKeys = cfg.objectKeys || [];
  const arrayKeys = cfg.arrayKeys || [];

  return (data, setName) => {
    for (const key of objectKeys) {
      const value = data[key];
      if (isObject(value)) {
        const out = cfg.extract(value);
        if (out) setName(cfg.type, out.id, out.name);
      }
    }
    for (const key of arrayKeys) {
      const value = data[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isObject(item)) {
            const out = cfg.extract(item);
            if (out) setName(cfg.type, out.id, out.name);
          }
        }
      }
    }
  };
};

const parseExperiments = createEntityParser({
  type: 'experiment',
  objectKeys: ['experiment'],
  arrayKeys: ['experiments'],
  extract: (exp) => {
    const id = getString(exp, 'experiment_id');
    const name = getString(exp, 'name');
    return id && name ? { id, name } : undefined;
  },
});

const parseRuns = createEntityParser({
  type: 'run',
  objectKeys: ['run'],
  arrayKeys: ['runs'],
  extract: (run) => {
    if (!isObject(run.info)) return undefined;
    const id = getString(run.info, 'run_id');
    const name = getString(run.info, 'run_name');
    return id && name ? { id, name } : undefined;
  },
});

const parseLoggedModels = createEntityParser({
  type: 'loggedModel',
  objectKeys: ['model', 'logged_model'],
  arrayKeys: ['logged_models', 'models'],
  extract: (model) => {
    let id = getString(model, 'model_id', 'id', 'logged_model_id');
    let name = getString(model, 'name', 'model_name');
    if (!id && isObject(model.info)) {
      id = getString(model.info, 'model_id', 'id');
      name = name || getString(model.info, 'name');
    }
    return id && name ? { id, name } : undefined;
  },
});

const parseSessions = createEntityParser({
  type: 'session',
  objectKeys: ['session'],
  arrayKeys: ['sessions'],
  extract: (s) => {
    const id = getString(s, 'session_id');
    const name = getString(s, 'name');
    return id && name ? { id, name } : undefined;
  },
});

export const parseEntityNamesFromResponse = async (
  response: Response,
  setName: SetNameFn,
): Promise<void> => {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return;
  }
  try {
    const data = await response.json();
    if (!isObject(data)) {
      return;
    }
    const { url } = response;
    if (url.includes('/experiments')) {
      parseExperiments(data, setName);
    }
    if (url.includes('/runs')) {
      parseRuns(data, setName);
    }
    if (url.includes('/logged-models') || url.includes('/logged_models')) {
      parseLoggedModels(data, setName);
    }
    if (url.includes('/sessions') || url.includes('/chat-sessions')) {
      parseSessions(data, setName);
    }
  } catch {
    // ignore
  }
};
