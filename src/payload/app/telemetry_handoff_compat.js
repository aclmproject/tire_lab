"use strict";

(function expose(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ACLMTelemetryHandoffCompat = api;
})(typeof window !== "undefined" ? window : globalThis, function buildApi() {
  const SUPPORTED_SCHEMA = "ACLM telemetry calibration manifest 1.1";
  const CERTIFIED_LEGACY_APP_VERSIONS = Object.freeze(["0.10.2"]);

  function supportedAppVersions(currentAppVersion) {
    return [...new Set([String(currentAppVersion || "").trim(), ...CERTIFIED_LEGACY_APP_VERSIONS].filter(Boolean))];
  }

  function validate(options = {}) {
    const manifest = options.manifest;
    const currentAppVersion = String(options.currentAppVersion || "").trim();
    const actualTyresIniSha256 = String(options.actualTyresIniSha256 || "").trim().toLowerCase();
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("Embedded telemetry manifest is not an object.");
    }
    if (manifest.schema !== SUPPORTED_SCHEMA) {
      throw new Error(`Embedded telemetry manifest schema is unsupported; expected ${SUPPORTED_SCHEMA}.`);
    }
    if (!supportedAppVersions(currentAppVersion).includes(String(manifest.appVersion || "").trim())) {
      throw new Error(`Embedded telemetry manifest app version ${manifest.appVersion || "missing"} is not compatible with Tire Lab v${currentAppVersion}.`);
    }
    const expectedTyresIniSha256 = String(manifest.tireFileSha256 || "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expectedTyresIniSha256) || !/^[a-f0-9]{64}$/.test(actualTyresIniSha256) || actualTyresIniSha256 !== expectedTyresIniSha256) {
      throw new Error("Embedded telemetry manifest does not match the imported tyres.ini SHA-256.");
    }
    return {
      manifest: JSON.parse(JSON.stringify(manifest)),
      schema: SUPPORTED_SCHEMA,
      manifestAppVersion: String(manifest.appVersion),
      currentAppVersion,
      compatibility: manifest.appVersion === currentAppVersion ? "CURRENT_APPLICATION" : "CERTIFIED_V0.10.2_CANONICAL_HANDOFF",
      tireFileSha256: actualTyresIniSha256
    };
  }

  return { SUPPORTED_SCHEMA, CERTIFIED_LEGACY_APP_VERSIONS, supportedAppVersions, validate };
});
