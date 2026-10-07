# Model Context Protocol Integration

The project exposes the same tested taxonomy and matching logic through a Model Context Protocol server. The web app and MCP tools call the same Python application functions, so their results do not drift.

## Install and run

This optional interface is for MCP-compatible clients. To open the browser application, follow the [README quickstart](../README.md#8-run-the-prototype-and-secondary-extensions).

After completing that Windows setup, run the following from the project root, using the same environment:

```powershell
$careerVenv = Join-Path (Split-Path -Parent (Get-Location).Path) "career-decision-support-venv"
& "$careerVenv\Scripts\python.exe" -m pip install -e ".[mcp]"
```

Configure the MCP client to launch the full path to `career-mcp.exe` in that environment's `Scripts` folder. The server uses the standard `stdio` transport: the client starts it as a subprocess and communicates through its input/output streams. It does not provide a browser URL.

The equivalent command for starting the process directly is:

```powershell
& "$careerVenv\Scripts\career-mcp.exe"
```

## Tools

| Tool | Purpose |
|---|---|
| `get_job_taxonomy` | Return `role_profiles` and `role_profile_count` for the five canonical Analytical Role Profiles |
| `rank_candidate_profile` | Produce explainable Role Profile rankings and ESCO occupation evidence |
| `analyze_job_description` | Extract experimental multi-label Role Profile evidence from a JD, with abstention |
| `compare_role_profile_options` | Compare two or three Analytical Role Profiles by definition and typical tasks |
| `build_readiness_plan` | Turn evidence gaps into a three-stage preparation plan |

The current executable taxonomy uses 15 official ESCO occupations and 18 many-to-many Role Profile memberships. User-facing and research outputs use **Analytical Role Profile** consistently.

## Boundaries

- Scores are relative evidence within one model and data version, not probabilities.
- The server is for career exploration and portfolio preparation, not automated hiring.
- Protected personal attributes are not accepted by the ranking tool.
- Interest signals remain in the presentation layer and do not alter model scores.
- Years of experience and IC/manager/POC positioning do not alter Role Profile relevance scores.
- JD interpretation is a separate experimental deterministic evidence-group analysis. It is not covered by the frozen candidate-model evaluation; see [`experimental/jd_analysis/`](../experimental/jd_analysis/README.md).
