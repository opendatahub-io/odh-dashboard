/**
 * Shared AST helpers for detecting useEffect cleanup issues.
 */

/**
 * @param {import('estree').Node | null | undefined} node
 * @returns {boolean}
 */
function isFunctionNode(node) {
  return (
    !!node &&
    (node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionExpression' ||
      node.type === 'FunctionDeclaration')
  );
}

/**
 * @param {ReturnType<import('eslint').Rule.RuleContext['getSourceCode']>['scopeManager']} scopeManager
 * @param {import('estree').Node} node
 * @returns {import('eslint').Scope.Scope | null}
 */
function getClosestScope(scopeManager, node) {
  let current = node;
  while (current) {
    const acquired = scopeManager.acquire(current, true) || scopeManager.acquire(current, false);
    if (acquired) {
      return acquired;
    }
    current = current.parent || null;
  }
  return null;
}

/**
 * @param {import('eslint').Scope.Scope | null} scope
 * @param {string} name
 * @returns {import('eslint').Scope.Variable | null}
 */
function findVariable(scope, name) {
  let current = scope;
  while (current) {
    if (current.set && current.set.has(name)) {
      return current.set.get(name);
    }
    current = current.upper;
  }
  return null;
}

/**
 * Resolves an expression into a function node when possible.
 * Supports direct function nodes, identifiers pointing to variable declarators,
 * and identifiers pointing to function declarations.
 * @param {import('estree').Node | null | undefined} expr
 * @param {import('eslint').Scope.Scope | null} scope
 * @param {Set<string>} visited
 * @returns {import('estree').ArrowFunctionExpression | import('estree').FunctionExpression | import('estree').FunctionDeclaration | null}
 */
function resolveFunctionExpression(expr, scope, visited = new Set()) {
  if (!expr) {
    return null;
  }

  if (isFunctionNode(expr)) {
    return expr;
  }

  if (expr.type !== 'Identifier') {
    return null;
  }

  if (visited.has(expr.name)) {
    return null;
  }
  visited.add(expr.name);

  const variable = findVariable(scope, expr.name);
  if (!variable) {
    return null;
  }

  for (const def of variable.defs) {
    if (def.type === 'FunctionName' && def.node && def.node.type === 'FunctionDeclaration') {
      return def.node;
    }

    if (def.type === 'Variable' && def.node && def.node.type === 'VariableDeclarator') {
      const resolved = resolveFunctionExpression(def.node.init, variable.scope, visited);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

/**
 * @param {import('estree').CallExpression} node
 */
function isEffectHook(node) {
  if (node.type !== 'CallExpression') {
    return false;
  }

  const { callee } = node;

  if (callee.type === 'Identifier') {
    return callee.name === 'useEffect' || callee.name === 'useLayoutEffect';
  }

  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.object.type === 'Identifier'
  ) {
    return callee.property.name === 'useEffect' || callee.property.name === 'useLayoutEffect';
  }

  return false;
}

/**
 * @param {import('estree').CallExpression} node
 * @returns {import('estree').ArrowFunctionExpression | import('estree').FunctionExpression | null}
 */
function getEffectCallback(node) {
  const arg = node.arguments[0];
  if (arg && (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression')) {
    return arg;
  }
  return null;
}

/**
 * Gets the simple name of a called function.
 * Handles `fn()`, `obj.fn()`, and `obj.prop.fn()`.
 * @param {import('estree').CallExpression} node
 * @returns {string | null}
 */
function getCallName(node) {
  if (!node || node.type !== 'CallExpression') {
    return null;
  }

  if (node.callee.type === 'Identifier') {
    return node.callee.name;
  }

  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    return node.callee.property.name;
  }

  return null;
}

/**
 * Recursively checks whether an AST subtree contains a call to any of the given function names.
 * @param {import('estree').Node} node
 * @param {string[]} functionNames
 * @returns {boolean}
 */
function containsCallTo(node, functionNames) {
  if (!node || typeof node !== 'object') {
    return false;
  }

  if (node.type === 'CallExpression') {
    const name = getCallName(node);
    if (name && functionNames.includes(name)) {
      return true;
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item.type === 'string' && containsCallTo(item, functionNames)) {
          return true;
        }
      }
    } else if (child && typeof child.type === 'string') {
      if (containsCallTo(child, functionNames)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether the effect body (excluding cleanup returns) contains calls to the given names.
 * This avoids false positives when e.g. setTimeout is used inside the cleanup itself.
 * @param {import('estree').ArrowFunctionExpression | import('estree').FunctionExpression} callback
 * @param {string[]} functionNames
 * @returns {boolean}
 */
function bodyContainsCallTo(callback, functionNames) {
  const { body } = callback;
  if (body.type !== 'BlockStatement') {
    return containsCallTo(body, functionNames);
  }

  return body.body.some((stmt) => {
    if (
      stmt.type === 'ReturnStatement' &&
      stmt.argument &&
      (stmt.argument.type === 'ArrowFunctionExpression' ||
        stmt.argument.type === 'FunctionExpression')
    ) {
      return false;
    }
    return containsCallTo(stmt, functionNames);
  });
}

/**
 * Finds the cleanup function returned from an effect callback.
 * @param {import('estree').ArrowFunctionExpression | import('estree').FunctionExpression} callback
 * @param {import('eslint').Rule.RuleContext} context
 * @returns {import('estree').ArrowFunctionExpression | import('estree').FunctionExpression | import('estree').FunctionDeclaration | null}
 */
function getCleanupFunction(callback, context) {
  const { body } = callback;
  if (body.type !== 'BlockStatement') {
    return null;
  }

  const { scopeManager } = context.sourceCode;

  for (let i = body.body.length - 1; i >= 0; i--) {
    const stmt = body.body[i];
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      const scope = getClosestScope(scopeManager, stmt);
      const resolved = resolveFunctionExpression(stmt.argument, scope);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

/**
 * Checks whether an AST subtree contains `new ConstructorName(...)`.
 * @param {import('estree').Node} node
 * @param {string} constructorName
 * @returns {boolean}
 */
function containsNewExpression(node, constructorName) {
  if (!node || typeof node !== 'object') {
    return false;
  }

  if (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === constructorName
  ) {
    return true;
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item.type === 'string' && containsNewExpression(item, constructorName)) {
          return true;
        }
      }
    } else if (child && typeof child.type === 'string') {
      if (containsNewExpression(child, constructorName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds all cleanup functions (return statements that return a function) anywhere
 * in the callback body, including inside conditional branches. Does not recurse
 * into nested function scopes.
 * @param {import('estree').Node} node
 * @param {import('eslint').Rule.RuleContext} context
 * @returns {Array<import('estree').ArrowFunctionExpression | import('estree').FunctionExpression | import('estree').FunctionDeclaration>}
 */
function findAllCleanupFunctions(node, context) {
  const cleanupFns = [];
  const sourceCode = context.sourceCode || context.getSourceCode();
  const { scopeManager } = sourceCode;

  function walk(n) {
    if (!n || typeof n !== 'object') {
      return;
    }

    if (
      n.type === 'ArrowFunctionExpression' ||
      n.type === 'FunctionExpression' ||
      n.type === 'FunctionDeclaration'
    ) {
      return;
    }

    if (n.type === 'ReturnStatement' && n.argument) {
      const scope = getClosestScope(scopeManager, n);
      const resolved = resolveFunctionExpression(n.argument, scope);
      if (resolved) {
        cleanupFns.push(resolved);
      }
    }

    for (const key of Object.keys(n)) {
      if (key === 'parent') {
        continue;
      }
      const child = n[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item.type === 'string') {
            walk(item);
          }
        }
      } else if (child && typeof child.type === 'string') {
        walk(child);
      }
    }
  }

  walk(node);
  return cleanupFns;
}

module.exports = {
  isEffectHook,
  getEffectCallback,
  getCallName,
  containsCallTo,
  bodyContainsCallTo,
  getCleanupFunction,
  findAllCleanupFunctions,
  containsNewExpression,
};
