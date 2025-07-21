# LMEval Test Configuration

This directory contains unified tests for LMEval functionality that can work with different model serving setups, including performance-optimized configurations.

## Test Files

- `testLMEval.cy.ts` - Comprehensive test with two test suites:
  - **Sanity Test**: Uses pre-baked models in storage for faster tests
  - **Smoke Test**: Uses models that are downloaded during deployment

## Test Suites

### Sanity Test (Static Configuration)
- **Tags**: `@Sanity`, `@SanitySet3`, `@LMEval`, `@Featureflagged`
- Uses pre-baked models already available in MinIO, skipping download
- Models (e.g., Qwen) are already available in storage for faster tests
- Tokenizer URL points to bert-base-uncased for compatibility with larger models
- Provides faster test execution but requires more storage resources
- Model: `qwen-isvc` with optimized configuration

### Smoke Test (Dynamic Configuration)
- **Tags**: `@Smoke`, `@SmokeSet3`, `@LMEval`, `@Featureflagged`
- Uses models that are downloaded by vLLM when the container starts
- vLLM downloads the model (gpt2) automatically when it sees the `--model=gpt2` argument
- Tests the full model deployment pipeline including download and initialization
- Tokenizer URL points to tiny-untrained-granite for compatibility with small models
- Uses gpt2 which is vLLM-compatible and has a smaller footprint than larger models
- Model: `tinyllm` (gpt2)

## Configuration

The test uses `test-config.yaml` to define different test setups. The configuration is loaded dynamically in the test's `retryableBefore` hook, making it flexible and maintainable.

### Static Setup (Pre-baked models)
```yaml
static:
  name: 'Static Setup (Pre-baked models)'
  description: 'Uses pre-baked models in MinIO with optimized LMEval job settings'
  storageYaml: 'e2e/lmEval/minio-static.yaml'
  modelServiceYaml: 'e2e/lmEval/inferenceservice-static-qwen.yaml'
  modelName: 'qwen-isvc'
  tokenizerUrl: 'bert-base-uncased'
  lmEval:
    numConcurrent: 3
    maxRetries: 2
    lmEvalTimeoutSeconds: 180
    limit: 2
    maxSamples: 2
    numFewshot: 0
    requestInterval: 0
    modelPath: '/mnt/models'
    servicePort: 8032
    taskName: 'wnli'
```

### Dynamic Setup (Download models)
```yaml
dynamic:
  name: 'Dynamic Setup (Download models)'
  description: 'Uses vLLM to download models dynamically'
  storageYaml: 'e2e/lmEval/minio-dynamic-download.yaml'
  modelServiceYaml: 'e2e/lmEval/inferenceservice-dynamic-tinyllama.yaml'
  modelName: 'tinyllm'
  tokenizerUrl: 'rgeada/tiny-untrained-granite'
  lmEval:
    numConcurrent: 2
    maxRetries: 3
    lmEvalTimeoutSeconds: 180
    limit: 5
    maxSamples: 5
    numFewshot: 0
    requestInterval: 0
    modelPath: 'gpt2'
    servicePort: 8032
    taskName: 'wnli'
```

## Test Workflow

Both tests follow the same workflow:
1. Login to the application
2. Navigate to LMEval page
3. Navigate to evaluation form for the test project
4. Fill in evaluation form with test-specific values
5. Submit the form and wait for job creation
6. Verify job execution and results

## Technical Implementation Details

### Static Setup (Pre-baked models)
- **Model Loading**: Models are pre-stored in MinIO storage and mounted as volumes
- **Storage Configuration**: Uses `storage` section in InferenceService pointing to MinIO secret
- **Model Path**: `/mnt/models` (mounted volume with pre-downloaded models)
- **Resource Usage**: Higher allocation (4 CPU, 16Gi memory) for larger Qwen model
- **Performance**: Higher concurrency (5 vs 2) due to pre-loaded models

### Dynamic Setup (Download models)
- **Model Loading**: vLLM downloads models when container starts via `--model=gpt2` argument
- **Storage Configuration**: No storage section - relies on vLLM's built-in model downloading
- **Model Path**: `gpt2` (model name that gets downloaded by vLLM)
- **Resource Usage**: Lower allocation (2 CPU, 10Gi memory) for smaller GPT-2 model
- **Performance**: Lower concurrency (2 vs 5) due to download overhead

### Security Settings

The tests validate different security settings combinations:
- Static test: `Available Online = true`, `Trust Remote Code = true`
- Dynamic test: `Available Online = true`, `Trust Remote Code = false`

### Model Type Selection

- Both tests use `Local completion` instead of `Local chat completion`
- This is required because the "wnli" task uses "loglikelihood" evaluation which requires the "completions API"
- The "chat completions API" doesn't support "loglikelihood" evaluation

## Test Architecture

The unified test uses a configuration-driven approach:

1. **Configuration Loading**: Uses `loadTestConfig()` to load setup configurations from YAML
2. **Test Setup**: Uses `createModelTestSetup()` to create test infrastructure
3. **Dynamic Configuration**: Test configuration is loaded in `retryableBefore` hooks
4. **Flexible Setup**: Easy to add new configurations by updating the YAML file

## Running Tests

### Run All Test Suites
```bash
npx cypress run --spec "frontend/src/__tests__/cypress/cypress/tests/e2e/lmEval/testLMEval.cy.ts"
```

### Run Only Smoke Test (Dynamic Setup)
```bash
npx cypress run --spec "frontend/src/__tests__/cypress/cypress/tests/e2e/lmEval/testLMEval.cy.ts" --env grepTags="@Smoke"
```

### Run Only Sanity Test (Static Setup)
```bash
npx cypress run --spec "frontend/src/__tests__/cypress/cypress/tests/e2e/lmEval/testLMEval.cy.ts" --env grepTags="@Sanity"
```

### Run All LMEval Tests
```bash
npx cypress run --spec "frontend/src/__tests__/cypress/cypress/tests/e2e/lmEval/testLMEval.cy.ts" --env grepTags="@LMEval"
```

## YAML Files

- `minio-static.yaml` - MinIO deployment with pre-baked models
- `minio-dynamic-download.yaml` - MinIO deployment for dynamic model downloads
- `inferenceservice-static-qwen.yaml` - InferenceService for static setup
- `inferenceservice-dynamic-tinyllama.yaml` - InferenceService for dynamic setup
- `test-config.yaml` - Configuration file defining all test setups

## Extending the Tests

To add a new test configuration:
1. Add a new section to `test-config.yaml`
2. Use the existing test architecture in `testLMEval.cy.ts`
3. No code changes needed - just configuration updates

## Benefits

1. **Unified Approach**: Single test file covers multiple setups
2. **Configuration Driven**: Easy to add new setups via YAML
3. **Tag-Based Filtering**: Run specific test suites using tags
4. **Maintainable**: Centralized configuration reduces duplication
5. **Flexible**: Easy to extend with new model configurations
6. **No Hardcoded Values**: All configuration comes from YAML files
7. **Reusable Utilities**: Uses shared utility functions for setup and cleanup
8. **Dynamic Loading**: Configuration is loaded at runtime, not hardcoded

## Troubleshooting

### Common issues:
- **"Local chat completion" not working**: Use "Local completion" for tasks requiring loglikelihood evaluation
- **Task failures**: Ensure the model supports the selected task type
- **Memory pressure**: Check resource allocations
- **Timeout issues**: Adjust lmEvalTimeoutSeconds in the configuration
