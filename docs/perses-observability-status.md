# Observability in the ODH Dashboard: Status and Challenges

## 1. Summary

The ODH Dashboard provides the web UI for Red Hat OpenShift AI. As the platform grows, teams across the product need to surface metrics -- model performance, GPU utilization, data quality, and more -- to users in meaningful ways.

To support this, the dashboard recently integrated [Perses](https://perses.dev/), an open-source declarative dashboard framework. Perses allows dashboards to be defined as structured YAML rather than hand-built in code, significantly reducing the effort to create and maintain metrics views. It is also the direction the OpenShift Console is taking for its monitoring UI through the Cluster Observability Operator.

The initial Perses integration is functional and delivered as a **Tech Preview** behind a feature flag. Two dashboards have been built: a Cluster Overview (cluster-admin-only) and a Model Deployments view. However, several important challenges have emerged:

- **Access control**: The dashboards are currently restricted to cluster admin users only. Restricted users (those with namespace-scoped access) cannot view them due to limitations in how multi-namespace metric queries are secured. This is the primary blocker for broader adoption.
- **Trade-offs**: While Perses dramatically reduces effort for standard dashboards, it introduces constraints around interactivity, upstream dependencies, and the Material UI vs PatternFly design system alignment.
- **Growing demand**: Multiple teams (Feature Store, Model as a Service, Model Serving) will need metrics capabilities. The approach we choose -- Perses, code-built, or a hybrid -- will shape how these teams onboard.

This document provides a comprehensive view of what has been built, what is missing, the trade-offs involved, and recommendations for how to move forward.

---

## 2. Current State

### 2.1 Existing Metrics Capabilities (Pre-Perses)

Before the Perses work began, the dashboard already supported several metrics views built using direct Prometheus queries and PatternFly charts:

- **Model Serving Performance** -- Request count, latency, CPU, and memory usage per inference deployment
- **NIM Metrics** -- GPU cache utilization, token counts, time-to-first-token, and request outcomes
- **Bias Metrics** -- Statistical parity difference and disparate impact ratio via TrustyAI
- **Workload Metrics** -- CPU and memory consumption for distributed workloads (Ray clusters, Jobs)
- **PVC Usage** -- Storage consumption metrics

All of these use a backend endpoint that proxies queries to the cluster's Thanos Querier, with results rendered using PatternFly Victory charts. They are **single-namespace, single-resource views** -- each shows metrics for one specific resource in one namespace at a time. They are not multi-panel dashboards.

### 2.2 Perses Integration (What Has Been Built)

The team has delivered a full Perses integration within the ODH Dashboard:

- **Perses embedding** -- The Perses dashboard rendering engine runs inside the ODH Dashboard, themed to approximate the PatternFly design system
- **Central dashboard location** -- A single "Observe & Monitor > Dashboard" page where each tab corresponds to a separate Perses dashboard
- **Two dashboards delivered**:
  - **Cluster Overview** (cluster-admin-only) -- Cluster-level metrics including node status, GPU utilization, and resource usage
  - **Model Deployments** -- Per-model metrics including request rates, latency, and GPU/CPU/memory usage
- **Dashboard-as-CRD model** -- Dashboards are defined as `PersesDashboard` Kubernetes custom resources deployed to the cluster. The Perses server watches these CRDs and serves the dashboard definitions to the UI.
- **Feature flag** -- The feature is behind the `observabilityDashboard` flag and labeled "Tech Preview"
- **Variable support** -- Namespace selector, model name filter, and cluster details (API server version, OpenShift version, infrastructure provider)
- **Visualization plugins** -- 19+ Perses visualization plugins are available, including time series charts, stat panels, gauges, tables, bar charts, pie charts, heatmaps, and more

### 2.3 Where Metrics Live: Central Dashboards vs Embedded In-Context

An important emerging question is _where_ metrics appear in the UI. Today's Perses integration provides a central dashboard page, but new use cases are shifting toward metrics embedded within other pages.

**Central Dashboard (what exists today)**

The current implementation provides a dedicated "Observe & Monitor > Dashboard" section. Each tab is a separate `PersesDashboard` CR -- when new dashboard CRs are deployed to the cluster, they automatically appear as new tabs in the UI. This is designed for **operational overview** -- some dashboards (such as the Cluster Overview) are cluster-admin-only, while others (such as Model Deployments) are intended to be accessible to all users, though restricted user access is not yet available.

A use case that has been discussed is the ability for dashboard admins to create custom dashboards for their users that would appear in the UI. This has not been pursued as a user feature and whether it becomes a priority is still to be determined.

**Embedded Metrics (emerging need)**

Teams increasingly want to show metrics **within other pages** -- in side panels, detail views, or inline on deployment and model pages. Perses does support [embedding individual panels](https://perses.dev/perses/docs/embedding-panels/) in other React pages, so this is technically possible.

However, if the surrounding page is already being built in code, embedded Perses panels may not be the best fit. Coded metric panels can offer tighter integration with the surrounding page context -- responding to page state, driving navigation, and interacting with other UI elements in ways that are more natural in code. This consideration is important for the hybrid approach discussed in Section 3.

---

## 3. Approaches to Metrics Visualization

There are two fundamental approaches to building metrics views, and both are currently in use within the dashboard. This section presents each with honest trade-offs.

### 3.1 Approach A: Declarative Dashboards (Perses)

In this approach, dashboard authors write a single YAML definition following a prescribed schema. No frontend code is required per dashboard. Panels, queries, variables, and layout are all defined in a structured format, and the Perses rendering engine handles visualization automatically.

**Advantages:**

- Far less work to create a new dashboard compared to building one from scratch in code
- Built-in support for time series charts, stat panels, tables, gauges, variables, and time range controls
- Dashboards are deployed as Kubernetes CRDs alongside the product, making them versionable and declarative
- Aligns with the direction the OpenShift Console is taking for its monitoring UI (Cluster Observability Operator)

**Trade-offs:**

- **Constraints on what is possible.** Dashboards are limited to what the Perses plugin ecosystem supports. When teams need something beyond what existing plugins offer, common Perses plugins must be built or extended to support all consumers.

- **Interactive behaviors require extra effort.** UX mockups often include interactive elements such as table rows that open side panels, drill-down links, or contextual actions. In Perses, these interactions require special treatment within the declarative schema -- potentially custom plugins, hooks, or creative approaches like URL hash updates that the surrounding page reacts to. Solutions likely exist for most interactions, but they require more thought and implementation time compared to writing the same behavior directly in code.

- **Upstream dependency on the Perses project.** Core Perses components (tables, charts, etc.) are maintained by the upstream Perses project. When enhancements are needed -- for example, data link support was only recently added to the table component -- they must either be contributed upstream and waited on, or worked around locally. This creates a dependency on the upstream project's priorities and release cadence.

- **Material UI, not PatternFly.** Perses is built on Material UI components, not PatternFly. The current integration applies theming to approximate the PatternFly look and feel, but it is not native PatternFly. The Cluster Observability Operator team is working on improving PatternFly alignment in Perses. Custom plugins _can_ be built using PatternFly directly, but the core Perses chrome (toolbars, variable selectors, layout) remains MUI-based.

### 3.2 Approach B: Code-Built Dashboards

In this approach, teams write code to fetch metric data and render custom panels using PatternFly components. This is the method used by all existing pre-Perses metrics views (model serving performance, bias metrics, workload metrics, PVC usage).

**Advantages:**

- Fully flexible -- teams can build dashboards with specific designs and functionality tailored to their exact use case
- Interactive behaviors (side panels, drill-downs, contextual actions) are straightforward to implement
- Native PatternFly components ensure design system alignment
- No dependency on upstream Perses releases

**Trade-offs:**

- **Significantly more development work per dashboard.** Each team builds its own metrics views, which can diverge in look, feel, and behavior. While PatternFly provides a common design foundation, there is no guarantee of consistency across teams. That said, AI-assisted development can significantly lessen this gap -- generating boilerplate, scaffolding dashboard layouts, and producing query logic from examples or shared patterns.

- **Shared components require their own investment.** A set of shared, reusable metric components could improve consistency even without Perses, but building and maintaining that shared library is its own effort.

### 3.3 Either Way: Common Components Are Needed

Whether we use Perses or not, a common set of components and patterns is desirable for code sharing and UX alignment. The question is where the investment goes:

- **With Perses** -- Investment goes into common Perses plugins that all teams share. Teams can build and contribute their own plugins to the common set, so the observability team is not a hard blocker. However, there is a coordination cost: plugins must be integrated and deployed together. Today, adding a custom plugin requires building and maintaining a custom Perses image because each plugin has a Go (golang) component used for schema validation on the server side. Perses is working toward a runtime plugin system that would remove this requirement, but it is not yet available.

  An alternative under consideration is to forgo creating `PersesDashboard` CRs and instead keep dashboard definitions static in code. The Perses rendering engine can still render from a dashboard definition without the CRs being sent to the Perses backend API. In this model, custom visualization plugins are purely frontend contributions -- no Go component is needed for schema validation, since the backend never validates the dashboard. This gives teams more freedom to create custom plugins without the overhead of maintaining a custom Perses image.

- **Without Perses** -- Investment goes into a shared PatternFly component library for metrics. The bottleneck becomes adoption discipline -- teams are free to move independently but may diverge in design, behavior, and quality. Consistency depends on voluntary alignment.

- **Hybrid** -- Some dashboards (standard operational views) use Perses for quick, consistent delivery; some (highly custom domain-specific views) use code for full flexibility. This requires maintaining both paths but gives teams the right tool for the job.

### 3.4 Mixing Data from Different Sources

Beyond Prometheus, upcoming features will require data from additional sources -- for example, the Kubernetes API for cluster state, and DQM (Data Quality Metrics) for Feature Store. In a code-built approach, these are simply REST calls to the relevant endpoints, straightforward to implement. In Perses, each new data source requires creating a new datasource plugin implementation that conforms to the Perses datasource interface. This is additional work per source, though it is the mechanism Perses provides for exactly this purpose.

Beyond data sources, the complexity grows as views become more interactive. Features like custom table cells, contextual side panels, drill-down navigation, and novel visualizations all require careful API design within Perses' declarative schema -- each interaction must be expressible through the schema's constraints, which often means designing new plugin interfaces or finding workarounds within the existing model. In code, these are standard React patterns with no schema constraints. The same applies to mixing data from multiple sources in a single view: in code, it is straightforward to fetch from several endpoints and combine the results; in Perses, each source needs a conforming datasource plugin.

**The more interactive and cross-source a view needs to be, the stronger the case for code-built panels.**

### 3.5 Important Distinction

Regardless of the visualization approach chosen, Perses solves only the **dashboard composition** problem -- how dashboards are defined, rendered, and interacted with. The **metrics security** problem (RBAC, multi-namespace access) is a separate challenge that affects both approaches equally and is covered in the next section.

---

## 4. The RBAC Challenge: Cluster Admin Users vs Restricted Users

This section describes the most significant open problem facing observability in the dashboard.

**Terminology:**

- **Cluster admin users** have full cluster-level access and can query metrics across all namespaces without restriction.
- **Dashboard admin users** are administrators of an RHOAI deployment. They may not have cluster-level access but manage the dashboard configuration and user experience for their organization.
- **Restricted users** have access limited to specific namespaces. Metrics are treated as sensitive data, so users must only see metrics for namespaces they are authorized to access.

### 4.1 The Problem

UX designs called for dashboards that show metrics across multiple namespaces simultaneously. A user with access to several projects should be able to see an aggregated view of their model deployments without switching between namespaces one at a time. The Perses implementation proceeded with the assumption that the underlying platform supported this for all users.

The reality is different. There are two Thanos Querier endpoints available on the cluster:

- **Cluster-scoped (non-tenancy) endpoint** -- Accessible only to cluster admin users. Queries can span all namespaces with no restrictions. This is the endpoint used by the current Perses data source configuration.
- **Tenancy endpoint** -- Designed for restricted users. Requires one or more namespace query parameters in the request URL, ensuring queries are scoped to namespaces the user has access to.

The RHOAI platform does not currently provide the tenancy Thanos Querier as a data source for Perses. The Perses data source is configured against the cluster-scoped endpoint, which is only accessible to cluster admin users. Furthermore, the Perses data source plugin does not currently support passing the additional namespace query parameters that the tenancy endpoint requires.

As a result, the Perses dashboards are currently **restricted to cluster admin users only**. Restricted users cannot access the Perses dashboards at all. This is the primary blocker for broader adoption and GA graduation.

### 4.2 Options for Restricted Users

**Proposed approach: Multi-namespace access via kube-rbac-proxy**

The supported mechanism for multi-namespace access is to pass multiple namespace query parameters to the tenancy Thanos Querier endpoint. The kube-rbac-proxy handles authorization by performing a SubjectAccessReview (SAR) for each namespace in the request, ensuring the user has access to every namespace included in the query.

This is not a custom solution -- it is the standard kube-rbac-proxy behavior. However, there are performance considerations: each namespace in the request triggers a separate SAR check, so the cost scales linearly with the number of namespaces. There is also a risk of query length limits as the number of namespace parameters grows -- the Cluster Observability Operator team has noted this as an issue with Loki. If performance becomes a problem, a fallback to single-namespace-at-a-time viewing may be necessary.

Alternative methods to achieve similar multi-namespace queries would require further investigation.

**Perses-specific blocker:** The Perses data source plugin does not natively support passing additional query parameters (such as the namespace parameters required by the tenancy endpoint). This needs to be resolved -- either through changes to the Perses data source plugin or a custom data source implementation. There is no clear solution yet. This blocker applies only to the Perses path; the code-built approach can use the dashboard backend endpoint directly, where adding multi-namespace support is straightforward (see Recommendation 8.2).

### 4.3 Cluster-Admin-Only Dashboards

For dashboards that are only available to cluster admin users (such as the Cluster Overview), these can be configured to use the cluster-scoped Thanos Querier data source directly, giving full cross-namespace visibility with no restrictions. Dynamically switching data sources based on the user's role within the same dashboard is not currently a known capability in Perses -- so admin-only dashboards and restricted-user dashboards would need to target different data sources in their configuration.

---

## 5. Data Sources and Architecture

### 5.1 Data Source Landscape

- **Prometheus / Thanos** -- The primary metrics source today. Thanos Querier aggregates metrics from in-cluster Prometheus instances. Two access modes exist: cluster-scoped (for cluster admin users) and namespace-tenancy (for restricted users).

- **Perses Server** -- Runs as a service in the monitoring namespace. Watches `PersesDashboard` CRDs in Kubernetes and serves dashboard definitions to the UI. Also proxies metric queries to Thanos Querier on behalf of the dashboard.

- **Kubernetes API** -- Needed for cluster state information (node status, resource allocations). Required by upcoming features.

- **DQM (Data Quality Metrics)** -- Required by the Feature Store for statistical and data quality metrics. A new data source that does not exist in the current metrics infrastructure.

### 5.2 Platform-Provided Data Science Data Sources

The RHOAI platform team is creating data science-specific data sources backed by their own Prometheus instance, separate from the cluster Prometheus/Thanos used today. These are purpose-built for data science workloads and will be the primary source for new metrics as the platform grows.

These data sources will be exposed in two ways:

- **As Perses data sources** -- available for use in Perses dashboards through the standard Perses data source mechanism
- **As direct endpoints** -- accessible for non-Perses querying by any UI component

For the Perses path, these data sources are consumed natively -- no additional dashboard work is required beyond referencing them in dashboard definitions.

For the code-built path, the dashboard must proxy requests to these new endpoints. The browser cannot call them directly. This means adding new REST endpoints to the existing Node.js backend to proxy queries to each new data source. A BFF (backend-for-frontend) layer could also serve this role, but one does not currently exist for the dashboard core -- the Node.js backend is the only server-side component today.

This is an important trade-off to consider alongside Recommendation 8.1 (pause Perses for new work). Pausing Perses does not eliminate backend work -- it shifts it from "configure a Perses data source" to "build and maintain proxy endpoints in the dashboard backend." Each new platform data source requires this investment on the code-built path.

### 5.3 Data Flow

There are two paths for metrics data to reach the user's browser:

**Perses path** (used by observability dashboards):

> Browser --> ODH Dashboard Backend (proxy) --> Perses Server --> Thanos Querier --> Prometheus

Authentication tokens are forwarded through the entire chain.

**Direct path** (used by pre-Perses metrics views):

> Browser --> ODH Dashboard Backend --> Thanos Querier --> Prometheus

This path is simpler and is used by all existing model serving, bias, workload, and PVC metrics.

### 5.4 Future Data Source Considerations

Perses has built-in support for some datasource types beyond Prometheus (Loki for logs, Tempo for traces, Pyroscope for profiling). However, new sources like the Kubernetes API and DQM would require custom Perses datasource plugin implementations. In a code-built approach, these are standard REST calls to the relevant endpoints.

---

## 6. What Other Teams Need from Observability

Multiple teams across the product have emerging or growing needs for metrics visualization:

- **Model Serving** -- Already has per-deployment metrics views; may want richer dashboards with drill-downs, comparison views across multiple deployments, and aggregated service health.

- **Feature Store (upcoming)** -- Will need statistical metrics and data quality metrics. These involve a new data source (DQM) and new visualization types that do not exist in the current dashboard.

- **Model as a Service (upcoming)** -- Will need service-level metrics across multiple model endpoints, likely spanning namespaces.

- **General pattern** -- More teams will want to add domain-specific metrics as the platform grows. They need either a low-effort declarative approach (Perses) or a shared component library that reduces per-dashboard effort (code-built). The approach chosen in Section 3 directly affects how quickly and consistently these teams can onboard.

---

## 7. Open Issues

A consolidated list of gaps and unknowns, grouped by category. Details for each item are covered in the referenced sections.

**RBAC and access (see Section 4)**

- Restricted users have no access to Perses dashboards today. This is the primary blocker for GA.
- The namespace dropdown in dashboards uses a workaround -- a static list of the user's known projects instead of querying Prometheus for available namespaces -- to avoid requiring broad access. This works but is a deviation from standard Perses behavior.

**Perses-specific concerns (see Section 3)**

- The Perses API client code is vendored from the OpenShift monitoring plugin. Ideally this code would be shared with the OpenShift Perses monitoring plugin to reduce duplication and maintenance burden, though this is not a hard requirement.
- Plugin deployment currently requires building a custom Perses image. A frontend-only alternative (declarative dashboard instances in code, no CRDs) is being evaluated that could eliminate this requirement.

**Strategy decisions not yet made (see Sections 2.3, 3)**

- There is no established pattern for showing metrics embedded in other pages (outside the central dashboard). Teams need guidance on when to use Perses embeds vs coded panels.
- Runtime dashboard creation by dashboard admins has not been fully designed. Whether this remains a valid use case is still to be determined.

---

## 8. Recommended Options

### 8.1 Option 1: Move Away from Perses -- Code-Built Dashboards

This option discontinues the use of Perses and moves all metrics visualization to code-built PatternFly dashboards.

**Rationale:** The cost of building custom plugins into a custom Perses image is too heavyweight for teams to adopt at this time. Even with the workaround of forgoing CRs and using frontend-only plugins (see Section 3.3), every panel must express its visualization through a declarative schema -- which adds complexity for the kinds of interactive, data-rich visuals that are often easier to build directly in code. A recent issue where theme styles are not properly passed to the underlying ECharts library used by Perses for chart rendering -- requiring an enhancement request upstream to fix -- further illustrates the challenges of depending on upstream for visual consistency.

**What this requires:**

- **Enhance the backend metrics endpoint.** The existing dashboard backend metrics endpoint should be enhanced to support multiple namespace parameters against the tenancy Thanos Querier. This enables restricted users to view metrics across the namespaces they have access to, without the Perses data source plugin limitations described in Section 4.

- **Enable team contributions to the central dashboard.** A new dashboard extension should be created that allows teams to add their own tabs to the "Observe & Monitor" page. The current page includes a top-level time range filter that was built to support Perses. Without Perses, this filter needs to be converted so that non-Perses tabs can make use of its values.

- **Convert existing Perses dashboards.** The two dashboards already built with Perses (Cluster Overview and Model Deployments) would need to be rebuilt using PatternFly components and the enhanced backend metrics endpoint. This eliminates the Perses-specific RBAC blocker and gives full flexibility to match UX designs, but requires development effort to recreate what already exists.

### 8.2 Option 2: Continue with Perses -- Without CRDs, With Custom Frontend Plugins

This option continues to use Perses but changes the deployment model. Instead of creating `PersesDashboard` CRs, dashboard specifications are coded directly into the UI. Custom visualization plugins are built as frontend-only contributions -- no Go backend component, no custom Perses image. This can be considered a temporary approach until Perses enables support for runtime plugins, at which point the custom image concern goes away.

**What this involves:**

- **Dashboard definitions in code.** Rather than deploying `PersesDashboard` CRs to the cluster, dashboard specifications are maintained as static definitions in the UI codebase. The Perses rendering engine can render from these definitions without the CRDs being sent to the Perses backend API.

- **Custom frontend-only plugins.** Development effort goes into creating custom Perses plugins that align with UX designs as much as possible while fitting within the constraints of the Perses declarative schema. This gives benefits from both approaches -- less per-dashboard effort than fully code-built, more flexibility than stock Perses plugins. However, not everything UX may request will be achievable within Perses' limitations, and all behavior must be expressible through the declarative schema.

- **Panel embedding for metrics reuse.** Perses panel embedding is enabled so that metrics panels can be reused in other pages (detail views, side panels, etc.). Pages that embed Perses panels are still free to use coded metrics visuals alongside them, including the existing Prometheus endpoint for custom queries.

- **Custom data sources for non-Prometheus queries.** Teams that need to query beyond Prometheus within Perses dashboards must build and maintain custom Perses data source plugins. For their own coded pages outside the central dashboard, teams are free to fetch data however they choose.

- **Backend endpoint enhancement (where needed).** If custom coded solutions on those pages need access to metrics across multiple namespaces at once, the backend metrics endpoint enhancement described in Option 1 would also apply here.

- **Optional: Allow fully coded tabs alongside Perses dashboards.** The central dashboard page could support both Perses tabs and fully code-built tabs via the same extension mechanism described in Option 1. This is low development effort and would give teams a blank canvas to build dashboards however they want -- just like Option 1 -- while still keeping Perses dashboards for the use cases where they fit. Whether to support this hybrid within the central dashboard is an open question.

## 9. Open Questions

1. **Runtime extensibility** -- Do we need to support dashboard admins adding custom dashboards to their RHOAI deployments at runtime? This is the strongest remaining argument for Perses -- if it is a valid use case, Perses provides a natural mechanism for it through its CRD-based dashboard model. If not, the argument for continued Perses investment weakens significantly. This must be answered before a final direction is set.
