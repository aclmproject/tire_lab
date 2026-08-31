param([string]$Version='0.10.2')
$ErrorActionPreference='Stop'
$Repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$SourceRoot=Join-Path $Repository 'src'
$Dist=Join-Path $Repository 'dist'
$Name="ACLM_Tire_Lab_Setup_v$Version.zip"
$Archive=Join-Path $Dist $Name
if(!(Test-Path -LiteralPath $SourceRoot -PathType Container)){throw 'Installer source directory is missing.'}
[IO.Directory]::CreateDirectory($Dist)|Out-Null
$competitors=@(Get-ChildItem -LiteralPath $Dist -Filter 'ACLM_Tire_Lab_Setup_v*.zip' -File -ErrorAction SilentlyContinue|Where-Object{$_.FullName-ne$Archive})
if($competitors.Count){throw ('Competing installer artifacts exist: '+(($competitors|ForEach-Object{$_.Name})-join ', ')+'. Move or remove them explicitly before the canonical build.')}
if(Test-Path -LiteralPath $Archive -PathType Leaf){Remove-Item -LiteralPath $Archive -Force}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($SourceRoot,$Archive,[IO.Compression.CompressionLevel]::Optimal,$false)
$hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $Archive).Hash.ToLowerInvariant()
$result=[ordered]@{product='ACLM Historical Tire Lab';version=$Version;artifact=$Name;path=$Archive;sha256=$hash;bytes=(Get-Item -LiteralPath $Archive).Length;builtUtc=[DateTime]::UtcNow.ToString('o')}
$result|ConvertTo-Json
