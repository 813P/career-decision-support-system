# Career Decision Support System

The Career Decision Support System is a research-oriented, explainable AI prototype for human-centred career exploration. It helps candidates explore analytical career directions by ranking project-defined Role Profiles from evidence about both their background and intended direction.

Rather than returning a single opaque recommendation, the system separates background fit from directional intent and surfaces the evidence behind its rankings, including occupation-level evidence, matched skills, missing evidence, and ranking provenance.

The system's key representation, ranking, and aggregation choices were developed and evaluated in [*Exploring Analytical Career Directions: Research Design and Evaluation*](https://github.com/813P/career-decision-support-system/blob/main/RESEARCH_DESIGN.md), a controlled methodological pilot.

**Study at a glance:** 5 project-defined Role Profiles, 15 reviewed ESCO occupations, 18 occupation–Role Profile memberships, 60 synthetic candidates, and 1,080 single-researcher relevance annotations. Four ranking approaches were compared on 20 development candidates; the selected configuration was frozen and evaluated on 40 held-out test candidates.

> **Selected configuration:** TF-IDF + `mean_all` aggregation + equal background/direction weighting.<br>
> **Held-out result:** membership nDCG@3 **0.6606**; Role Profile nDCG@3 **0.8981**. These are ranking metrics, not accuracy percentages.

## 1. Problem and motivation

The project began with an observation from my work in a central recruitment team at ByteDance, hiring for analytical roles across business units. It addresses two connected ambiguities:

- **Career-space ambiguity:** job titles do not map consistently to the work people actually do. Different titles can describe similar analytical work, while similar titles can represent substantially different responsibilities, making the career landscape difficult to interpret from titles alone.
- **Candidate-side ambiguity:** people starting their careers or moving into a new field may find it difficult to identify roles that fit both what they have done and what they want to do next. Transferable experience may be overlooked when their previous job titles do not clearly relate to the roles they are considering.

To address these ambiguities, the project organises analytical work into five career directions and ranks them using evidence from a candidate’s background and aspirations. As an initial evaluation of this approach, the study asks:

How closely do the resulting rankings agree with researcher relevance judgements in a controlled study using synthetic candidate profiles, and where do they disagree?

The prototype supports exploration. It does not determine a person's “best” career, predict hiring suitability, or make employment decisions.

## 2. What I designed

The system first ranks occupation–Role Profile memberships—each representing an occupation within a particular Role Profile—using two evidence channels: the candidate’s background and their desired career direction. It combines the two component scores for each membership, then aggregates the membership scores to rank the five Role Profiles.

### System and Method Pipeline

![System and method pipeline from parallel evidence representation through development-set selection, held-out evaluation, and ranked output](docs/assets/system-method-pipeline.svg)

The five **Role Profiles** are summarised below, alongside the main focus of each direction:

| Career direction | Main focus |
|---|---|
| Strategic Analysis | External change, competition, and longer-term choices |
| Business Performance & Goal Management | Targets, KPIs, performance reviews, and management action |
| Business Strategy & Focused Analysis | A defined business question, option assessment, and recommendations |
| Data Analytics | Data preparation, querying, visualisation, and interpretation |
| Data Science | Statistical modelling, machine learning, and experimentation |

The profiles connect **15 reviewed ESCO occupations** through **18 occupation–Role Profile memberships**; an occupation can contribute to more than one profile. The study uses English ESCO v1.2.1. I defined the five Role Profiles from recurring types of analytical work encountered in recruitment, then manually reviewed the selected occupations and their mappings against those profile boundaries. 

Alongside the ranked Role Profiles, the system provides three forms of explanation to help users inspect the results:

- **Score decomposition** shows the separate contributions of background fit and alignment with the candidate’s desired career direction.
- **Aggregation provenance** identifies the occupation–Role Profile memberships contributing to each profile’s score.
- **Rule-based skill prompts** highlight matched skills and potential gaps in the supplied evidence.

The skill prompts are supplementary checks, not explanations of which features caused the TF-IDF score. A missing-evidence prompt means that the system did not find the relevant evidence in the supplied text; it does not mean that the candidate lacks the ability.

## 3. Method and experimental design

The dataset contains 60 fully synthetic, non-identifying candidate records. They were drafted with AI assistance to cover all five Role Profiles and predefined candidate scenarios. The records were then validated, manually reviewed, and frozen. AI assistance was limited to drafting the candidate text; construction metadata such as intended Role Profile and scenario was excluded from ranking inputs.

The data were split with no overlap:

- **20 development candidates** supported method and configuration selection
- **40 held-out test candidates** were reserved for final evaluation

Both sets cover all five Role Profiles and multiple candidate scenarios. A single researcher assigned all **1,080 candidate–membership relevance annotations** on a 0–2 scale. Ranking outputs, scores, and construction metadata were hidden during annotation—**model-output-blinded researcher annotation**—but this was not independent, multi-rater, or double-blind validation.

Four method families were compared on development data: **Structured**, **TF-IDF**, **Semantic**, and **Hybrid**. Semantic had the highest development membership nDCG@3 point estimate (0.7533), followed by TF-IDF (0.7464). The paired 95% bootstrap interval for TF-IDF minus Semantic was `[-0.0686, 0.0499]`.

A 0.01 development nDCG@3 difference was used as a "study-specific near-tie heuristic", alongside uncertainty, reproducibility, interpretability, and implementation simplicity. TF-IDF was selected as the simpler, inspectable lexical method—not because the study demonstrated equivalence or superiority.

The final ranker computes:

> **membership score = 0.5 × background similarity + 0.5 × direction similarity**

It then averages all memberships assigned to each profile (`mean_all`). This configuration was frozen before held-out evaluation; test results were not used to retune it.

## 4. Core held-out results

The selected configuration was evaluated once on all 40 held-out test candidates.

| Evaluation level | nDCG@3 | 95% candidate-bootstrap interval | Top-1 agreement |
|---|---:|---|---:|
| 18 occupation–Role Profile memberships — primary | **0.6606** | [0.5655, 0.7533] | 0.725 |
| 5 Role Profiles — secondary | **0.8981** | [0.8480, 0.9408] | 0.900 |

nDCG@3 evaluates how well the top three results reflect human relevance labels; it is not classification accuracy. Top-1 agreement indicates whether the first-ranked result received the highest human relevance label, including ties.

Role Profile ordering showed higher agreement with the reference labels in this controlled sample, while membership-level agreement was lower. The two levels are not directly comparable measures of difficulty: they contain 5 versus 18 targets, and their human labels and model aggregation use different constructions.

## 5. Two representative failure cases

### C019 — Strongly relevant occupations ranked below unsupported ones

C019 describes a BI Analyst with dashboard, SQL, and performance-monitoring experience who wanted responsibility for targets and operating cadence. Business Performance & Goal Management ranked first, consistent with the reference labels at the profile level. Within that profile, however, budget analyst and cost analyst memberships (both with human relevance 0) ranked above data analyst (human relevance 2).

**Why it matters:** strong supporting evidence was present, but the membership ranking did not prioritise it. A plausible broad direction can therefore conceal a membership-level ordering error; users need to inspect the occupations contributing to it.

### C056 — Keyword overlap despite explicitly limited evidence

C056 describes a Model Operations Specialist who monitored production alerts and coordinated retraining tickets, and wanted to join analytical modelling projects. The record explicitly states that little evidence is available on feature choices, inference, or evaluation design. Data Science ranked first, with statistician (human relevance 0) above data scientist (human relevance 1); no membership received label 2.

**Why it matters:** TF-IDF matches words but does not reliably interpret statements that evidence is limited. This case is consistent with keyword overlap obscuring that limitation; the ranking should not be read as evidence of modelling readiness.

These held-out cases informed error analysis only; the frozen configuration was not retuned after test inspection.

## 6. Contributions and limitations

### Contributions

- A two-level formulation connecting inspectable occupational evidence to accessible career directions.
- Separate representation of demonstrated background and desired career direction.
- A controlled comparison of structured, lexical, semantic, and hybrid ranking approaches.
- Development-only configuration selection followed by frozen held-out evaluation.
- Explanation design that separates ranking-linked evidence from supplementary skill checks.
- Case-level analysis showing where broad profile agreement can conceal fine-grained errors.

### Limitations

- The study uses a small synthetic dataset and one researcher who also contributed to candidate review and target design.
- It provides no inter-rater reliability, external validation, demographic fairness assessment, or real-user outcome evidence.
- ESCO mappings and the five Role Profiles are project design choices, not a validated labour-market taxonomy.
- TF-IDF is sensitive to wording and weak at negation, low-evidence transitions, and mixed directions.
- Results support feasibility under controlled study conditions, not real-world predictive validity or production readiness.

The system is intended for exploratory, human-centred career decision support. It is not designed or validated for automated hiring, recruitment screening, candidate rejection, or autonomous high-stakes employment decisions.

## 7. Read the evidence

| Question | Authoritative source |
|---|---|
| Why was the study designed this way, and what can it claim? | [Research Design and Evaluation](RESEARCH_DESIGN.md) |
| What exactly happened in the held-out evaluation? | [Final Evaluation Report](reports/evaluation/TFIDF_FULL_TEST_EVALUATION.md) |
| How were development methods and parameters compared? | [Development Selection Report](reports/matching/DEVELOPMENT_PARAMETER_SELECTION.md) |
| How were the data generated, governed, and split? | [Data Card](docs/DATA_CARD.md) |
| How were labels assigned and kept separate from model output? | [Experiment Protocol](docs/EXPERIMENT_PROTOCOL.md) and [Annotation Guideline](docs/HUMAN_ANNOTATION_GUIDELINE.md) |
| What are the main risks and intended uses? | [Model Card](docs/MODEL_CARD.md) |
| Which cases failed, and why? | [Error Analysis](docs/ERROR_ANALYSIS.md) |
| What are the formulas and exact runtime details? | [Technical Appendix](docs/RESEARCH_TECHNICAL_APPENDIX.md) |

The [documentation index](docs/README.md) provides additional schemas, data-source policies, and repository guides. Machine-readable results are retained under [`results/`](results/) and run-specific records under [`reports/`](reports/).

## 8. Run the prototype and secondary extensions

### Start the local web application (Windows PowerShell)

Python **3.10 or later** is required; this guide uses **Python 3.12**. Internet access is needed for the first dependency installation. Node.js, Semantic dependencies, and MCP are optional and are not needed to open the web interface.

Follow the steps in the **same PowerShell window**, copying **one code block at a time**.

**1. Download, extract, and enter the project folder.**

On this GitHub page, choose **Code → Download ZIP**, then right-click the downloaded ZIP and choose **Extract All**. Open the extracted folders until you find `README.md` and `pyproject.toml` together. This is the project root.

Copy the **folder path** from File Explorer's address bar while viewing the folder containing those two files.

Open PowerShell, copy this command, and press **Enter**:

```powershell
Set-Location -LiteralPath (Read-Host "Paste the full project folder path")
```

When `Paste the full project folder path:` appears, paste the folder path **without surrounding quotes** and press **Enter** again. Wait until the `PS ...>` prompt returns before running the next command:

```powershell
Test-Path .\pyproject.toml
```

The result should be **`True`**, confirming that PowerShell is in the project folder.

**2. Check Python.**

```powershell
py -3.12 --version
```

The result should be `Python 3.12.x`. Python 3.12 can be installed from [python.org](https://www.python.org/downloads/windows/) with the Windows launcher included. An existing Python 3.10 or 3.11 installation can also run the core application: substitute its version flag in this command and in step 4.

**3. Set the environment path.**

First, get the parent of the project folder:

```powershell
$careerParent = Split-Path -Parent (Get-Location).Path
```

Then set the environment folder name:

```powershell
$careerVenv = Join-Path $careerParent 'career-decision-support-venv'
```

These two commands normally return to the PowerShell prompt without printing a result. Together they select a separate environment beside the project folder.

**4. Create the environment once.**

```powershell
py -3.12 -m venv $careerVenv
```

Wait for the PowerShell prompt to return. Successful environment creation normally prints no message.

**5. Install the project once.**

```powershell
& "$careerVenv\Scripts\python.exe" -m pip install -e .
```

Wait for installation to finish and the PowerShell prompt to return. A fresh installation normally ends with `Successfully installed ...`.

This command runs the environment's Python directly. Keep the extracted project folder in place: the editable installation reads the source and data from that location.

**6. Start the website.**

```powershell
& "$careerVenv\Scripts\career-web.exe"
```

Wait for:

```text
Career Decision Support System available at http://127.0.0.1:8765
```

Then open **[http://127.0.0.1:8765/](http://127.0.0.1:8765/)** in a browser. Keep this PowerShell window running while using the website. The prompt does not return while the service is running; press **Ctrl+C** when you want to stop it.

To try the interface, choose **Start with my experience → Load demo profile → Generate explainable results**, or the equivalent Chinese buttons. English candidate input is recommended; changing the interface language does not change ranking scores.

**Open the website again later.**

In a new PowerShell window, repeat **step 1** to enter the same project folder, **step 3** to set the environment path, and **step 6** to start the service. You do not need to download, create the environment, or install again unless you replace the project or change the environment.

<details>
<summary>Optional validation and complete Semantic/MCP tests</summary>

### Validate the frozen records and run core tests

These checks are separate from opening the website. They additionally require **Node.js 20 or later**. From the project root, with `$careerVenv` set as above:

```powershell
& "$careerVenv\Scripts\python.exe" -m pip install -e ".[dev]"
node --version
node experiments/validation/validate_candidate_data.mjs
node experiments/validation/validate_full_study.mjs
& "$careerVenv\Scripts\python.exe" -m pytest --ignore=tests/test_mcp_server.py --ignore=tests/test_role_profile_semantic_pipeline.py
node --test tests/role_profile_experiment.test.mjs
node --test tests/webapp_i18n.test.mjs
```

### Complete test suite: Semantic and MCP

The two optional-extension test modules need additional dependencies. To match the recorded Semantic runtime, use **Python 3.12.14** and a separate environment. From the project root, enter the full path to that interpreter when prompted and confirm its version before installing:

```powershell
$semanticPython = Read-Host "Paste the path to the Python 3.12.14 executable"
```

Paste the executable path without surrounding quotes and press Enter. Once the PowerShell prompt returns, run:

```powershell
& $semanticPython --version
```

Confirm `Python 3.12.14`, then run the remaining commands:

```powershell
$careerTestParent = Split-Path -Parent (Get-Location).Path
$careerTestVenv = Join-Path $careerTestParent 'career-decision-support-full-test-venv'
& $semanticPython -m venv $careerTestVenv
& "$careerTestVenv\Scripts\python.exe" -m pip install -e ".[dev,mcp]" -r requirements-semantic.txt --extra-index-url https://download.pytorch.org/whl/cpu
& "$careerTestVenv\Scripts\python.exe" -m pip check
& "$careerTestVenv\Scripts\python.exe" -m pytest -q
```

The CPU package index supplies the recorded PyTorch `2.7.1+cpu` build, which is a large download. Run installation and tests with the same environment's Python; the MCP integration test launches that interpreter as a subprocess.

The complete suite checks Semantic input filtering, score transformation and aggregation, and starts a real MCP subprocess to list and call tools. These tests do not rerun the embedding experiment or held-out evaluation. Exact model revision and runtime provenance are in [`config/experiments/semantic_runtime.json`](config/experiments/semantic_runtime.json); see the [Technical Appendix](docs/RESEARCH_TECHNICAL_APPENDIX.md) for the frozen method.

</details>

### Secondary and experimental material

- **MCP interface:** an optional technical interface to the same ranking capability; see the [MCP integration guide](docs/MCP_INTEGRATION.md). It is not part of the ranking experiment.
- **JD Analyzer:** a separate experimental extension with no labelled evaluation; see its [scope and method](experimental/jd_analysis/README.md). It is outside the core empirical ranking study.
- **Semantic reproduction:** exact model, dependency, and runtime details are retained in the [Technical Appendix](docs/RESEARCH_TECHNICAL_APPENDIX.md).
