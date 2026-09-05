param([string]$Version='0.11.0')
$ErrorActionPreference='Stop'
$Repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$SourceRoot=Join-Path $Repository 'src'
$Dist=Join-Path $Repository 'dist'
$Name="ACLM_Tire_Lab_Setup_v$Version.zip"
$Archive=Join-Path $Dist $Name
$Analyzer=Join-Path $Repository 'tools/analyze_post_run_telemetry.js'
$LongRunAnalyzer=Join-Path $Repository 'tools/analyze_long_run_telemetry.js'
if(!(Test-Path -LiteralPath $SourceRoot -PathType Container)){throw 'Installer source directory is missing.'}
if(!(Test-Path -LiteralPath $Analyzer -PathType Leaf)-or!(Test-Path -LiteralPath $LongRunAnalyzer -PathType Leaf)){throw 'Telemetry analyzer source is missing.'}
[IO.Directory]::CreateDirectory($Dist)|Out-Null
$competitors=@(Get-ChildItem -LiteralPath $Dist -Filter 'ACLM_Tire_Lab_Setup_v*.zip' -File -ErrorAction SilentlyContinue|Where-Object{$_.FullName-ne$Archive})
if($competitors.Count){throw ('Competing installer artifacts exist: '+(($competitors|ForEach-Object{$_.Name})-join ', ')+'. Move or remove them explicitly before the canonical build.')}
if(Test-Path -LiteralPath $Archive -PathType Leaf){Remove-Item -LiteralPath $Archive -Force}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$scratch=Join-Path ([IO.Path]::GetTempPath()) ('aclm-canonical-build-'+[Guid]::NewGuid().ToString('N'))
try{
  [IO.Directory]::CreateDirectory($scratch)|Out-Null
  Copy-Item -Path (Join-Path $SourceRoot '*') -Destination $scratch -Recurse -Force
  $packagedTools=Join-Path $scratch 'payload/Tools';[IO.Directory]::CreateDirectory($packagedTools)|Out-Null
  Copy-Item -LiteralPath $Analyzer -Destination (Join-Path $packagedTools 'analyze_post_run_telemetry.js') -Force
  Copy-Item -LiteralPath $LongRunAnalyzer -Destination (Join-Path $packagedTools 'analyze_long_run_telemetry.js') -Force
  [IO.Compression.ZipFile]::CreateFromDirectory($scratch,$Archive,[IO.Compression.CompressionLevel]::Optimal,$false)
}finally{if(Test-Path -LiteralPath $scratch){Remove-Item -LiteralPath $scratch -Recurse -Force}}
$hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $Archive).Hash.ToLowerInvariant()
$result=[ordered]@{product='ACLM Historical Tire Lab';version=$Version;artifact=$Name;path=$Archive;sha256=$hash;bytes=(Get-Item -LiteralPath $Archive).Length;builtUtc=[DateTime]::UtcNow.ToString('o')}
$result|ConvertTo-Json
