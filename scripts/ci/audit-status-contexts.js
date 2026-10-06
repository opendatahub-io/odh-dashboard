const fs = require('fs');

const DEFAULT_WARNING_THRESHOLD = 80;
const DEFAULT_CONTEXT_BUDGET = 90;

const STATUS_CONTEXTS_QUERY = `
  query StatusContexts($owner: String!, $name: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        headRefOid
        statusCheckRollup {
          contexts(first: 100, after: $cursor) {
            nodes {
              __typename
              ... on CheckRun {
                name
                conclusion
                checkSuite {
                  app { name slug }
                  workflowRun { workflow { name } }
                }
              }
              ... on StatusContext {
                context
                state
                creator { login }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }
  }
`;

function parseArgs(argv) {
  const options = {
    repo: process.env.GITHUB_REPOSITORY,
    warningThreshold: DEFAULT_WARNING_THRESHOLD,
    budget: DEFAULT_CONTEXT_BUDGET,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--repo') {
      options.repo = value;
      index += 1;
    } else if (argument === '--pr') {
      options.pr = Number(value);
      index += 1;
    } else if (argument === '--warning-threshold') {
      options.warningThreshold = Number(value);
      index += 1;
    } else if (argument === '--budget') {
      options.budget = Number(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.repo?.includes('/')) {
    throw new Error('--repo must use the owner/repository format');
  }
  if (options.pr !== undefined && (!Number.isInteger(options.pr) || options.pr < 1)) {
    throw new Error('--pr must be a positive integer');
  }
  if (!Number.isInteger(options.warningThreshold) || options.warningThreshold < 1) {
    throw new Error('--warning-threshold must be a positive integer');
  }
  if (!Number.isInteger(options.budget) || options.budget <= options.warningThreshold) {
    throw new Error('--budget must be an integer greater than --warning-threshold');
  }

  return options;
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function listOpenPullRequests(repo, token) {
  const pullRequests = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubRequest(
      `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
      token,
    );
    pullRequests.push(...batch.map((pullRequest) => pullRequest.number));
    if (batch.length < 100) {
      return pullRequests;
    }
  }
}

async function fetchStatusContexts(repo, pullRequestNumber, token) {
  const [owner, name] = repo.split('/');
  const contexts = [];
  let cursor = null;
  let headRefOid;

  do {
    const response = await githubRequest('https://api.github.com/graphql', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: STATUS_CONTEXTS_QUERY,
        variables: { owner, name, number: pullRequestNumber, cursor },
      }),
    });

    if (response.errors) {
      throw new Error(`GitHub GraphQL request failed: ${JSON.stringify(response.errors)}`);
    }

    const { pullRequest } = response.data.repository;
    if (!pullRequest) {
      throw new Error(`Pull request #${pullRequestNumber} was not found`);
    }

    headRefOid = pullRequest.headRefOid;
    const connection = pullRequest.statusCheckRollup?.contexts;
    if (!connection) {
      break;
    }

    contexts.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);

  return { contexts, headRefOid };
}

function contextProducer(context) {
  if (context.__typename === 'CheckRun') {
    return context.checkSuite?.app?.name ?? context.checkSuite?.app?.slug ?? 'Unknown check app';
  }
  return context.creator?.login ?? 'Legacy commit status';
}

function contextSource(context) {
  if (context.__typename === 'CheckRun') {
    return context.checkSuite?.workflowRun?.workflow?.name ?? context.name;
  }
  return context.context;
}

function summarizeContexts(contexts) {
  const groups = new Map();
  for (const context of contexts) {
    const key = `${contextProducer(context)}\0${contextSource(context)}`;
    const current = groups.get(key) ?? {
      producer: contextProducer(context),
      source: contextSource(context),
      count: 0,
    };
    current.count += 1;
    groups.set(key, current);
  }

  return [...groups.values()].toSorted(
    (left, right) => right.count - left.count || left.producer.localeCompare(right.producer),
  );
}

function writeStepSummary(results, warningThreshold, budget) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }

  const lines = [
    '## Pull request status-context budget',
    '',
    `Warning threshold: ${warningThreshold}; budget: ${budget}`,
    '',
    '| PR | Head | Contexts | Result |',
    '| ---: | --- | ---: | --- |',
  ];

  for (const result of results) {
    const status =
      result.count > budget ? 'Over budget' : result.count >= warningThreshold ? 'Warning' : 'OK';
    lines.push(
      `| #${result.pullRequestNumber} | \`${result.headRefOid.slice(0, 7)}\` | ${
        result.count
      } | ${status} |`,
    );
  }

  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN is required');
  }

  const pullRequestNumbers = options.pr
    ? [options.pr]
    : await listOpenPullRequests(options.repo, token);
  const results = [];

  for (const pullRequestNumber of pullRequestNumbers) {
    const { contexts, headRefOid } = await fetchStatusContexts(
      options.repo,
      pullRequestNumber,
      token,
    );
    const summary = summarizeContexts(contexts);
    const result = { pullRequestNumber, headRefOid, count: contexts.length, summary };
    results.push(result);

    console.log(`\nPR #${pullRequestNumber} (${headRefOid}): ${contexts.length} contexts`);
    console.table(summary);
    if (contexts.length > options.budget) {
      console.error(
        `::error title=Status-context budget exceeded::PR #${pullRequestNumber} has ${contexts.length} contexts (budget: ${options.budget})`,
      );
    } else if (contexts.length >= options.warningThreshold) {
      console.warn(
        `::warning title=Status-context budget warning::PR #${pullRequestNumber} has ${contexts.length} contexts (warning: ${options.warningThreshold}, budget: ${options.budget})`,
      );
    }
  }

  writeStepSummary(results, options.warningThreshold, options.budget);
  if (results.some((result) => result.count > options.budget)) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  contextProducer,
  contextSource,
  parseArgs,
  summarizeContexts,
};
