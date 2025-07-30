# LMEval Test Configuration

This directory contains tests for LMEval functionality with different model serving setups.

## Test Files

- `testLMEvalStatic.cy.ts` - Tests using pre-baked models in storage for faster execution
- `testLMEvalDynamic.cy.ts` - Tests using models that are downloaded during deployment

## Test Suites

### Static Test (Pre-baked Models)
- **File**: `testLMEvalStatic.cy.ts`
- **Purpose**: Tests using pre-baked models already available in MinIO, skipping download
- **Models**: Pre-baked models (e.g., Qwen) are already available in storage for faster tests
- **Tokenizer**: Points to bert-base-uncased for compatibility with larger models
- **Performance**: Provides faster test execution but requires more storage resources
- **Model**: `qwen-isvc` with optimized configuration

### Dynamic Test (Downloaded Models)
- **File**: `testLMEvalDynamic.cy.ts`
- **Purpose**: Tests using models that are downloaded by vLLM when the container starts
- **Models**: vLLM downloads the model (gpt2) automatically when it sees the `--model=gpt2` argument
- **Pipeline**: Tests the full model deployment pipeline including download and initialization
- **Tokenizer**: Points to tiny-untrained-granite for compatibility with small models
- **Model**: Uses gpt2 which is vLLM-compatible and has a smaller footprint than larger models
- **Model Name**: `tinyllm` (gpt2)

## YAML Files

- `minio-static.yaml` - MinIO deployment with pre-baked models
- `minio-dynamic-download.yaml` - MinIO deployment for dynamic model downloads
- `inferenceservice-static-qwen.yaml` - InferenceService for static setup
- `inferenceservice-dynamic-tinyllama.yaml` - InferenceService for dynamic setup
- `test-config.yaml` - Configuration file defining all test setups

## Important Notes

- Both tests use `Local completion` instead of `Local chat completion` because the "wnli" task uses "loglikelihood" evaluation which requires the "completions API"
- The "chat completions API" doesn't support "loglikelihood" evaluation
- Security settings: Both tests use `Available Online = true`, `Trust Remote Code = true`

## Test Tags

> **Note**: Test tags are defined in the test files themselves and may change over time.
> For the most current tag information, please refer to the actual test files:
> - `testLMEvalStatic.cy.ts` - Check the `describe` and `it` blocks for current tags
> - `testLMEvalDynamic.cy.ts` - Check the `describe` and `it` blocks for current tags
