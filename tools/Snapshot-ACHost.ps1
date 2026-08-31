param(
  [Parameter(Mandatory=$true)][string]$CarId,
  [string]$AssettoCorsaRoot='F:\SteamLibrary\steamapps\common\assettocorsa',
  [string]$OutputDirectory=(Join-Path $PSScriptRoot '..\research_staging\clean_kunos_hosts')
)
$ErrorActionPreference='Stop'
$carRoot=Join-Path $AssettoCorsaRoot ('content\cars\'+$CarId)
$dataRoot=Join-Path $carRoot 'data'
if(!(Test-Path -LiteralPath $dataRoot -PathType Container)){throw "Clean loose data folder is unavailable: $dataRoot"}
$output=[IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($output)|Out-Null
$archive=Join-Path $output ($CarId+'_clean_physics.zip')
$inventoryPath=Join-Path $output ($CarId+'_clean_physics_inventory.json')
$files=New-Object Collections.Generic.List[object]
foreach($file in Get-ChildItem -LiteralPath $dataRoot -File -Recurse|Sort-Object FullName){
  $relative='data/'+$file.FullName.Substring($dataRoot.Length).TrimStart('\').Replace('\','/')
  [void]$files.Add([pscustomobject][ordered]@{path=$relative;bytes=$file.Length;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant();sourcePath=$file.FullName})
}
$uiPath=Join-Path $carRoot 'ui\ui_car.json'
if(Test-Path -LiteralPath $uiPath -PathType Leaf){$ui=Get-Item -LiteralPath $uiPath;[void]$files.Add([pscustomobject][ordered]@{path='ui/ui_car.json';bytes=$ui.Length;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $ui.FullName).Hash.ToLowerInvariant();sourcePath=$ui.FullName})}
$acd=Join-Path $carRoot 'data.acd'
$inventory=[pscustomobject][ordered]@{
  schema='ACLM clean installed host snapshot 1.0';carId=$CarId;source='official installed Kunos car with Content Manager loose-data extraction';createdUtc=[DateTime]::UtcNow.ToString('o')
  carRoot=$carRoot;looseDataPresent=$true;packedDataPresent=(Test-Path -LiteralPath $acd -PathType Leaf);packedDataSha256=if(Test-Path -LiteralPath $acd -PathType Leaf){(Get-FileHash -Algorithm SHA256 -LiteralPath $acd).Hash.ToLowerInvariant()}else{$null}
  fileCount=$files.Count;files=@($files|ForEach-Object{[pscustomobject][ordered]@{path=$_.path;bytes=$_.bytes;sha256=$_.sha256}})
}
$inventory|ConvertTo-Json -Depth 8|Set-Content -Encoding UTF8 -LiteralPath $inventoryPath
if(Test-Path -LiteralPath $archive -PathType Leaf){Remove-Item -LiteralPath $archive -Force}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::Open($archive,[IO.Compression.ZipArchiveMode]::Create)
try{foreach($file in $files){[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.sourcePath,$file.path,[IO.Compression.CompressionLevel]::Optimal)|Out-Null}}finally{$zip.Dispose()}
[pscustomobject][ordered]@{ok=$true;carId=$CarId;archive=$archive;archiveSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant();archiveBytes=(Get-Item -LiteralPath $archive).Length;inventory=$inventoryPath;fileCount=$files.Count}|ConvertTo-Json -Compress
