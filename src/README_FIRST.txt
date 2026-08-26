ACLM HISTORICAL TIRE LAB — CANONICAL SETUP
============================================

CURRENT BUILD
v0.7.0 Browser App + AC import

INSTALL
1. Extract this ZIP.
2. Double-click Install_ACLM_Tire_Lab.cmd.
3. Your browser opens http://127.0.0.1:48765/
4. Install ACLM Tire Lab through Edge/Chrome when prompted.
   In Edge you can also use: ... > Apps > Install ACLM Historical Tire Lab.

THIS IS THE BUILD TO KEEP
Do not mix it with the earlier temporary Edge-app wrapper package.

INCLUDED
- browser/PWA-style install workflow
- existing Assetto Corsa physics ZIP import
- unpacked AC car/data-folder import
- automatic population of car/tire values
- complete Assetto Corsa v10/CSP tire output
- wear, temperature and camber LUT generation
- output/LUT integrity validator
- About & methodology disclaimer: public evidence only; no confidential or proprietary manufacturer information
- resilient on-demand GitHub checks with cached offline fallback
- installer restarts the local server and preserves verified caches
- Supra LM regression reference

RECOVERY / ACCESS
The installed files live at:
%LOCALAPPDATA%\ACLM\Historical Tire Lab

A normal Windows shortcut named "ACLM Tire Lab" is also created.


PREREQUISITE CHECKS
-------------------
The installer now checks Windows PowerShell 5.1+ and Microsoft Edge 110+.
If Edge is absent or too old, it offers to install/update Microsoft Edge with
Windows Package Manager (winget). It then verifies the localhost server and
the actual Tire Lab HTTP page before reporting success.

If winget is unavailable, the installer opens Microsoft's official Edge page
and stops so the prerequisite can be installed safely before retrying setup.


v0.3.7 ADDITIONS
----------------
- Tire-pack downloads use the car name automatically.
- Optional terminal tire-failure/puncture cliff in each generated wear LUT.
- Default failure model is 50% grip 0.20 vKm after the final normal-wear point.
- Pressure sanity warning for unusually large cold-to-hot targets.


v0.3.8 HISTORICAL PROFILE AUTO-FILL
-----------------------------------
After importing an AC ZIP/folder, Tire Lab now attempts to fill Car, Year,
Series/Class, Supplier and compound availability.

Evidence order:
1. Direct AC metadata such as ui_car.json and tyres.ini (green)
2. Package/file-name inference when unambiguous (amber)
3. Best-effort public-source background lookup for missing values (amber)

Background lookup is optional, runs after import by default, and never overwrites
a direct AC-package value. Amber research values should be reviewed before
historical certification.


v0.3.9 IMPORT / HISTORICAL CONTEXT
----------------------------------
New imports no longer inherit a previous car's historical profile.

On import:
- Car is read from ui_car.json, or car.ini [INFO] SCREEN_NAME / SHORT_NAME.
- Year is read directly when present; otherwise a narrow identity lookup may fill
  one high-confidence racing/debut year.
- Series/Class is deliberately reset to "General / unknown".
- Supplier is deliberately reset to "Unknown".

When "Research class / supplier" is clicked:
- Tire Lab searches only identity-matched pages for the imported car.
- Car and Year are not changed.
- If one category/supplier is confidently found, it may be filled.
- If multiple categories or suppliers are found, Tire Lab requires a selection
  before applying that historical context.

This is intentional: the same chassis/model can race in different categories or
on different supplier/construction families, and that choice changes the tire
family Tire Lab should generate.


v0.4.0 - HISTORICAL PDF REPORT RESTORED
---------------------------------------
Every exported tire pack now contains a car-specific PDF:

  ACLM_<Car>_Historical_Tire_Accuracy_Report.pdf

The report records:
- car / year / selected class / tire supplier and provenance
- construction and compound menu
- tire geometry, rate, reference load and pressure targets
- wear-calibration status and terminal-failure settings
- historical-accuracy findings and unresolved evidence
- AC implementation completeness
- imported-package provenance
- source pages captured by Tire Lab historical research
- limitations and next validation items

The PDF is mandatory: the export validator fails if the report is missing or invalid.


v0.4.1 - PRESSURE GENERATION FIX
--------------------------------
Imported AC PRESSURE_STATIC values are now reference-only.

By default Tire Lab solves generated cold pressure from:
- desired PRESSURE_IDEAL
- each compound's actual peak thermal window
- a cold reference temperature (26 C by default)

This uses absolute pressure / ideal-gas temperature scaling, which reproduces
the LC2 test behavior extremely closely:
- 24 psi at 26 C predicts ~30.46 psi at 76 C
- 27 psi at 26 C predicts ~36.61 psi at 95 C

For the LC2 Medium example (31 psi ideal, 90-105 C peak window), the corrected
generated cold pressure is about 22.2 psi rather than copying the old 24/27 psi.
The original imported values remain visible as references in the import table and PDF.


v0.4.2 - HISTORICAL RESEARCH DEPTH FIX
--------------------------------------
Rare historic racers are researched from exact model identity plus full page
source, including specification tables.

DP214 regression target:
Aston Martin DP214 -> 1963 -> Grand Touring (GT) -> Dunlop -> bias/cross-ply.


v0.4.3 - GENERIC VEHICLE RESEARCH + REGRESSION GUARD
-----------------------------------------------------
The research engine now preserves real class/category labels even when they are not hard-coded in Tire Lab.
Export ZIP naming is hard-locked to ACLM_<Car_Name>_TirePack.zip.
The installer aborts if a canonical feature has disappeared.


v0.4.4 - GRAPHS + UPDATE SYSTEM
-----------------------------------
Restored wear/temp/grip graphs. Added stable-channel update checking and SHA-256 verified update installation. Published installers use ACLM_Tire_Lab_Setup_vX.Y.Z.zip.


v0.5.0 - LIVE KNOWLEDGE RUNTIME
---------------------------------------
Application and historical research data are now independently versioned.

Application build: v0.5.0
Bundled knowledge: v1.2.0 / schema 1.0.0

At startup Tire Lab:
1. loads a bundled, last-known-good historical knowledge release;
2. loads any newer verified local cache;
3. checks the published Google Drive knowledge manifest;
4. SHA-256 verifies newer knowledge before replacing the cache.

Knowledge updates do NOT require an application reinstall.

Both AC import paths remain mandatory:
- AC car/physics ZIP
- unpacked data folder

Curated Research_Profiles are checked before broad Wikipedia lookup.
Generator_Priors now drive historical-family grip, rate, transient, camber,
load-sensitivity, falloff, pressure, rolling-loss, high-speed and thermal
architecture while imported car geometry/mass remain direct car-state evidence.


v0.7.0 - SAFE DISTRIBUTION
--------------------------
This build removes automatic application download/extract/execute behavior. Application updates are check-only and open the normal browser release page. Tire-knowledge updates remain JSON-only and SHA-256 verified. No startup persistence, hidden updater, self-deleting updater, or automatic prerequisite installer is included.

V0.7.0 SINGLE-LAUNCHER POLICY
- The installer removes only exact legacy ACLM Tire Lab shortcut names.
- One canonical desktop launcher starts and health-checks the packaged server before opening the browser.
- In-app PWA installation was removed to prevent duplicate Windows launch entries.
