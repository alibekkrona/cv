# Assurance Reference Implementation

This directory is a complete, runnable, public-safe implementation of the core
Assurance Engine concepts described in the project README.

It is deliberately more substantial than a collection of isolated snippets:
the modules form one execution path and the tests exercise the boundaries
between business conclusions, technical classification, governed recovery, and
verified learning.

It does not publish employer source code, operational targets, credentials,
production URLs, or private scan evidence.

## Run

The implementation uses only the Node.js standard library.

```bash
npm run demo
npm test
```

The demo begins with a source and lobby that are reachable while the requested
category is unresolved. A verified category route from the profile is selected,
approved by policy, executed, and accepted only because the resulting evidence
improves.

## Module Map

### Business Assessment

- [`model/AssuranceAssessment.js`](model/AssuranceAssessment.js) derives the
  business verdict and ordered evidence milestones.
- [`model/EvidenceScore.js`](model/EvidenceScore.js) compares evidence before
  and after a recovery attempt.

### Classification And Capabilities

- [`registry/ConditionRegistry.js`](registry/ConditionRegistry.js) classifies
  technical conditions and assigns disposition and ownership.
- [`registry/CapabilityRegistry.js`](registry/CapabilityRegistry.js) maps
  recurring conditions to reusable recovery or manual capabilities.

### Pipeline Gates

- [`pipeline/AssuranceGate.js`](pipeline/AssuranceGate.js) prevents expensive
  product search before source, lobby, and category evidence are proven.
- [`pipeline/AiInputPolicy.js`](pipeline/AiInputPolicy.js) bounds downstream AI
  input and distinguishes policy rejection from product absence.

### Decision And Policy

- [`strategy/DeterministicAdvisor.js`](strategy/DeterministicAdvisor.js)
  selects a capability only when profile evidence supplies exact inputs.
- [`policy/ResolutionPolicy.js`](policy/ResolutionPolicy.js) validates
  condition applicability, confidence, host allowlists, market allowlists, and
  verified category routes.

### Execution And Learning

- [`execution/ControlledExecutor.js`](execution/ControlledExecutor.js) injects
  the real attempt executor and accepts success only when evidence improves.
- [`profile/ProfileFeedback.js`](profile/ProfileFeedback.js) learns only from
  policy-approved, evidence-verified outcomes.

### Business Target And Orchestration

- [`promotion/PromotionTarget.js`](promotion/PromotionTarget.js) validates a
  time-bounded business expectation and produces a scan request.
- [`orchestration/ResolutionOrchestrator.js`](orchestration/ResolutionOrchestrator.js)
  connects assessment, registries, advice, policy, execution, and feedback.

### Demonstration And Fixtures

- [`fixtures/contexts.js`](fixtures/contexts.js) contains neutral verified,
  unresolved, and unavailable-source scenarios.
- [`demo.js`](demo.js) runs the complete recovery flow.

### Tests

- [`tests/assessment.test.js`](tests/assessment.test.js) checks verdict and
  condition semantics.
- [`tests/pipeline.test.js`](tests/pipeline.test.js) checks assurance and AI
  gates.
- [`tests/resolution.test.js`](tests/resolution.test.js) checks approved
  recovery, policy blocking, and human-review fallback.

## Execution Flow

```text
PromotionTarget
  -> scan context
  -> AssuranceAssessment
  -> ConditionRegistry
  -> CapabilityRegistry
  -> DeterministicAdvisor
  -> ResolutionPolicy
  -> ControlledExecutor
  -> EvidenceScore comparison
  -> ProfileFeedback
  -> final business verdict
```

## Important Property

An action returning without throwing is not considered successful.

Success requires:

```text
policy approved
+ executor attached
+ retry completed
+ evidence comparison passed
= verified recovery
```

This prevents a retry, model recommendation, or browser action from silently
being treated as proof.
