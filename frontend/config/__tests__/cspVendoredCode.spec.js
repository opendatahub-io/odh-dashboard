const fs = require('fs');
const path = require('path');

/**
 * Vendored code is bundled into the app, so anything CSP classifies as `eval` aborts module
 * evaluation and blanks the SPA once `script-src` is enforced. `protoc-gen-js` emits
 * `var global = Function('return this')();` at the top of every generated file, which is why
 * the MLMD output carries a post-generation patch (see src/third_party/mlmd/README.md).
 *
 * See docs/content-security-policy.md.
 */
const GENERATED_DIR = path.join(__dirname, '../../src/third_party/mlmd/generated');

/** `eval(...)` and `Function(...)` are both `unsafe-eval` under CSP. */
const EVAL_CALL = /(?<![\w$.])(?:new\s+)?Function\s*\(|(?<![\w$.])eval\s*\(/;

const generatedFiles = fs
  .readdirSync(GENERATED_DIR, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))
  .toSorted();

describe('vendored MLMD protobuf sources', () => {
  it('ships generated sources to scan', () => {
    expect(generatedFiles.length).toBeGreaterThan(0);
  });

  it.each(generatedFiles)('%s does not use eval or the Function constructor', (file) => {
    const lines = fs.readFileSync(path.join(GENERATED_DIR, file), 'utf8').split('\n');

    const violations = lines
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => EVAL_CALL.test(line))
      .map(({ line, number }) => `${file}:${number}: ${line}`);

    expect(violations).toEqual([]);
  });
});
