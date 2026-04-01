# Changelog

All notable changes to the Gen AI package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [v3.4.0] - Llama Stack 0.7.0 release

### Breaking Changes

- Renamed `agents` API to `responses` in LlamaStack config schema and providers
- Renamed provider `inline::meta-reference` to `inline::builtin` (responses)
- Renamed provider `inline::rag-runtime` to `inline::file-search` (tool_runtime)
- Removed `tool_groups` from registered resources
- Replaced config field `image_name` with `distro_name`

### Changed

- `AddAgentProvider()` Go function renamed to `AddResponsesProvider()`
- Responses provider now includes persistence config (`agent_state` namespace) with write queue tuning (`max_write_queue_size: 10000`, `num_writers: 4`)
