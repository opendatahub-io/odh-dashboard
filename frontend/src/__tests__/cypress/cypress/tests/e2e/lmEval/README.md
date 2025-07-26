# LMEval Test Configuration

This directory contains tests for LMEval functionality with different model serving setups.

## Test Files

- `testLMEvalStatic.cy.ts` - Tests using pre-baked models in storage for faster execution
- `testLMEvalDynamic.cy.ts` - Tests using models that are downloaded during deployment

## Test Suites

### Static Test (Pre-baked Models)
- **File**: `testLMEvalStatic.cy.ts`
- **Tags**: `@Sanity`, `@SanitySet3`, `@LMEval`, `@Featureflagged`
- Uses pre-baked models already available in MinIO, skipping download
- Models (e.g., Qwen) are already available in storage for faster tests
- Tokenizer URL points to bert-base-uncased for compatibility with larger models
- Provides faster test execution but requires more storage resources
- Model: `qwen-isvc` with optimized configuration

### Dynamic Test (Downloaded Models)
- **File**: `testLMEvalDynamic.cy.ts`
- **Tags**: `@Smoke`, `@SmokeSet3`, `@LMEval`, `@Featureflagged`
- Uses models that are downloaded by vLLM when the container starts
- vLLM downloads the model (gpt2) automatically when it sees the `--model=gpt2` argument
- Tests the full model deployment pipeline including download and initialization
- Tokenizer URL points to tiny-untrained-granite for compatibility with small models
- Uses gpt2 which is vLLM-compatible and has a smaller footprint than larger models
- Model: `tinyllm` (gpt2)

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
