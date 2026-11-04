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
  if (!/^diff --git /m.test(patch.toString('latin1'))) {
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
    .toString('latin1')
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
      // Preserve hunk bytes verbatim while keeping rewritten filenames encoded as UTF-8.
      const raw = (name) => Buffer.from(quote(name), 'utf8').toString('latin1');
      let header = true;
      return [
        block
          .split('\n')
          .map((line) => {
            if (line.startsWith('@@') || line === 'GIT binary patch') header = false;
            if (line.startsWith('diff --git '))
              return `diff --git ${raw(`a/${relative}`)} ${raw(`b/${relative}`)}`;
            if (header && line.startsWith('--- ') && line !== '--- /dev/null')
              return `--- ${raw(`a/${relative}`)}`;
            if (header && line.startsWith('+++ ') && line !== '+++ /dev/null')
              return `+++ ${raw(`b/${relative}`)}`;
            return line;
          })
          .join('\n'),
      ];
    })
    .join('');
  fs.writeFileSync(output, Buffer.from(result, 'latin1'));
} else if (mode === 'copy') {
  const [source, destination] = args;
  const visit = (relative) => {
    if (relative === '.git' || relative.startsWith('.git/')) return;
    const from = path.join(source, relative);
    const to = path.join(destination, relative);
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
      for (const child of fs.readdirSync(from)) visit(relative ? `${relative}/${child}` : child);
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
