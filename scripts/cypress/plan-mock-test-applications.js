const fs = require('fs');
const path = require('path');
const applications = require('./mock-test-applications.json');
const { parseArgs, sanitizeLogText, selectMockTests } = require('./plan-mock-test-impact');
const { selectDistributionTests } = require('./lib/distribution-test-impact');

const safePath = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(value);

function validateApplications(entries) {
  const names = new Set();
  const workspaces = new Set();
  for (const entry of entries) {
    if (
      typeof entry.application !== 'string' ||
      !/^[a-zA-Z0-9_-]+$/.test(entry.application) ||
      names.has(entry.application) ||
      !safePath(entry.workspace) ||
      workspaces.has(entry.workspace) ||
      !safePath(entry.results) ||
      !entry.results.startsWith(
        `${entry.runner === 'dashboard-shards' ? 'packages/cypress' : entry.workspace}/`,
      ) ||
      typeof entry.target !== 'string' ||
      !entry.target ||
      !['dashboard-shards', 'standalone-app'].includes(entry.runner)
    ) {
      throw new Error(`Invalid Cypress mock application: ${entry.application}`);
    }
    names.add(entry.application);
    workspaces.add(entry.workspace);
  }
  if (entries.filter(({ runner }) => runner === 'dashboard-shards').length !== 1) {
    throw new Error('Exactly one dashboard Cypress mock application is required');
  }
}

function planApplications({
  root,
  options = {},
  entries = applications,
  selectDashboard = selectMockTests,
  selectWorkspace = selectDistributionTests,
}) {
  validateApplications(entries);
  const matrix = [];
  let dashboardScope;
  const reasons = [];
  for (const { target, ...application } of entries) {
    if (application.runner === 'dashboard-shards') {
      const selection = selectDashboard(root, {
        ...options,
        workspaceApplications: entries
          .filter(({ runner }) => runner === 'standalone-app')
          .map(({ workspace }) => workspace),
      });
      dashboardScope = selection.scope;
      reasons.push(`${application.application}: ${selection.reason}`);
      matrix.push(
        ...selection.matrix.map((shard) => ({
          ...application,
          ...shard,
          coverageComplete: selection.scope === 'full',
          name: `${application.application}-${shard.name}`,
        })),
      );
    } else {
      const selection = selectWorkspace(root, { ...options, target });
      reasons.push(`${application.application}: ${selection.reason}`);
      if (selection.run) {
        matrix.push({ ...application, name: application.application, specs: [] });
      }
    }
  }
  const fullMatrix =
    dashboardScope === 'full' &&
    entries.every(({ application }) => matrix.some((entry) => entry.application === application));
  return { matrix, reasons, scope: matrix.length === 0 ? 'none' : fullMatrix ? 'full' : 'select' };
}

function main() {
  const root = path.resolve(__dirname, '../..');
  const options = parseArgs(process.argv.slice(2));
  const plan = planApplications({ root, options });
  if (options.matrix) {
    fs.writeFileSync(options.matrix, `${JSON.stringify(plan.matrix, null, 2)}\n`);
  }
  if (options.scope) {
    fs.writeFileSync(options.scope, `${plan.scope}\n`);
  }
  for (const reason of plan.reasons) {
    process.stdout.write(`${sanitizeLogText(reason)}\n`);
  }
  process.stdout.write(
    `Cypress mock applications: ${sanitizeLogText(
      plan.matrix.map(({ name }) => name).join(', '),
    )}\n`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { planApplications, validateApplications };
