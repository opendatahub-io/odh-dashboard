/**
 * Plop configuration for generating ODH Dashboard components
 *
 * This file configures the plugin generator:
 * - 'plugin' - Creates a new plugin package in packages/
 *
 * Usage: npm run plop
 */

module.exports = (plop) => {
  // ============================================================================
  // CONFIGURATION DATA
  // ============================================================================

  /**
   * Available supported areas for feature flags
   * These correspond to the SupportedArea enum in the codebase
   */
  const supportedAreaOptions = [
    // Core areas
    { name: 'Home', value: 'HOME' },
    { name: 'Workbenches', value: 'WORKBENCHES' },
    { name: 'Data Science Pipelines', value: 'DS_PIPELINES' },

    // Admin areas
    { name: 'Bring Your Own Notebook', value: 'BYON' },
    { name: 'Cluster Settings', value: 'CLUSTER_SETTINGS' },
    { name: 'User Management', value: 'USER_MANAGEMENT' },
    { name: 'Accelerator Profiles', value: 'ACCELERATOR_PROFILES' },
    { name: 'Hardware Profiles', value: 'HARDWARE_PROFILES' },
    { name: 'Storage Classes', value: 'STORAGE_CLASSES' },
    { name: 'Connection Types', value: 'ADMIN_CONNECTION_TYPES' },
    { name: 'Fine Tuning', value: 'FINE_TUNING' },

    // Project areas
    { name: 'DS Projects Permissions', value: 'DS_PROJECTS_PERMISSIONS' },
    { name: 'DS Projects View', value: 'DS_PROJECTS_VIEW' },
    { name: 'DS Project Scoped', value: 'DS_PROJECT_SCOPED' },

    // Model serving areas
    { name: 'Model Serving', value: 'MODEL_SERVING' },
    { name: 'Custom Runtimes', value: 'CUSTOM_RUNTIMES' },
    { name: 'KServe', value: 'K_SERVE' },
    { name: 'KServe Auth', value: 'K_SERVE_AUTH' },
    { name: 'KServe Metrics', value: 'K_SERVE_METRICS' },
    { name: 'KServe Raw', value: 'K_SERVE_RAW' },
    { name: 'Model Mesh', value: 'MODEL_MESH' },
    { name: 'Bias Metrics', value: 'BIAS_METRICS' },
    { name: 'Performance Metrics', value: 'PERFORMANCE_METRICS' },
    { name: 'Trusty AI', value: 'TRUSTY_AI' },
    { name: 'NIM Model', value: 'NIM_MODEL' },
    { name: 'Serving Runtime Params', value: 'SERVING_RUNTIME_PARAMS' },
    { name: 'PVC Serving', value: 'PVCSERVING' },

    // Other areas
    { name: 'Distributed Workloads', value: 'DISTRIBUTED_WORKLOADS' },
    { name: 'Kueue', value: 'KUEUE' },
    { name: 'Model Registry', value: 'MODEL_REGISTRY' },
    { name: 'Model Registry Secure DB', value: 'MODEL_REGISTRY_SECURE_DB' },
    { name: 'Model Catalog', value: 'MODEL_CATALOG' },
    { name: 'Plugin Model Serving', value: 'PLUGIN_MODEL_SERVING' },
    { name: 'Llama Stack Chat Bot', value: 'LLAMA_STACK_CHAT_BOT' },
    { name: 'LM Eval', value: 'LM_EVAL' },
    { name: 'Feature Store', value: 'FEATURE_STORE' },
  ];

  /**
   * Navigation sections - organize navigation items into collapsible groups
   * These correspond to the main sections in the dashboard sidebar
   */
  const navigationSections = [
    { name: 'Models', value: 'models' },
    { name: 'Data Science Pipelines', value: 'pipelines-and-runs' },
    { name: 'Experiments', value: 'experiments' },
    { name: 'Applications', value: 'applications' },
    { name: 'Settings', value: 'settings' },
    { name: 'Custom section', value: 'custom' },
    { name: 'Top level (no section)', value: 'none' },
  ];

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Formats generated plugin files using prettier and eslint
   * Only runs on files that were actually generated
   */
  const createFormatGeneratedFilesAction = () =>
    function formatGeneratedFilesHandler(answers) {
      const { execSync } = require('child_process');
      const fs = require('fs');

      try {
        const { componentName } = answers;
        const kebabName = componentName
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^-/, '');

        // Files that should be formatted if they exist
        const potentialFiles = [
          `packages/${kebabName}/package.json`,
          `packages/${kebabName}/tsconfig.json`,
          `packages/${kebabName}/extensions.ts`,
          `packages/${kebabName}/src/${componentName}.tsx`,
          `packages/${kebabName}/src/${componentName}Page.tsx`,
        ];

        // Only format files that actually exist
        const existingFiles = potentialFiles.filter(fs.existsSync);

        if (existingFiles.length === 0) {
          console.log('ℹ️  No files to format');
          return 'No files to format';
        }

        console.log('🔧 Formatting generated files...');

        // Format each file with prettier
        existingFiles.forEach((file) => {
          console.log(`🎨 Formatting ${file}...`);
          execSync(`npx prettier --write "${file}"`, { stdio: 'inherit' });
        });

        // Lint only TypeScript files with eslint (non-critical)
        const typeScriptFiles = existingFiles.filter(
          (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
        );
        typeScriptFiles.forEach((file) => {
          console.log(`🔧 Linting ${file}...`);
          try {
            execSync(`npx eslint --fix "${file}"`, { stdio: 'inherit' });
          } catch (eslintError) {
            console.log(`ℹ️  ESLint completed with some warnings for ${file} (non-critical)`);
          }
        });

        console.log('✅ Generated files formatted successfully!');
        return 'Generated files formatted successfully!';
      } catch (error) {
        console.warn(
          '⚠️  Formatting encountered some issues, but files were generated successfully.',
        );
        console.log('Error details:', error.message);
        return 'Files generated (with formatting warnings)';
      }
    };

  /**
   * Shows post-generation instructions for plugins
   */
  const createPluginInstructionsAction = () =>
    function pluginInstructionsHandler(answers) {
      const { componentName, devFlag } = answers;
      const kebabName = componentName
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

      console.log('\n🎉 PLUGIN GENERATED SUCCESSFULLY!');
      console.log('═'.repeat(50));
      console.log(`📦 Plugin: ${componentName}`);
      console.log(`📂 Location: packages/${kebabName}/`);
      console.log('');
      console.log('📋 Next steps:');
      console.log('  1. 📦 Install dependencies:');
      console.log(`     npm install`);
      console.log('');
      console.log('  2. 🔄 Restart the frontend server:');
      console.log(`     npm run start:dev`);
      console.log('');
      console.log('  3. 🚩 Enable the plugin using feature flags:');
      console.log(
        `     • Click the feature flags icon in the top right corner of the dashboard header`,
      );
      console.log(`     • Find "${devFlag}" and toggle it ON`);
      console.log(`     • The plugin will appear in the navigation sidebar`);
      console.log('');
      console.log('  4. 🎨 Customize your plugin (optional):');
      console.log(
        `     • Edit packages/${kebabName}/src/${componentName}Page.tsx for the main page`,
      );
      console.log(`     • Edit packages/${kebabName}/src/${componentName}.tsx for routing`);
      console.log(`     • Modify packages/${kebabName}/extensions.ts for plugin configuration`);
      console.log('');
      console.log(`🔗 Your plugin route will be available at: ${answers.routePath}`);
      console.log('');

      return 'Plugin setup complete!';
    };

  // ============================================================================
  // PLOP SETUP
  // ============================================================================

  // Register custom action types
  plop.setActionType('formatGeneratedFiles', createFormatGeneratedFilesAction());
  plop.setActionType('pluginInstructions', createPluginInstructionsAction());

  // Register handlebars helpers
  plop.setHelper('eq', (a, b) => a === b);
  plop.setHelper('kebabCase', (str) =>
    str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, ''),
  );
  plop.setHelper('constantCase', (str) =>
    str
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, ''),
  );

  /**
   * Generates flags object for extensions based on user selections
   * Handles admin users, required areas, and disallowed areas
   */
  plop.setHelper(
    'generateFlags',
    function generateFlags(requiresAdmin, requiredAreas, disallowedAreas) {
      if (requiresAdmin) {
        return '\n    flags: {\n      required: [ADMIN_USER],\n    },';
      }

      if (requiredAreas && requiredAreas.length > 0) {
        const areas = requiredAreas.map((area) => `SupportedArea.${area}`).join(', ');
        return `\n    flags: {\n      required: [${areas}],\n    },`;
      }

      if (disallowedAreas && disallowedAreas.length > 0) {
        const areas = disallowedAreas.map((area) => `SupportedArea.${area}`).join(', ');
        return `\n    flags: {\n      disallowed: [${areas}],\n    },`;
      }

      return '';
    },
  );

  /**
   * Generates navigation properties object for extensions
   * Handles sections and custom values
   */
  plop.setHelper(
    'generateNavProperties',
    function generateNavProperties(navId, navTitle, routePath, navSection, customSection) {
      let properties = `{\n      id: '${navId}',\n      title: '${navTitle}',\n      href: '${routePath.replace(
        '/*',
        '',
      )}',`;

      // Add path for wildcard routes
      if (routePath.includes('/*')) {
        properties += `\n      path: '${routePath}',`;
      }

      // Add section if specified
      if (navSection && navSection !== 'none') {
        const sectionId = navSection === 'custom' ? customSection : navSection;
        properties += `\n      section: '${sectionId}',`;
      }

      // No group is added - always using default navigation group behavior

      properties += '\n    }';
      return properties;
    },
  );

  // ============================================================================
  // GENERATORS
  // ============================================================================

  /**
   * PLUGIN GENERATOR
   * Creates a new plugin package with all necessary files
   * Plugins are self-contained packages that extend the dashboard
   */
  plop.setGenerator('plugin', {
    description: 'Create a new plugin package',
    prompts: [
      {
        type: 'input',
        name: 'componentName',
        message: 'Component name (PascalCase)?',
        validate: (input) => {
          if (!input) {
            return 'Component name is required';
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
            return 'Component name must be in PascalCase (e.g., MyComponent)';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'routePath',
        message: 'Route path (e.g., /myFeature/*)?',
        validate: (input) => {
          if (!input) {
            return 'Route path is required';
          }
          if (!input.startsWith('/')) {
            return 'Route path must start with /';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Plugin description?',
        default: (answers) => `Plugin for ${answers.componentName}`,
      },
      {
        type: 'input',
        name: 'devFlag',
        message: 'Development flag name?',
        default: (answers) => `${answers.componentName} Plugin`,
      },
      // Navigation configuration
      {
        type: 'input',
        name: 'navTitle',
        message: 'Navigation title?',
        default: (answers) => answers.componentName,
      },
      {
        type: 'input',
        name: 'navId',
        message: 'Navigation ID (kebab-case)?',
        default: (answers) =>
          answers.componentName
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, ''),
      },
      {
        type: 'list',
        name: 'navSection',
        message: 'Navigation section:',
        choices: navigationSections,
        default: 'none',
      },
      {
        type: 'input',
        name: 'customSection',
        message: 'Custom section ID (kebab-case)?',
        when: (answers) => answers.navSection === 'custom',
      },
      // Feature flags
      {
        type: 'checkbox',
        name: 'requiredAreas',
        message: 'Required supported areas (select all that apply):',
        choices: supportedAreaOptions,
        default: [],
      },
    ],
    actions: [
      // Generate all plugin files
      {
        type: 'add',
        path: 'packages/{{kebabCase componentName}}/package.json',
        templateFile: 'plop-templates/package.json.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase componentName}}/tsconfig.json',
        templateFile: 'plop-templates/tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase componentName}}/extensions.ts',
        templateFile: 'plop-templates/extensions.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase componentName}}/src/{{componentName}}Page.tsx',
        templateFile: 'plop-templates/plugin-main-page.tsx.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase componentName}}/src/{{componentName}}.tsx',
        templateFile: 'plop-templates/plugin-component.tsx.hbs',
      },
      // Format generated files
      {
        type: 'formatGeneratedFiles',
        abortOnFail: false,
      },
      // Show post-generation instructions
      {
        type: 'pluginInstructions',
        abortOnFail: false,
      },
    ],
  });
};
