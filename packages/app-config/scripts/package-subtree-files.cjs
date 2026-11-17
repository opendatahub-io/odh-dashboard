/* eslint-env node */
// Shared literal-path policy for initial copies and incremental subtree patches.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const [mode, packageJson, ...args] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(packageJson, 'utf8')).subtree ?? {};
const excludes = config.exclude === undefined ? [] : config.exclude;
if (
  !Array.isArray(excludes) ||
  excludes.some(
    (entry) =>
      typeof entry !== 'string' ||
      !entry ||
      entry.startsWith('/') ||
      /[\\*?[\]]/.test(entry) ||
      [...entry].some((char) => char.charCodeAt(0) < 32) ||
      entry
        .replace(/\/$/, '')
        .split('/')
        .some((part) => !part || part === '.' || part === '..'),
  )
) {
  console.error(
    'subtree.exclude must contain relative literal file paths or directories ending in /',
  );
  process.exit(1);
}
// Latin-1 is an internal, reversible representation of filesystem and patch bytes.
const byteExcludes = excludes.map((entry) => Buffer.from(entry, 'utf8').toString('latin1'));
const excluded = (name, directory = false) =>
  byteExcludes.some((entry) =>
    entry.endsWith('/')
      ? name.startsWith(entry) || name === entry.slice(0, -1)
      : !directory && name === entry,
  );

// Rename metadata retains the source path that `git apply --numstat` omits.
const unquote = (name) => {
  if (!name.startsWith('"')) return name;
  const escapes = {
    a: '\x07',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
    '\\': '\\',
    '"': '"',
  };
  return name
    .slice(1, -1)
    .replace(/\\([0-7]{1,3}|[abfnrtv\\"])/g, (_, escape) =>
      /^[0-7]/.test(escape) ? String.fromCharCode(parseInt(escape, 8)) : escapes[escape],
    );
};

// Keep byte-preserving blocks paired with the paths decoded by Git for every consumer.
const readPatch = (input) => {
  const patch = fs.readFileSync(input);
  if (!/^diff --git /m.test(patch.toString('latin1'))) return [];
  // Git decodes quoted paths, including rename sources and destinations, without losing bytes.
  const records = execFileSync('git', ['apply', '--numstat', '-z'], {
    input: patch,
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString('latin1')
    .split('\0');
  const blocks = patch
    .toString('latin1')
    .split(/(?=^diff --git )/m)
    .filter((block) => block.startsWith('diff --git '));
  let offset = 0;
  return blocks.map((block) => {
    const record = records[offset++];
    if (record === undefined || !/^[^\t]*\t[^\t]*\t/.test(record)) {
      throw new Error('Unable to identify subtree patch paths');
    }
    const name = record.replace(/^[^\t]*\t[^\t]*\t/, '');
    let oldName = name || records[offset++];
    let newName = name || records[offset++];
    const renameFrom = /^(?:rename|copy) from (.*)$/m.exec(block);
    const renameTo = /^(?:rename|copy) to (.*)$/m.exec(block);
    if (renameFrom && renameTo) {
      oldName = unquote(renameFrom[1]);
      newName = unquote(renameTo[1]);
    }
    if (oldName === undefined || newName === undefined) {
      throw new Error('Incomplete subtree rename paths');
    }
    return { name: newName, oldName, newName, block };
  });
};

if (mode === 'paths' || mode === 'extract' || mode === 'bases') {
  const [input, output] = args;
  const entries = readPatch(input);
  if (mode === 'paths') {
    for (const { name } of entries) process.stdout.write(Buffer.from(`${name}\0`, 'latin1'));
  } else if (mode === 'bases') {
    for (const { oldName, block } of entries) {
      const match = /^index ([0-9a-f]+)\.\.[0-9a-f]+(?: ([0-9]+))?/m.exec(block);
      if (match)
        process.stdout.write(
          Buffer.from(`${oldName}\0${match[1]}\0${match[2] ?? '100644'}\0`, 'latin1'),
        );
    }
  } else {
    const filename = fs.readFileSync(0).toString('latin1');
    const entry = entries.find(({ name }) => name === filename);
    fs.writeFileSync(output, Buffer.from(entry?.block ?? '', 'latin1'));
  }
} else if (mode === 'filter') {
  const [input, subdir, output, splitInput] = args;
  const entries = readPatch(input);
  const prefix = subdir
    ? Buffer.from(`${subdir.replace(/\/$/, '')}/`, 'utf8').toString('latin1')
    : '';
  const included = (name) => name.startsWith(prefix) && !excluded(name.slice(prefix.length));
  // Git's C-style quoting accepts octal byte escapes, not JSON's Unicode escapes.
  const quote = (name) => {
    const needsQuoting = [...name].some((char) => {
      const byte = char.charCodeAt(0);
      return byte <= 32 || byte >= 127 || char === '"' || char === '\\';
    });
    if (!needsQuoting) return name;
    return `"${[...name]
      .map((char) => {
        const byte = char.charCodeAt(0);
        return byte < 32 || byte >= 127 || char === '"' || char === '\\'
          ? `\\${byte.toString(8).padStart(3, '0')}`
          : char;
      })
      .join('')}"`;
  };
  let splitEntries;
  const selected = entries.flatMap((entry) => {
    const oldIncluded = included(entry.oldName);
    const newIncluded = included(entry.newName);
    if (!oldIncluded && !newIncluded) return [];
    if (oldIncluded && newIncluded) return [entry];
    if (!splitInput)
      throw new Error('A split patch is required for renames across exclusion boundaries');
    splitEntries ??= readPatch(splitInput);
    const name = oldIncluded ? entry.oldName : entry.newName;
    const split = splitEntries.find((candidate) => candidate.name === name);
    if (!split) throw new Error('Unable to split subtree rename');
    return [split];
  });
  const result = selected
    .map(({ oldName, newName, block }) => {
      const oldPath = oldName.slice(prefix.length);
      const newPath = newName.slice(prefix.length);
      let header = true;
      return block
        .split('\n')
        .map((line) => {
          if (line.startsWith('@@') || line === 'GIT binary patch') header = false;
          if (!header) return line;
          if (line.startsWith('diff --git '))
            return `diff --git ${quote(`a/${oldPath}`)} ${quote(`b/${newPath}`)}`;
          if (line.startsWith('rename from ')) return `rename from ${quote(oldPath)}`;
          if (line.startsWith('rename to ')) return `rename to ${quote(newPath)}`;
          if (line.startsWith('copy from ')) return `copy from ${quote(oldPath)}`;
          if (line.startsWith('copy to ')) return `copy to ${quote(newPath)}`;
          if (line.startsWith('--- ') && line !== '--- /dev/null')
            return `--- ${quote(`a/${oldPath}`)}`;
          if (line.startsWith('+++ ') && line !== '+++ /dev/null')
            return `+++ ${quote(`b/${newPath}`)}`;
          return line;
        })
        .join('\n');
    })
    .join('');
  fs.writeFileSync(output, Buffer.from(result, 'latin1'));
} else if (mode === 'copy') {
  const [sourceArg, destinationArg] = args;
  const source = Buffer.from(sourceArg);
  const destination = Buffer.from(destinationArg);
  const join = (root, relative) => Buffer.concat([root, Buffer.from(`/${relative}`, 'latin1')]);
  const children = (directory) =>
    fs.readdirSync(directory, { encoding: 'buffer' }).map((name) => name.toString('latin1'));
  const visit = (relative) => {
    if (path.basename(relative) === '.git') return;
    const from = join(source, relative);
    const to = join(destination, relative);
    const stat = fs.lstatSync(from);
    if (excluded(relative, stat.isDirectory())) return;
    const existing = fs.lstatSync(to, { throwIfNoEntry: false });
    if (stat.isDirectory()) {
      if (existing && !existing.isDirectory()) {
        if (excluded(relative)) {
          throw new Error(`Cannot replace excluded file with directory: ${to}`);
        }
        fs.rmSync(to, { force: true });
      }
      fs.mkdirSync(to, { recursive: true });
      for (const child of children(from)) visit(relative ? `${relative}/${child}` : child);
    } else {
      // Do not follow a destination symlink when writing upstream content.
      if (existing?.isDirectory()) {
        // Pruning removed included children. A remaining child is excluded and must survive.
        if (fs.readdirSync(to).length > 0) {
          throw new Error(`Cannot replace directory containing excluded files: ${to}`);
        }
        fs.rmdirSync(to);
      } else {
        fs.rmSync(to, { force: true });
      }
      if (stat.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(from, { encoding: 'buffer' }), to);
      else {
        fs.copyFileSync(from, to);
        fs.chmodSync(to, stat.mode);
      }
    }
  };
  const prune = (relative) => {
    if (path.basename(relative) === '.git') return;
    const to = join(destination, relative);
    const stat = fs.lstatSync(to);
    if (excluded(relative, stat.isDirectory())) return;
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      for (const child of children(to)) prune(relative ? `${relative}/${child}` : child);
      if (relative && !fs.existsSync(join(source, relative)) && fs.readdirSync(to).length === 0)
        fs.rmdirSync(to);
    } else if (!fs.existsSync(join(source, relative))) {
      fs.unlinkSync(to);
    }
  };
  if (fs.existsSync(destination)) prune('');
  visit('');
} else if (mode !== 'validate') {
  throw new Error(`Unknown subtree file operation: ${mode}`);
}
