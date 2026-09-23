import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SPEC_NAME, buildMembershipEvidence } from "./role_profile_experiment.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const outputDir = join(ROOT, "taxonomy");
const paths = {
  role: join(ROOT, "taxonomy", "role_profiles.json"),
  evidence: join(ROOT, "taxonomy", "role_skill_evidence.json"),
  occupations: join(ROOT, "taxonomy", "esco_occupations.json"),
  directionTargets: join(ROOT, "config", "shared", "matching_direction_phrases.json"),
  aliases: join(ROOT, "config", "shared", "matching_aliases.json"),
};
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const writeJson = async (path, value) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); };
const directionConfig = await json(paths.directionTargets);
const aliasConfig = await json(paths.aliases);
const inputsFrozen = directionConfig.status === "frozen" && aliasConfig.status === "frozen";
const memberships = buildMembershipEvidence(await json(paths.role), await json(paths.evidence), await json(paths.occupations), directionConfig);
const membershipPath = join(outputDir, "role_occupation_memberships.json");
const manifestPath = join(outputDir, "manifest.json");
const sourceFiles = Object.fromEntries(await Promise.all(Object.values(paths).map(async (path) => [relative(ROOT, path).replaceAll("\\", "/"), await hash(path)])));
const membershipPayload = `${JSON.stringify(memberships, null, 2)}\n`;
const membershipHash = createHash("sha256").update(membershipPayload).digest("hex");

try {
  const existing = await json(manifestPath);
  if (existing.status === "frozen") {
    const sourceUnchanged = JSON.stringify(existing.source_files) === JSON.stringify(sourceFiles);
    const derivedUnchanged = existing.derived_files?.["taxonomy/role_occupation_memberships.json"] === membershipHash;
    if (!sourceUnchanged || !derivedUnchanged) {
      throw new Error("FROZEN_MATCHING_INPUT_CHANGED: create a new version and freeze record instead of overwriting the frozen inputs");
    }
    if (!existing.freeze_record) {
      throw new Error("FROZEN_MATCHING_INPUT_INVALID: freeze_record is missing");
    }
    process.stdout.write("MATCHING_EVIDENCE_UNCHANGED occupations=15 memberships=18 role_profiles=5 status=frozen\n");
    process.exit(0);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await writeJson(membershipPath, memberships);
await writeJson(manifestPath, {
  dataset_name: "matching-membership-evidence",
  status: inputsFrozen ? "frozen" : "draft",
  frozen_at: inputsFrozen ? "2026-08-16" : null,
  specification: SPEC_NAME, unique_occupations: new Set(memberships.map((row) => row.occupation_uri)).size,
  memberships: memberships.length, role_profiles: new Set(memberships.map((row) => row.role_profile_id)).size,
  source_files: sourceFiles,
  derived_files: { [relative(ROOT, membershipPath).replaceAll("\\", "/")]: membershipHash },
  prohibited_sources: ["ESCO-optional skills", "excluded skill decisions", "candidate governance metadata"],
  direction_target_status: directionConfig.status,
  alias_status: aliasConfig.status,
  freeze_record: inputsFrozen ? "reports/freezes/MEMBERSHIP_SKILL_EVIDENCE_FREEZE.md" : null,
});
process.stdout.write(`MATCHING_EVIDENCE_BUILT occupations=15 memberships=18 role_profiles=5 status=${inputsFrozen ? "frozen" : "draft"}\n`);
