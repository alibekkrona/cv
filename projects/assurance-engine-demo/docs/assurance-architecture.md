# Assurance Architecture

## Scan Pipeline

```text
Promotion Target
  -> Access Profile
  -> VPN / market route
  -> browser navigation
  -> source and content readiness
  -> lobby verification
  -> category resolution
  -> bounded extraction
  -> optional downstream AI search
  -> Assurance Model
  -> technical classification
  -> policy-controlled resolution
  -> report and profile feedback
```

## Important Boundary

Expensive game-search AI is downstream of the Assurance Gate.

The system does not send a large HTML document to an LLM before proving that:

- the intended source loaded;
- the response is not an error or restriction page;
- the actual lobby is present;
- the requested category was resolved.

This prevents AI from trying to compensate for an invalid source.

## Extension Points

### Conditions

New recurring failures are added as reusable technical conditions.

### Capabilities

New safe responses are added as reusable capabilities with policy, executor and
evidence verification.

### Profiles

Brand-specific routes, access preferences and successful evidence remain in
profiles rather than branching the core algorithm.

### Promotion Targets

Business expectations define what should be verified. The scanner no longer
needs to monitor every product on every brand indiscriminately.

## Public Reference Implementation

The runnable code under [`examples/reference`](../examples/reference/) maps
these extension points to concrete modules:

```text
model/
  AssuranceAssessment
  EvidenceScore

registry/
  ConditionRegistry
  CapabilityRegistry

pipeline/
  AssuranceGate
  AiInputPolicy

strategy/ + policy/
  DeterministicAdvisor
  ResolutionPolicy

execution/ + profile/
  ControlledExecutor
  ProfileFeedback

promotion/ + orchestration/
  PromotionTarget
  ResolutionOrchestrator
```

The reference flow is intentionally dependency-free, so reviewers can execute
the core architecture without MongoDB, VPN, browser automation, or an LLM
server.
