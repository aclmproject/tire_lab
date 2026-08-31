param(
  [string]$CsvPath='C:\Users\spam\Documents\ACLM Tire Lab\Telemetry\ACLM_AC_20260831_022752_wsc_legends_gt40_mk2_tires_ks_monza66.csv',
  [string]$RuntimeManifestPath='C:\Users\spam\Documents\ACLM Tire Lab\Telemetry\ACLM_AC_20260831_022752_wsc_legends_gt40_mk2_tires_ks_monza66.manifest.json',
  [string]$AssettoCorsaRoot='F:\SteamLibrary\steamapps\common\assettocorsa',
  [string]$NodePath='C:\Users\spam\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe',
  [string]$OutputDirectory=(Join-Path $PSScriptRoot '..\artifacts\gt40')
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '..\src\payload\Telemetry\ACLM_Telemetry_Manifest.ps1')
if(!(Test-Path -LiteralPath $CsvPath -PathType Leaf)){throw "GT40 CSV not found: $CsvPath"}
if(!(Test-Path -LiteralPath $RuntimeManifestPath -PathType Leaf)){throw "GT40 runtime manifest not found: $RuntimeManifestPath"}
if(!(Test-Path -LiteralPath $NodePath -PathType Leaf)){throw "Node runtime not found: $NodePath"}
New-Item -ItemType Directory -Force -Path $OutputDirectory|Out-Null

$recorded=(Get-Content -Raw -Encoding UTF8 -LiteralPath $RuntimeManifestPath)|ConvertFrom-Json
$generated=if($recorded.generatedConfiguration){$recorded.generatedConfiguration}else{$recorded}
$csvFirst=Import-Csv -LiteralPath $CsvPath|Select-Object -First 1
$csvLast=Import-Csv -LiteralPath $CsvPath|Select-Object -Last 1
$compound=[string]$csvLast.compound
$active=Get-ACLMActiveInstalledPhysics -CarId ([string]$csvLast.car) -ObservedCompoundString $compound -AssettoCorsaRoot $AssettoCorsaRoot
$observed=[pscustomobject][ordered]@{
  airTemperatureCStart=[double]$csvFirst.air_temp_c;roadTemperatureCStart=[double]$csvFirst.road_temp_c
  airTemperatureCLatest=[double]$csvLast.air_temp_c;roadTemperatureCLatest=[double]$csvLast.road_temp_c
  initialPressurePsi=@([double]$csvFirst.pressure_psi_fl,[double]$csvFirst.pressure_psi_fr,[double]$csvFirst.pressure_psi_rl,[double]$csvFirst.pressure_psi_rr)
  latestPressurePsi=@([double]$csvLast.pressure_psi_fl,[double]$csvLast.pressure_psi_fr,[double]$csvLast.pressure_psi_rl,[double]$csvLast.pressure_psi_rr)
  initialCoreTemperatureC=@([double]$csvFirst.core_temp_c_fl,[double]$csvFirst.core_temp_c_fr,[double]$csvFirst.core_temp_c_rl,[double]$csvFirst.core_temp_c_rr)
  latestCoreTemperatureC=@([double]$csvLast.core_temp_c_fl,[double]$csvLast.core_temp_c_fr,[double]$csvLast.core_temp_c_rl,[double]$csvLast.core_temp_c_rr)
  rawAidTireRate=[double]$csvLast.aid_tire_rate;aidTireRateInterpretation='UNKNOWN; zero is not evidence that tire wear was disabled'
  observedCompoundString=$compound;authority='recorded Assetto Corsa physics shared memory'
}
$runtime=[pscustomobject][ordered]@{
  csvPath=$CsvPath;loggerSchema=[string]$recorded.loggerRuntime.loggerSchema;loggerRateHz=[double]$recorded.loggerRuntime.loggerRateHz
  car=[string]$csvLast.car;track=[string]$csvLast.track;samples=[int]$recorded.loggerRuntime.samples
  distanceMeters=$recorded.loggerRuntime.distanceMeters;observedCompoundString=$compound;updatedUtc=[string]$recorded.loggerRuntime.updatedUtc
}
$corrected=Merge-ACLMRunManifest -Generated $generated -ActiveInstalledPhysics $active -Observed $observed -Runtime $runtime -FallbackVersion '0.10.1'
$corrected|ConvertTo-Json -Depth 50|Set-Content -Encoding UTF8 -LiteralPath (Join-Path $OutputDirectory 'GT40_Long_Run_Corrected_Post_Run_Manifest.json')

$analysisPath=Join-Path $OutputDirectory 'GT40_Long_Run_Analysis.json'
$analysis=& $NodePath (Join-Path $PSScriptRoot 'analyze_long_run_telemetry.js') $CsvPath 28
if($LASTEXITCODE-ne 0){throw 'GT40 telemetry analysis failed.'}
$analysis|Set-Content -Encoding UTF8 -LiteralPath $analysisPath

[pscustomobject][ordered]@{
  ok=$true;physicsIdentityStatus=$corrected.physicsIdentityStatus
  generatedTyresIniSha256=$corrected.generatedTyresIniSha256;activeTyresIniSha256=$corrected.activeTyresIniSha256
  activeCompound=$corrected.activeSelectedCompound.name;activeCompoundSlot=$corrected.activeSelectedCompound.internalSlot
  correctedManifest=(Join-Path $OutputDirectory 'GT40_Long_Run_Corrected_Post_Run_Manifest.json');analysis=$analysisPath
}|ConvertTo-Json -Compress
