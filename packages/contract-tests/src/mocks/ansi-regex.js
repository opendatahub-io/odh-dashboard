// Mock for ansi-regex package to resolve Jest compatibility issues
// This package is a transitive dependency that can cause ES6 module compatibility issues

module.exports = function ansiRegex() {
  // eslint-disable-next-line no-control-regex
  return /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
};
