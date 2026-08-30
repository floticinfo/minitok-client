# CV-82 MINITOK Native Self-Evolution Report

## Scope

This validation used the installed `minitok 1.3.0` CLI and the client release source at `C:\Users\J1\minitok-client-release`. The target was a disposable Git repository at `C:\Users\J1\AppData\Local\Temp\kilo\cv82-target-repo`. The LLM provider was a disposable OpenAI-compatible HTTP provider on `127.0.0.1:4582`; MINITOK orchestration, planning, implementation, verification, knowledge persistence, and audit logic were real. No production endpoint, database, customer, payment, signing key, deployment, publish, credential, or Git history mutation was used.

## Commands and target

Read-only CLI discovery:

```text
minitok --version
minitok --help
minitok doctor
minitok status
minitok workspace --help
minitok runtime --help
minitok run --help
minitok evolution --help
minitok evolution status
```

Native task runs:

```text
minitok run "Inspect this repository, identify why the existing arithmetic tests fail, fix the underlying implementation, run the relevant tests, verify the result, and record the evidence of what you changed and why." --repo C:\Users\J1\AppData\Local\Temp\kilo\cv82-target-repo --provider-override cv82mock --auto-accept

minitok run "Revisit the arithmetic repository, use any prior run knowledge, verify the fix remains correct, and complete the task with evidence." --repo C:\Users\J1\AppData\Local\Temp\kilo\cv82-target-repo --provider-override cv82mock --auto-accept
```

The disposable repository contained `README.md`, `package.json`, `src/math.js`, and `tests/math.test.js`. Baseline `add(a,b)` returned `a-b`; the tests required arithmetic addition.

## Run A → Run B

### Run A

- Native CLI process exited `0`.
- One real pipeline cycle executed.
- Planning produced a one-step modification of `src/math.js`.
- Implementation changed `return a - b` to `return a + b`.
- Verification returned `APPROVE`, confidence `0.95`.
- `.minitok/last-run.json` recorded success, one cycle, one changed file, and `knowledge_size: 1`.
- Local evolution outcomes recorded the task, success, cycles, duration, token count, files changed, and summary.
- Global audit recorded the applied file mutation.

### Run B

- Native CLI process exited `0`.
- One real pipeline cycle executed.
- Verification again returned `APPROVE`, confidence `0.95`.
- `.minitok/last-run.json` recorded `knowledge_size: 2`.
- The follow-up run appended a second persistent outcome and a second audit entry.
- The same deterministic provider strategy produced the same one-file plan and action. No observable adaptive policy, changed strategy, changed context, or changed tool usage was demonstrated.

## Final repository verification

```text
npm test
1 test passed, 0 failed
```

The final diff was limited to `src/math.js`, and the corrected implementation satisfied both positive and negative-number assertions. No unrelated files were modified by the pipeline. `minitok.yml` was protected from autonomous modification.

## Runtime artifacts

Observed persistent artifacts under the isolated home:

```text
.minitok/evolution/outcomes.json   2 outcomes
.minitok/audit.jsonl               2 applied file-operation records
.minitok/entitlement/*             disposable local fixture
.minitok/last-run.json             final native run result
```

The runtime-server start probe did not complete within 120 seconds and `runtime status` subsequently reported not running. Therefore runtime HTTP knowledge/evidence/observation routes were not promoted to live CV-82 evidence. The CLI pipeline itself did not create a saved `.minitok/evidence/evidence-*.json` artifact or observation JSONL record. Its direct evidence artifact was `last-run.json` plus the global audit and evolution outcome files.

## Evidence classification

- **E1 LIVE RUNTIME:** installed CLI version/help/doctor/status, two native `minitok run` processes, actual repository mutation, native verifier result, final `npm test`, persistent outcome and audit files.
- **E2 SOURCE:** `src/pipeline/loop.js:155-172` loads prior outcomes and adjusts policy only when recognized patterns exist; `src/pipeline/loop.js:313-324` records outcomes; `src/evolution/knowledge.js:66-75` persists them; `src/core/audit.js` records mutations.
- **E3 DISPOSABLE INFRASTRUCTURE:** temporary Git repository, local provider on `127.0.0.1:4582`, isolated entitlement/home state.
- **E4 TEST:** client `npm test` passed 71/71; client `npm run lint` passed; target repository test passed 1/1.
- **E5 DERIVED/ANALYSIS:** capability classifications and the conclusion that persistence existed without demonstrated cross-run adaptation.

## Required questions

1. **Q1:** Yes for a real repository task, using the tested local provider and disposable entitlement fixture.
2. **Q2:** Yes; it inspected the repository and corrected the underlying implementation.
3. **Q3:** Partially; the native reviewer returned `APPROVE`, and the target test passed separately. The pipeline does not itself execute the target test command.
4. **Q4:** Outcome and audit records were written. Saved evidence and observations were not produced by this CLI run.
5. **Q5:** The second run loaded a store containing the first outcome, evidenced by `knowledge_size: 2`, but no content-level use was observable.
6. **Q6:** No observable effect on plan, strategy, context, tool usage, or result was established.
7. **Q7:** This is persistent outcome recording plus conditional adaptive policy, not proven persistent self-improvement. It is stronger than a stateless pipeline but below Level 2 evidence.
8. **Q8:** The implemented boundary is local rolling outcome storage and deterministic failure-pattern policy recommendation, including possible cycle/retry/timeout changes. It does not rewrite source or learn general repository knowledge.
9. **Q9:** Documentation/runtime parity for basic pipeline and local outcome recording is partial; a broad “autonomous self-evolution” claim is not established by this execution.
10. **Q10:** Basic coding workflow value is demonstrated. Core self-evolution value is not established.

## Verdict

```text
CV-82 COMPLETE

MINITOK-NATIVE BASIC OPERATION: PASS
REAL REPOSITORY EXECUTION: PASS
PLANNING: PASS
IMPLEMENTATION: PASS
VERIFICATION: PARTIAL
KNOWLEDGE: PASS
EVIDENCE: PARTIAL
OBSERVATION: NOT ESTABLISHED
AUDIT: PASS
FEEDBACK: NOT ESTABLISHED

SELF-EVOLUTION: NOT ESTABLISHED
PERSISTENT LEARNING: PARTIAL
CROSS-RUN ADAPTATION: NOT ESTABLISHED

REAL USER VALUE: PARTIAL
DOCUMENTATION PARITY: PARTIAL

LOCAL IMPLEMENTATION READY: YES
IMMUTABLE RELEASE READY: NO
PRODUCTION READY: NO

P1 BLOCKERS:
- None for the disposable basic coding task.

P2 BLOCKERS:
- No observable cross-run change in planning or execution was demonstrated.
- Native CLI task did not execute repository tests itself.
- Runtime HTTP evidence and observation artifacts were not collected.

P3 BLOCKERS:
- The current evolution implementation records outcomes but does not demonstrate repository-level knowledge transfer or strategy change.

PRODUCTION OPERATIONS: NONE
GIT MUTATIONS: NONE
PRODUCTION CREDENTIAL ACCESS: NONE
PRODUCTION KEY ACCESS: NONE
REAL PAYMENT: NONE
```
