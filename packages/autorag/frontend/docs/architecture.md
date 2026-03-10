# AutoRAG UI Architecture

## Overview

The AutoRAG UI is a React application that provides a user interface for configuring and running AutoRAG (Automatic Retrieval-Augmented Generation) experiments. It integrates with Kubeflow Pipelines via a Go BFF (backend-for-frontend) and is built with React 18, TypeScript, and PatternFly.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Pages (AppRoutes)                                          │
│  AutoragExperimentsPage | AutoragCreatePage | ...           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Components                                                  │
│  AutoragExperiments | AutoragRunsTable | AutoragCreate | ...│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Hooks                                                      │
│  usePipelineRuns | usePipelineDefinitions | ...             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  API (pipelines.ts)                                         │
│  getPipelineRunsFromBFF | getPipelineDefinitions             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  BFF (Go) - packages/autorag/bff                            │
│  /api/v1/pipeline-runs | /api/v1/pipeline-runs/:runId       │
└─────────────────────────────────────────────────────────────┘
```

## Routes

| Path                                  | Page                   | Description                      |
| ------------------------------------- | ---------------------- | -------------------------------- |
| `/`                                   | Redirect               | Redirects to `/experiments`      |
| `/experiments/:namespace?`            | AutoragExperimentsPage | List experiments (pipeline runs) |
| `/create/:namespace`                  | AutoragCreatePage      | Create new experiment            |
| `/configure/:namespace/:experimentId` | AutoragConfigurePage   | Configure experiment settings    |
| `/results/:runId`                     | AutoragResultsPage     | View run results                 |

## Key Components

| Component              | Purpose                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **AutoragExperiments** | Main experiments list: fetches runs, handles loading/error/empty states, renders `AutoragRunsTable` |
| **AutoragRunsTable**   | Paginated table of pipeline runs; use with `usePipelineRuns` for data                               |
| **AutoragCreate**      | Wizard for creating new experiments                                                                 |
| **AutoragConfigure**   | Configure experiment (model selection, settings)                                                    |
| **AutoragResults**     | Display run results                                                                                 |

## Hooks

| Hook                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| **usePipelineRuns**        | Fetches paginated pipeline runs from BFF; polls for updates |
| **usePipelineDefinitions** | Fetches pipeline definitions for a namespace                |

## Module Federation

The app uses Webpack Module Federation for dynamic loading and integration with the ODH Dashboard. It can run standalone or as a federated module within the main dashboard.
