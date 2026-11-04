/**
 * Validates that module-federation ports are unique across workspace packages.
 *
 * Two categories of ports are checked:
 *
 * 1. Local dev ports (package.json "module-federation.local.port")
 *    Must be unique so multiple federated modules can run simultaneously.
 *
 * 2. Production service ports (dashboard-operator moduleRegistry "Port")
 *    Must be unique across all module services. The dashboard-operator generates the
 *    federation-config ConfigMap from this registry, so it is the source of truth.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKSPACE_QUERY_SCRIPT = path.join(__dirname, 'query-workspace-packages.js');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function getWorkspacePackages() {
  try {
    const stdout = execSync(`node "${WORKSPACE_QUERY_SCRIPT}"`, { encoding: 'utf8' });
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`${colors.red}Error querying workspaces:${colors.reset}`, error.message);
    throw new Error('Failed to query workspace packages');
  }
}

/**
 * Extracts all local dev ports from a module-federation config.
 * A single package may define multiple ports (e.g. dev server + proxy target).
 * Returns an array of { port, source } objects.
 */
function extractLocalPorts(mfConfig) {
  const ports = [];
  if (mfConfig.local?.port != null) {
    ports.push({ port: mfConfig.local.port, source: 'local.port' });
  }
  if (mfConfig.backend?.localService?.port != null) {
    ports.push({ port: mfConfig.backend.localService.port, source: 'backend.localService.port' });
  }
  if (Array.isArray(mfConfig.proxyService)) {
    for (const proxy of mfConfig.proxyService) {
      if (proxy.localService?.port != null) {
        ports.push({ port: proxy.localService.port, source: 'proxyService.localService.port' });
      }
    }
  }
  return ports;
}

function extractName(mfConfig) {
  return mfConfig.name ?? 'unknown';
}

const MODULE_REGISTRY_PATH = '../dashboard-operator/internal/controller/modules.go';
const MODULE_REGISTRY_DECL = 'var moduleRegistry = map[string]ModuleDefinition{';

/**
 * Parses the source of the dashboard-operator moduleRegistry (modules.go) and extracts each
 * module's production service port. Fails closed: returns { entries, errors } where `errors`
 * is non-empty whenever the registry is missing, unrecognized, empty, or has an entry whose
 * Port cannot be read as a numeric literal, so the caller can fail validation instead of
 * silently checking a partial list.
 */
function parseModuleRegistryContent(content) {
  const errors = [];
  const entries = [];
  const registryStart = content.indexOf(MODULE_REGISTRY_DECL);
  if (registryStart === -1) {
    return { entries, errors: [`declaration "${MODULE_REGISTRY_DECL}" not found`] };
  }

  let current = null;
  let currentPort = null;
  let closed = false;
  const finishEntry = () => {
    if (current === null) {
      return;
    }
    if (currentPort === null) {
      errors.push(`module "${current}" has no numeric Port field`);
    } else {
      entries.push({ name: current, port: currentPort });
    }
    current = null;
    currentPort = null;
  };

  for (const line of content.slice(registryStart).split('\n').slice(1)) {
    if (/^}/.test(line)) {
      finishEntry();
      closed = true;
      break;
    }
    // Accept both the shorthand `"name": {` and the explicitly typed `"name": ModuleDefinition{`.
    const keyMatch = line.match(/^\t"([^"]+)":\s*(?:ModuleDefinition\s*)?{/);
    if (keyMatch) {
      finishEntry();
      [, current] = keyMatch;
      continue;
    }
    if (/^\t},?\s*$/.test(line)) {
      finishEntry();
      continue;
    }
    // Any other top-level (single-tab) line that is not blank or a comment is an entry form this
    // parser does not understand; fail instead of silently skipping it.
    if (/^\t\S/.test(line) && !/^\t\/\//.test(line)) {
      finishEntry();
      errors.push(`unsupported moduleRegistry entry form: ${line.trim()}`);
    }
    const portMatch = line.match(/^\t\tPort:\s*([^,]+),/);
    if (current !== null && portMatch) {
      const value = portMatch[1].trim();
      if (/^\d+$/.test(value)) {
        currentPort = Number(value);
      } else {
        errors.push(`module "${current}" has a non-literal Port value "${value}"`);
        current = null;
      }
    }
  }

  if (!closed) {
    errors.push('moduleRegistry literal is not terminated');
  }
  if (entries.length === 0 && errors.length === 0) {
    errors.push('moduleRegistry has no entries');
  }
  return { entries, errors };
}

function parseModuleRegistry(relativePath) {
  const registryPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(registryPath)) {
    return { entries: [], errors: [`${registryPath} not found`] };
  }
  return parseModuleRegistryContent(fs.readFileSync(registryPath, 'utf8'));
}

/**
 * Checks a port map for conflicts. Returns an array of conflict objects.
 */
function checkPortMap(portMap) {
  const conflicts = [];
  const sorted = [...portMap.entries()].toSorted(([a], [b]) => a - b);

  for (const [port, owners] of sorted) {
    const hasConflict = owners.length > 1;
    const color = hasConflict ? colors.red : colors.green;
    const marker = hasConflict ? '✗ CONFLICT' : '✓';

    for (const { name } of owners) {
      console.log(`  ${color}${marker}${colors.reset}  port ${port}  →  ${name}`);
    }

    if (hasConflict) {
      conflicts.push({ port, owners });
    }
  }

  return conflicts;
}

/**
 * Validates production service ports parsed from the dashboard-operator moduleRegistry.
 * Returns true when there are errors: unreadable registry entries or duplicate ports.
 */
function validateProductionPorts({ entries: registryEntries, errors: registryErrors }) {
  let hasErrors = false;
  if (registryErrors.length > 0) {
    hasErrors = true;
    console.error(
      `${colors.red}✗ Could not read every production port from the dashboard-operator ` +
        `moduleRegistry (modules.go):${colors.reset}\n`,
    );
    for (const error of registryErrors) {
      console.error(`  ${error}`);
    }
    console.error(
      `\nEach moduleRegistry entry must set "Port" to a numeric literal so it can be validated.\n`,
    );
  }
  if (registryEntries.length > 0) {
    const servicePortMap = new Map();
    for (const { name, port } of registryEntries) {
      if (!servicePortMap.has(port)) {
        servicePortMap.set(port, []);
      }
      servicePortMap.get(port).push({ name: `${name} [moduleRegistry]` });
    }

    console.log(
      `${colors.cyan}Production Service Ports (dashboard-operator modules.go)${colors.reset}`,
    );
    console.log('─'.repeat(60));
    const serviceConflicts = checkPortMap(servicePortMap);
    console.log('─'.repeat(60));
    console.log(`  ${registryEntries.length} module(s), ${servicePortMap.size} unique port(s)\n`);

    if (serviceConflicts.length > 0) {
      hasErrors = true;
      console.error(
        `${colors.red}✗ Production service port conflicts in modules.go:${colors.reset}\n`,
      );
      for (const { port, owners } of serviceConflicts) {
        const names = owners.map((o) => o.name).join(', ');
        console.error(`  Port ${port} is used by: ${names}`);
      }
      console.error(
        `\nEach module must have a unique "Port" in the dashboard-operator moduleRegistry.`,
      );
      console.error(
        `Ports must also match module-federation.service.port in the package.json and the ` +
          `manifests/modules/<slug>/ deployment, service and networkpolicy.\n`,
      );
    }
  }

  return hasErrors;
}

function validate() {
  let hasErrors = false;

  // --- 1. Validate local dev ports from package.json ---
  const packages = getWorkspacePackages();
  const localPortMap = new Map();
  let totalModules = 0;

  for (const pkg of packages) {
    const mfConfig = pkg['module-federation'];
    if (!mfConfig) {
      continue;
    }

    totalModules++;
    const ports = extractLocalPorts(mfConfig);
    const mfName = extractName(mfConfig);
    const packageName = pkg.name || pkg.path;

    if (ports.length === 0) {
      console.warn(
        `${colors.yellow}⚠ ${packageName} (${mfName}): no local dev port configured${colors.reset}`,
      );
      continue;
    }

    for (const { port, source } of ports) {
      if (!localPortMap.has(port)) {
        localPortMap.set(port, []);
      }
      localPortMap.get(port).push({ name: `${mfName} [${source}] (${packageName})` });
    }
  }

  console.log(`\n${colors.cyan}Local Dev Ports (package.json)${colors.reset}`);
  console.log('─'.repeat(60));
  const localConflicts = checkPortMap(localPortMap);
  console.log('─'.repeat(60));
  console.log(`  ${totalModules} federated module(s), ${localPortMap.size} unique port(s)\n`);

  if (localConflicts.length > 0) {
    hasErrors = true;
    console.error(`${colors.red}✗ Local dev port conflicts detected:${colors.reset}\n`);
    for (const { port, owners } of localConflicts) {
      const names = owners.map((o) => o.name).join(', ');
      console.error(`  Port ${port} is used by: ${names}`);
    }
    console.error(
      `\nEach module must have a unique "module-federation.local.port" in its package.json.`,
    );
    console.error(`See docs/onboard-modular-architecture.md for port conventions.\n`);
  }

  // --- 2. Validate production service ports from the dashboard-operator module registry ---
  if (validateProductionPorts(parseModuleRegistry(MODULE_REGISTRY_PATH))) {
    hasErrors = true;
  }

  if (!hasErrors) {
    console.log(`${colors.green}✓ All module federation ports are unique.${colors.reset}\n`);
  }
  process.exitCode = hasErrors ? 1 : 0;
}

if (require.main === module) {
  validate();
}

module.exports = { parseModuleRegistryContent, validateProductionPorts };
