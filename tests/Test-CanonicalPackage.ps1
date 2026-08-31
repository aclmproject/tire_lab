param([string]$Version='0.10.2')
$ErrorActionPreference='Stop'
$Repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$Dist=Join-Path $Repository 'dist';$Archive=Join-Path $Dist "ACLM_Tire_Lab_Setup_v$Version.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$artifacts=@(Get-ChildItem -LiteralPath $Dist -Filter 'ACLM_Tire_Lab_Setup_v*.zip' -File -ErrorAction Stop)
if($artifacts.Count-ne 1-or$artifacts[0].FullName-ne$Archive){throw "Expected exactly one canonical v$Version installer."}
$scratch=Join-Path ([IO.Path]::GetTempPath()) ('aclm-package-test-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($scratch)|Out-Null
try{
  [IO.Compression.ZipFile]::ExtractToDirectory($Archive,$scratch)
  foreach($required in @('Install_ACLM_Tire_Lab.cmd','payload/Launch_ACLM_Tire_Lab.cmd','payload/Server_ACLM_Tire_Lab.ps1','payload/app/index.html','payload/app/app.js','payload/app/profile_state.js','payload/app/pressure_solver.js','payload/app/wear_model.js','payload/app/integrity.js','payload/Telemetry/ACLM_Native_Telemetry_Logger.ps1','payload/Telemetry/ACLM_Telemetry_Manifest.ps1')){if(!(Test-Path -LiteralPath (Join-Path $scratch $required) -PathType Leaf)){throw "Missing package file: $required"}}
  $app=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $scratch 'payload/app/app.js');$html=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $scratch 'payload/app/index.html');$server=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $scratch 'payload/Server_ACLM_Tire_Lab.ps1')
  $escapedVersion=[regex]::Escape($Version)
  if($app-notmatch('ACLM_APP_VERSION="'+$escapedVersion+'"')-or$html-notmatch('v'+$escapedVersion+' Browser App')-or$server-notmatch('CurrentVersion = "'+$escapedVersion+'"')){throw 'Package version alignment failed.'}
  $bad=New-Object Collections.Generic.List[string]
  $slash=[IO.Path]::DirectorySeparatorChar;$windowsHomePattern=('C:'+([regex]::Escape([string]$slash))+'Users'+([regex]::Escape([string]$slash))+'[^'+([regex]::Escape([string]$slash))+']+');$forward=[char]47;$unixHomePattern=([string]$forward+'home'+[string]$forward+'[^'+[string]$forward+']+'+[string]$forward)
  foreach($file in Get-ChildItem -LiteralPath $scratch -Recurse -File){if($file.Extension-notin @('.js','.html','.ps1','.cmd','.md','.txt','.json','.yml')){continue};$text=Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName;if($text-match$windowsHomePattern-or$text-match$unixHomePattern){[void]$bad.Add($file.FullName.Substring($scratch.Length+1))}}
  if($bad.Count){throw ('Personal path found in package: '+($bad-join', '))}
  [ordered]@{ok=$true;artifact=$artifacts[0].Name;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $Archive).Hash.ToLowerInvariant();files=@(Get-ChildItem -LiteralPath $scratch -Recurse -File).Count}|ConvertTo-Json -Compress
}finally{if(Test-Path -LiteralPath $scratch){Remove-Item -LiteralPath $scratch -Recurse -Force}}
