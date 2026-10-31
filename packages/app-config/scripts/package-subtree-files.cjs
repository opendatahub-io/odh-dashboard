/* eslint-env node */
// Shared literal-path policy for initial copies and incremental subtree patches.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const [mode, packageJson, ...args] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(packageJson, 'utf8')).subtree;
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
  throw new Error(
    'subtree.exclude must contain relative literal file paths or directories ending in /',
  );
}
const excluded = (name, directory = false) =>
  excludes.some((entry) =>
    entry.endsWith('/')
      ? name.startsWith(entry) || name === entry.slice(0, -1)
      : !directory && name === entry,
  );

if (mode === 'filter') {
  const [input, subdir, output] = args;
  const patch = fs.readFileSync(input);
  if (!/^diff --git /m.test(patch.toString('utf8'))) {
    fs.writeFileSync(output, '');
    process.exit(0);
  }
  // Git decodes quoted paths, spaces and binary patches for us. Patches use --no-renames.
  const records = execFileSync('git', ['apply', '--numstat', '-z'], {
    input: patch,
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const blocks = patch
    .toString('utf8')
    .split(/(?=^diff --git )/m)
    .filter((block) => block.startsWith('diff --git '));
  if (records.length !== blocks.length) throw new Error('Unable to identify subtree patch paths');
  const prefix = subdir ? `${subdir.replace(/\/$/, '')}/` : '';
  const result = blocks
    .flatMap((block, index) => {
      const original = records[index].replace(/^[^\t]*\t[^\t]*\t/, '');
      if (!original.startsWith(prefix)) return [];
      const relative = original.slice(prefix.length);
      if (excluded(relative)) return [];
      const quote = (name) =>
        /["\\]/.test(name) || [...name].some((char) => char.charCodeAt(0) <= 32)
          ? JSON.stringify(name)
          : name;
      let header = true;
      return [
        block
          .split('\n')
          .map((line) => {
            if (line.startsWith('@@') || line === 'GIT binary patch') header = false;
            if (line.startsWith('diff --git '))
              return `diff --git ${quote(`a/${relative}`)} ${quote(`b/${relative}`)}`;
            if (header && line.startsWith('--- ') && line !== '--- /dev/null')
              return `--- ${quote(`a/${relative}`)}`;
            if (header && line.startsWith('+++ ') && line !== '+++ /dev/null')
              return `+++ ${quote(`b/${relative}`)}`;
            return line;
          })
          .join('\n'),
      ];
    })
    .join('');
  fs.writeFileSync(output, result);
} else if (mode === 'copy') {
  const [source, destination] = args;
  const visit = (relative) => {
    if (relative === '.git' || relative.startsWith('.git/')) return;
    const from = path.join(source, relative);
    const to = path.join(destination, relative);
    const stat = fs.lstatSync(from);
    if (excluded(relative, stat.isDirectory())) return;
    if (stat.isDirectory()) {
      if (
        fs.existsSync(to) &&
        (!fs.lstatSync(to).isDirectory() || fs.lstatSync(to).isSymbolicLink())
      ) {
        throw new Error(`Cannot copy directory over non-directory: ${to}`);
      }
      fs.mkdirSync(to, { recursive: true });
      for (const child of fs.readdirSync(from)) visit(relative ? `${relative}/${child}` : child);
    } else {
      // Do not follow a destination symlink when writing upstream content.
      fs.rmSync(to, { force: true });
      if (stat.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(from), to);
      else {
        fs.copyFileSync(from, to);
        fs.chmodSync(to, stat.mode);
      }
    }
  };
  const prune = (relative) => {
    if (relative === '.git') return;
    const to = path.join(destination, relative);
    const stat = fs.lstatSync(to);
    if (excluded(relative, stat.isDirectory())) return;
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      for (const child of fs.readdirSync(to)) prune(relative ? `${relative}/${child}` : child);
      if (
        relative &&
        !fs.existsSync(path.join(source, relative)) &&
        fs.readdirSync(to).length === 0
      )
        fs.rmdirSync(to);
    } else if (!fs.existsSync(path.join(source, relative))) {
      fs.unlinkSync(to);
    }
  };
  if (fs.existsSync(destination)) prune('');
  visit('');
} else if (mode !== 'validate') {
  throw new Error(`Unknown subtree file operation: ${mode}`);
}
