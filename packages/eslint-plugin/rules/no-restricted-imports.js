const { Linter } = require('eslint');
const micromatch = require('micromatch');

const baseNoRestrictedImports = new Linter().getRules().get('no-restricted-imports');

// Wrap the base rule to support negation patterns with '!'
module.exports = {
  ...baseNoRestrictedImports,
  create(context) {
    const options = context.options || [];

    // Extract negation patterns (those starting with '!')
    const processedOptions = options.map((option) => {
      if (option && option.patterns) {
        return {
          ...option,
          patterns: option.patterns.map((pattern) => {
            if (pattern.group) {
              const allowPatterns = pattern.group.filter((p) => p.startsWith('!'));
              const restrictPatterns = pattern.group.filter((p) => !p.startsWith('!'));

              return {
                ...pattern,
                group: restrictPatterns,
                _allowPatterns: allowPatterns.map((p) => p.slice(1)), // Remove '!' prefix
              };
            }
            return pattern;
          }),
        };
      }
      return option;
    });

    // Create the base rule with processed options
    const baseRule = baseNoRestrictedImports.create({
      ...context,
      options: processedOptions,
    });

    // Wrap the ImportDeclaration handler to check allowlist
    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        // Check if this import should be allowed based on negation patterns
        const isAllowed = processedOptions.some((option) =>
          option?.patterns?.some(
            (pattern) =>
              pattern._allowPatterns && micromatch.isMatch(importSource, pattern._allowPatterns),
          ),
        );

        // If allowed, skip the base rule check
        if (isAllowed) {
          return;
        }

        // Otherwise, run the base rule
        if (baseRule.ImportDeclaration) {
          baseRule.ImportDeclaration(node);
        }
      },
    };
  },
};
