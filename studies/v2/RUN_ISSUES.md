# v2 full-run issues

This log records issues discovered while preparing and running the 20-development / 40-test v2 study. Resolved entries remain visible for traceability.

## V2-001 — Candidate files are schema-updated, not content-regenerated

- Stage: input comparison
- Result: the current 20-candidate development file and 40-candidate test file have the same SHA-256 hashes as the v1 snapshot.
- Interpretation: the current files contain the clarified schema and field names, but candidate evidence and split membership were not regenerated.
- Impact: v2 expands the evaluated annotation scope; it is not a new candidate sample.
- Status: documented.

## V2-002 — Pinned Semantic Python environment is not executable

- Stage: development-method reproduction
- Result: the project-local `.venv` points to a Python installation that is no longer present, and no system Python installation is available.
- Additional finding: the archived Semantic output records the pre-field-migration development-file hash, so it cannot be presented as a fresh run on the current file even though candidate values were documented as unchanged.
- Initial handling rejected: inheriting the v1 choice would not satisfy the requested from-scratch v2 method-selection workflow.
- Resolution: created a separate Python 3.12.14 v2 environment, installed the pinned Semantic package stack, reused only the frozen model files, and generated a fresh Semantic result from the current development file.
- Status: resolved; the final v2 method comparison uses newly generated current-input outputs for all methods.

## V2-003 — Initial workflow inherited the v1 method choice

- Stage: workflow interpretation
- Result: the first temporary v2 attempt inherited `tfidf + mean_all` from v1 and proceeded directly to full-test evaluation.
- Impact: that attempt did not meet the requested 0-to-1 rerun including method selection.
- Resolution: the temporary configuration and results were discarded before project/GitHub publication; the final workflow reruns development method selection before any accepted test evaluation.
- Status: resolved; retained for traceability.

## V2-004 — Official package download timed out

- Stage: isolated Semantic environment setup
- Result: the official package source timed out while downloading the 216 MB CPU PyTorch wheel.
- Resolution: installed the exact requested package versions from the Tsinghua PyPI mirror, then verified imported versions, CPU-only execution, and CUDA absence before running Semantic.
- Impact: none on the frozen package versions or method logic.
- Status: resolved; retained for traceability.
