const state = {
  taxonomy: null,
  interests: {},
  results: [],
  selected: new Set(),
  language: localStorage.getItem("career-language") === "en" ? "en" : "zh",
  lastRankRequest: null,
  lastJdText: "",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function t(key, variables = {}) {
  const table = window.CAREER_I18N?.[state.language] || {};
  const fallback = window.CAREER_I18N?.zh || {};
  let value = table[key] ?? fallback[key] ?? key;
  Object.entries(variables).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });
  return value;
}

function applyStaticTranslations() {
  document.documentElement.lang = state.language === "en" ? "en" : "zh-CN";
  $$('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  $$('[data-i18n-html]').forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
  $$('[data-i18n-placeholder]').forEach(element => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  $$('[data-i18n-aria-label]').forEach(element => { element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel)); });
  $$('[data-i18n-content]').forEach(element => { element.setAttribute("content", t(element.dataset.i18nContent)); });
  $$('[data-language]').forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.language === state.language));
  });
}

function rolePresentation(role) {
  const chinese = state.language === "zh";
  return {
    name: chinese ? role.display_name_zh : role.display_name_en,
    definition: role[`definition_${state.language}`] || role.definition,
    tasks: role[`core_task_areas_${state.language}`] || role.core_task_areas,
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || t("request_failed"));
  return payload;
}

function splitValues(value) {
  return value.split(/[,，;；]/).map(item => item.trim()).filter(Boolean);
}

function scoreLabel(score) {
  if (score >= 0.66) return t("evidence_strong");
  if (score >= 0.33) return t("evidence_medium");
  return t("evidence_limited");
}

function renderRoleProfiles() {
  const grid = $("#direction-grid");
  grid.innerHTML = state.taxonomy.role_profiles.map((role, index) => {
    const presentation = rolePresentation(role);
    return `
    <article class="direction-card" data-index="${String(index + 1).padStart(2, "0")}">
      <h3>${presentation.name}</h3>
      <p>${presentation.definition}</p>
    </article>
  `;
  }).join("");
}

function renderInterests() {
  const grid = $("#interest-grid");
  grid.innerHTML = state.taxonomy.role_profiles.map(role => {
    state.interests[role.role_profile_id] ??= 0;
    const presentation = rolePresentation(role);
    const interestLabels = [t("interest_unknown"), t("interest_try"), t("interest_high")];
    return `
      <article class="interest-card">
        <strong>${presentation.name}</strong>
        <small>${presentation.tasks.slice(0, 2).join(" · ")}</small>
        <button type="button" data-interest="${role.role_profile_id}" data-value="${state.interests[role.role_profile_id]}">${interestLabels[state.interests[role.role_profile_id]]}</button>
      </article>
    `;
  }).join("");
  $$("[data-interest]", grid).forEach(button => {
    button.addEventListener("click", () => {
      const next = (Number(button.dataset.value) + 1) % 3;
      button.dataset.value = String(next);
      button.textContent = [t("interest_unknown"), t("interest_try"), t("interest_high")][next];
      state.interests[button.dataset.interest] = next;
    });
  });
}

function openPath(path) {
  $("#path-a").classList.toggle("hidden", path !== "a");
  $("#path-b").classList.toggle("hidden", path !== "b");
  $(`#path-${path}`).scrollIntoView({ behavior: "smooth", block: "start" });
}

function fillDemoA() {
  const form = $("#candidate-form");
  form.elements.current_job_title.value = "Reporting Analyst";
  form.elements.years_experience.value = "2.5";
  form.elements.desired_work_directions.value = "build reusable business metrics, own planning and performance cycles";
  form.elements.skills.value = "SQL, Excel, Data Visualization, Metric Design, Business Communication";
  form.elements.experience_narrative.value =
    "Builds weekly KPI reports and dashboards for a retail operations team, investigates conversion changes, validates data quality, and presents follow-up actions to business stakeholders.";
}

function fillDemoB() {
  $("#jd-form").elements.job_description.value = state.language === "en"
    ? "We are looking for a Business Performance Analyst to own KPI system design, monthly goal tracking, budgeting and forecasting. The role investigates performance variance using SQL and business intelligence dashboards, prepares management reporting, and partners with commercial teams to recommend corrective actions."
    : "我们正在招聘经营分析师，负责 KPI 指标体系设计、月度目标管理、预算与滚动预测。该岗位需要使用 SQL 和商业智能仪表盘开展绩效偏差分析，准备经营复盘材料，并与业务团队合作提出改善行动。";
}

function renderResults(payload, { scroll = true } = {}) {
  state.results = payload.role_profiles;
  state.selected.clear();
  $("#result-method").textContent =
    `${payload.model.toUpperCase()} · ${t("result_method")}`;
  $("#prototype-results").innerHTML = payload.role_profiles.map((row, index) => {
    const interest = state.interests[row.role_profile_id] || 0;
    const interestText = [t("interest_unrecorded"), t("interest_try"), t("interest_high")][interest];
    const primaryName = state.language === "zh" ? row.role_profile_name_zh : row.role_profile_name_en;
    const matchedSkills = row.matched_skills_localized || row.matched_skills;
    return `
      <article class="result-card">
        <div class="result-head">
          <div>
            <span class="rank">#${index + 1}</span>
            <h3>${primaryName}</h3>
          </div>
          <div class="score">${Math.round(row.score * 100)}</div>
        </div>
        <p class="result-meta">${scoreLabel(row.score)} · ${t("background")} ${Math.round(row.background_score * 100)} · ${t("direction")} ${Math.round(row.direction_score * 100)} · ${t("interest_signal")}: ${interestText}</p>
        <p>${t("strongest_occupation")}: <strong>${row.strongest_occupation.title_localized || row.strongest_occupation.title}</strong></p>
        <div class="skill-columns">
          <div class="skill-box">
            <strong>${t("matched_skills")}</strong>
            ${matchedSkills.length ? matchedSkills.map(skill => `<span>${skill}</span>`).join("") : `<span>${t("no_matches")}</span>`}
          </div>
          <div class="skill-box">
            <strong>${t("missing_evidence")}</strong>
            ${row.missing_core_evidence.length ? row.missing_core_evidence.map(item => `<span title="${item.evidence_absence_message_localized || item.source_membership_ids.join(', ')}">${item.skill_label_localized || item.skill_label}</span>`).join("") : `<span>${t("no_missing")}</span>`}
          </div>
        </div>
        <div class="card-actions">
          <label class="compare-check">
            <input type="checkbox" data-compare="${row.role_profile_id}">
            ${t("add_compare")}
          </label>
          <button class="button text" data-plan="${row.role_profile_id}">${t("generate_plan")}</button>
        </div>
      </article>
    `;
  }).join("");
  $$("[data-compare]").forEach(input => input.addEventListener("change", handleCompareSelection));
  $$("[data-plan]").forEach(button => button.addEventListener("click", () => showPlan(button.dataset.plan)));
  $("#results").classList.remove("hidden");
  $("#comparison").classList.add("hidden");
  $("#plan").classList.add("hidden");
  updateCompareToolbar();
  if (scroll) $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleCompareSelection(event) {
  const id = event.target.dataset.compare;
  if (event.target.checked) {
    if (state.selected.size >= 3) {
      event.target.checked = false;
      return;
    }
    state.selected.add(id);
  } else {
    state.selected.delete(id);
  }
  updateCompareToolbar();
}

function updateCompareToolbar() {
  const size = state.selected.size;
  $("#compare-count").textContent = size
    ? t("selected_count", { count: size })
    : t("compare_empty");
  $("#compare-button").disabled = size < 2 || size > 3;
}

async function showComparison() {
  const payload = await api("/api/compare", {
    method: "POST",
    body: JSON.stringify({
      role_profile_ids: [...state.selected],
      language: state.language,
    }),
  });
  const rows = [
    { label: t("definition"), values: payload.role_profiles.map(item => item.definition) },
    { label: t("typical_tasks"), values: payload.role_profiles.map(item => item.typical_tasks.join(state.language === "zh" ? "、" : "; ")) },
  ];
  $("#comparison").innerHTML = `
    <h3>${t("comparison_title")}</h3>
    <table class="compare-table">
      <thead><tr><th>${t("compare_dimension")}</th>${payload.role_profiles.map(item => `<th>${item.name}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(row => `<tr><th>${row.label}</th>${row.values.map(value => `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
  $("#comparison").classList.remove("hidden");
}

async function showPlan(roleProfileId) {
  const result = state.results.find(item => item.role_profile_id === roleProfileId);
  const payload = await api("/api/readiness-plan", {
    method: "POST",
    body: JSON.stringify({
      role_profile_id: roleProfileId,
      missing_skills: (result?.missing_core_evidence || []).map(item => item.skill_label),
      language: state.language,
    }),
  });
  const name = state.language === "zh" ? result?.role_profile_name_zh : result?.role_profile_name_en;
  $("#plan").innerHTML = `
    <h3>${t("plan_title", { name: name || "" })}</h3>
    <p>${t("plan_note")}</p>
    <div class="plan-grid">
      ${payload.stages.map(stage => `
        <article class="plan-stage">
          <h3>${stage.stage}</h3>
          <p>${stage.goal}</p>
          <ul>${stage.actions.map(action => `<li>${action}</li>`).join("")}</ul>
        </article>
      `).join("")}
    </div>
  `;
  $("#plan").classList.remove("hidden");
  $("#plan").scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderJdResults(payload) {
  const container = $("#jd-results");
  const grouped = ["primary", "supporting", "insufficient"]
    .map(level => ({ level, rows: payload.results.filter(row => row.evidence_level === level) }))
    .filter(group => group.rows.length);
  container.innerHTML = `
    <div class="notice">${payload.method} · ${t("jd_experimental_notice")}</div>
    ${!payload.has_sufficient_evidence ? `<div class="notice">${t("jd_abstained")}</div>` : ""}
    ${grouped.map(group => `
      <section class="jd-evidence-group">
        <h3>${t(`jd_level_${group.level}`)}</h3>
        <div class="result-grid">
          ${group.rows.map(row => `
            <article class="result-card jd-result-card" data-evidence-level="${row.evidence_level}">
              <span class="evidence-badge">${t(`jd_level_${row.evidence_level}`)}</span>
              <h3>${row.role_profile_name}</h3>
              <p class="result-meta">${t("jd_evidence_coverage")} ${Math.round(row.evidence_score * 100)}</p>
              <div class="skill-box">
                <strong>${t("jd_positive_evidence")}</strong>
                ${row.positive_evidence.length
                  ? row.positive_evidence.map(item => `<span title="${item.hits.join(" · ")}">${item.label}：${item.hits.join(" / ")}</span>`).join("")
                  : `<span>${t("jd_no_positive_evidence")}</span>`}
              </div>
              ${row.counter_evidence.length ? `
                <div class="skill-box counter-evidence">
                  <strong>${t("jd_counter_evidence")}</strong>
                  ${row.counter_evidence.map(item => `<span>${item.label}：${item.hits.join(" / ")}</span>`).join("")}
                </div>` : ""}
            </article>
          `).join("")}
        </div>
      </section>
    `).join("")}
  `;
  container.classList.remove("hidden");
}

async function setLanguage(language) {
  if (!window.CAREER_I18N?.[language]) return;
  state.language = language;
  localStorage.setItem("career-language", language);
  applyStaticTranslations();
  if (state.taxonomy) {
    renderRoleProfiles();
    renderInterests();
  }
  try {
    if (state.lastRankRequest) {
      const payload = await api("/api/rank", {
        method: "POST",
        body: JSON.stringify({ ...state.lastRankRequest, language: state.language }),
      });
      renderResults(payload, { scroll: false });
    }
    if (state.lastJdText) {
      const payload = await api("/api/parse-jd", {
        method: "POST",
        body: JSON.stringify({ job_description: state.lastJdText, language: state.language }),
      });
      renderJdResults(payload);
    }
  } catch (error) {
    $("#candidate-error").textContent = error.message;
  }
}

async function init() {
  applyStaticTranslations();
  try {
    state.taxonomy = await api("/api/taxonomy");
    renderRoleProfiles();
    renderInterests();
  } catch (error) {
    $("#direction-grid").textContent = t("taxonomy_error", { message: error.message });
  }

  $$('[data-language]').forEach(button =>
    button.addEventListener("click", () => setLanguage(button.dataset.language))
  );
  $$("[data-open-path]").forEach(button =>
    button.addEventListener("click", () => openPath(button.dataset.openPath))
  );
  $("#load-demo-a").addEventListener("click", fillDemoA);
  $("#load-demo-b").addEventListener("click", fillDemoB);
  $("#compare-button").addEventListener("click", showComparison);

  $("#candidate-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = $("#candidate-error");
    error.textContent = "";
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const request = {
        language: state.language,
        model: form.elements.model.value,
        candidate: {
          candidate_id: "interactive-user",
          current_job_title: form.elements.current_job_title.value.trim(),
          desired_work_directions: splitValues(form.elements.desired_work_directions.value),
          skills: splitValues(form.elements.skills.value),
          experience_narrative: form.elements.experience_narrative.value.trim(),
          years_experience: Number(form.elements.years_experience.value),
        },
      };
      const payload = await api("/api/rank", {
        method: "POST",
        body: JSON.stringify(request),
      });
      state.lastRankRequest = request;
      renderResults(payload);
    } catch (requestError) {
      error.textContent = requestError.message;
    } finally {
      submit.disabled = false;
    }
  });

  $("#jd-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = $("#jd-error");
    error.textContent = "";
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      state.lastJdText = form.elements.job_description.value;
      const payload = await api("/api/parse-jd", {
        method: "POST",
        body: JSON.stringify({ job_description: state.lastJdText, language: state.language }),
      });
      renderJdResults(payload);
    } catch (requestError) {
      error.textContent = requestError.message;
    } finally {
      submit.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
