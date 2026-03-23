/**
 * Validates that module-federation ports are unique across workspace packages.
 *
 * Two categories of ports are checked:
 *
 * 1. Local dev ports (package.json "module-federation.local.port")
 *    Must be unique so multiple federated modules can run simultaneously.
 *
 * 2. Production service ports (federation-configmap.yaml "service.port")
 *    Must be unique because all BFF sidecars run in the same pod.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function getWorkspacePackages() {
  try {
    const stdout = execSync('npm query .workspace --json', { encoding: 'utf8' });
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`${colors.red}Error querying workspaces:${colors.reset}`, error.message);
    throw new Error('Failed to query workspace packages');
  }
}

/**
 * Extracts the local dev port from a module-federation config, handling both
 * the old format (local.port) and the new format (backend.localService.port).
 * Also checks proxyService entries for packages that only define proxy ports.
 */
function extractLocalPort(mfConfig) {
  if (mfConfig.local?.port != null) {
    return mfConfig.local.port;
  }
  if (mfConfig.backend?.localService?.port != null) {
    return mfConfig.backend.localService.port;
  }
  if (Array.isArray(mfConfig.proxyService)) {
    for (const proxy of mfConfig.proxyService) {
      if (proxy.localService?.port != null) {
        return proxy.localService.port;
      }
    }
  }
  return null;
}

function extractName(mfConfig) {
  return mfConfig.name ?? 'unknown';
}

/**
 * Parses the federation-configmap.yaml to extract production service ports.
 * The configmap contains a JSON array embedded in YAML under
 * data."module-federation-config.json".
 */
function parseFederationConfigMap() {
  const configMapPath = path.resolve(
    __dirname,
    '../manifests/modular-architecture/federation-configmap.yaml',
  );

  if (!fs.existsSync(configMapPath)) {
    return null;
  }

  const content = fs.readFileSync(configMapPath, 'utf8');

  // Extract the JSON array from the YAML. It starts after the
  // "module-federation-config.json: |" line and is indented.
  const jsonMatch = content.match(/module-federation-config\.json:\s*\|\s*\n([\s\S]+)/);
  if (!jsonMatch) {
    return null;
  }

  const lines = jsonMatch[1].split('\n');
  const indent = lines.find((l) => l.trim())?.match(/^(\s*)/)?.[1].length ?? 0;
  const rawJson = lines
    .map((line) => (indent > 0 ? line.slice(indent) : line))
    .join('\n')
    .trim();

  try {
    return JSON.parse(rawJson);
  } catch {
    console.warn(`${colors.yellow}⚠ Could not parse federation-configmap.yaml JSON${colors.reset}`);
    return null;
  }
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
    const port = extractLocalPort(mfConfig);
    const mfName = extractName(mfConfig);
    const packageName = pkg.name || pkg.path;

    if (port == null) {
      console.warn(
        `${colors.yellow}⚠ ${packageName} (${mfName}): no local dev port configured${colors.reset}`,
      );
      continue;
    }

    if (!localPortMap.has(port)) {
      localPortMap.set(port, []);
    }
    localPortMap.get(port).push({ name: `${mfName} (${packageName})` });
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

  // --- 2. Validate production service ports from federation-configmap.yaml ---
  const configMapEntries = parseFederationConfigMap();

  if (configMapEntries) {
    const servicePortMap = new Map();

    for (const entry of configMapEntries) {
      const name = entry.name ?? 'unknown';
      const servicePort = entry.service?.port;

      if (servicePort == null) {
        continue;
      }

      if (!servicePortMap.has(servicePort)) {
        servicePortMap.set(servicePort, []);
      }
      servicePortMap.get(servicePort).push({ name });
    }

    if (servicePortMap.size > 0) {
      console.log(
        `${colors.cyan}Production Service Ports (federation-configmap.yaml)${colors.reset}`,
      );
      console.log('─'.repeat(60));
      const serviceConflicts = checkPortMap(servicePortMap);
      console.log('─'.repeat(60));
      console.log(
        `  ${configMapEntries.length} module(s), ${servicePortMap.size} unique port(s)\n`,
      );

      if (serviceConflicts.length > 0) {
        hasErrors = true;
        console.error(
          `${colors.red}✗ Production service port conflicts detected:${colors.reset}\n`,
        );
        for (const { port, owners } of serviceConflicts) {
          const names = owners.map((o) => o.name).join(', ');
          console.error(`  Port ${port} is used by: ${names}`);
        }
        console.error(
          `\nEach module must have a unique "service.port" in federation-configmap.yaml.`,
        );
        console.error(
          `Ports must also match in deployment.yaml, service.yaml, and networkpolicy.yaml.\n`,
        );
      }
    }
  }

  if (!hasErrors) {
    console.log(`${colors.green}✓ All module federation ports are unique.${colors.reset}\n`);
  }
  process.exitCode = hasErrors ? 1 : 0;
}

validate();
