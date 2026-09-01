param([int]$Port=48765)
$ErrorActionPreference = "Stop"
$AppDir = Join-Path $PSScriptRoot "app"
$CurrentVersion = "0.10.2"
$KnowledgeManifestUrls = @(
  "https://api.github.com/repos/aclmproject/tire_lab/contents/knowledge/ACLM_Tire_Knowledge_latest.json?ref=main",
  "https://raw.githubusercontent.com/aclmproject/tire_lab/main/knowledge/ACLM_Tire_Knowledge_latest.json"
)
$AppManifestUrls = @(
  "https://github.com/aclmproject/tire_lab/releases/latest/download/ACLM_Tire_Lab_latest.json",
  "https://api.github.com/repos/aclmproject/tire_lab/contents/manifests/ACLM_Tire_Lab_latest.json?ref=main",
  "https://raw.githubusercontent.com/aclmproject/tire_lab/main/manifests/ACLM_Tire_Lab_latest.json"
)
$UpdatesPage = "https://github.com/aclmproject/tire_lab/releases"
$KnowledgeCache = Join-Path $PSScriptRoot "knowledge_cache.json"
$AppManifestCache = Join-Path $PSScriptRoot "app_manifest_cache.json"
$KnowledgeFallback = Join-Path $AppDir "knowledge_fallback.json"
$GithubHeaders = @{"Cache-Control"="no-cache";"User-Agent"="ACLM-Historical-Tire-Lab/$CurrentVersion";"Accept"="application/vnd.github+json"}
$TelemetryOutput = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ACLM Tire Lab\Telemetry'
$TelemetryStateDir = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'ACLM Tire Lab\Telemetry'
$TelemetryScript = Join-Path $PSScriptRoot 'Telemetry\ACLM_Native_Telemetry_Logger.ps1'
$TelemetryStatusPath = Join-Path $TelemetryStateDir 'status.json'
$TelemetryStopPath = Join-Path $TelemetryStateDir 'stop.signal'
$TelemetryManifestInput = Join-Path $TelemetryStateDir 'run-manifest-input.json'
[IO.Directory]::CreateDirectory($TelemetryStateDir)|Out-Null
[IO.Directory]::CreateDirectory($TelemetryOutput)|Out-Null
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try { $listener.Start() } catch { exit 0 }

function Mime([string]$p){switch([IO.Path]::GetExtension($p).ToLowerInvariant()){'.html'{"text/html; charset=utf-8"}'.js'{"text/javascript; charset=utf-8"}'.css'{"text/css; charset=utf-8"}'.json'{"application/json; charset=utf-8"}'.webmanifest'{"application/manifest+json; charset=utf-8"}'.png'{"image/png"}default{"application/octet-stream"}}}
function JsonBytes($obj){[Text.Encoding]::UTF8.GetBytes(($obj|ConvertTo-Json -Depth 12 -Compress))}
function HashText([string]$text){$sha=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($text)))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}}
function Write-Utf8([string]$Path,[string]$Text){[IO.File]::WriteAllText($Path,$Text,(New-Object Text.UTF8Encoding($false)))}
function Decode-GithubContent([string]$Raw){
  $wrapper=$Raw|ConvertFrom-Json
  if(!$wrapper.content -or [string]$wrapper.encoding -ne "base64"){throw "GitHub Contents response is incomplete."}
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(([string]$wrapper.content -replace '\s','')))
}
function Get-JsonUrl([string[]]$Urls,[int]$TimeoutSec=8){
  $errors=New-Object System.Collections.Generic.List[string]
  foreach($Url in $Urls){
    try{
      $r=Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec -MaximumRedirection 5 -Headers $GithubHeaders
      $content=$r.Content
      $raw=if($content -is [byte[]]){[Text.Encoding]::UTF8.GetString($content)}else{[string]$content}
      if($Url -like "https://api.github.com/repos/*/contents/*"){$raw=Decode-GithubContent $raw}
      if([string]::IsNullOrWhiteSpace($raw)){throw "Empty response."}
      return $raw
    }catch{
      $errors.Add(([Uri]$Url).Host+": "+$_.Exception.Message)
    }
  }
  throw "GitHub is unreachable through the current Windows network path after trying all configured endpoints. "+($errors -join " | ")
}
function Read-Knowledge([string]$Path,[string]$Source){
  $raw=Get-Content -Raw -Encoding UTF8 $Path;$obj=$raw|ConvertFrom-Json
  if(!$obj.schemaVersion -or !$obj.releaseVersion -or !$obj.families -or !$obj.classes){throw "Invalid ACLM knowledge release."}
  return @{release=$obj;source=$Source}
}
function Current-Knowledge{
  try{if(Test-Path $KnowledgeCache -PathType Leaf){return Read-Knowledge $KnowledgeCache "last-known-good cache"}}catch{}
  return Read-Knowledge $KnowledgeFallback "bundled fallback"
}
function Sync-Knowledge([bool]$Force=$false){
  $current=Current-Knowledge
  $manifestRaw=Get-JsonUrl -Urls $KnowledgeManifestUrls -TimeoutSec 8
  $m=$manifestRaw|ConvertFrom-Json
  if(!$m.version -or !$m.download_url -or !$m.sha256){throw "Knowledge manifest is incomplete."}
  $cv=[version]([string]$current.release.releaseVersion);$rv=[version]([string]$m.version)
  if(!$Force -and $rv -le $cv){return @{release=$current.release;source=$current.source;updated=$false;checked_utc=[DateTime]::UtcNow.ToString("o")}}
  $releaseUrls=@([string]$m.download_url)
  $releaseUrls += "https://api.github.com/repos/aclmproject/tire_lab/contents/knowledge/releases/ACLM_Tire_Knowledge_v$($m.version).json?ref=main"
  $raw=Get-JsonUrl -Urls $releaseUrls -TimeoutSec 12
  if((HashText $raw) -ne ([string]$m.sha256).ToLowerInvariant()){throw "Knowledge release failed SHA-256 verification."}
  $obj=$raw|ConvertFrom-Json
  if(!$obj.schemaVersion -or ([string]$obj.schemaVersion).Split('.')[0] -ne "1" -or !$obj.releaseVersion -or !$obj.families -or !$obj.classes){throw "Unsupported or invalid knowledge release."}
  Write-Utf8 $KnowledgeCache $raw
  return @{release=$obj;source="verified online knowledge";updated=$true;checked_utc=[DateTime]::UtcNow.ToString("o")}
}
function App-UpdateInfo{
  $warning=$null;$cached=$false
  try{
    $raw=Get-JsonUrl -Urls $AppManifestUrls -TimeoutSec 8
    $m=$raw|ConvertFrom-Json
    if(!$m.version -or !$m.release_page){throw "Application manifest is incomplete."}
    Write-Utf8 $AppManifestCache $raw
  }catch{
    $warning=$_.Exception.Message
    try{
      if(!(Test-Path $AppManifestCache -PathType Leaf)){throw "No cached application manifest."}
      $m=(Get-Content -Raw -Encoding UTF8 $AppManifestCache)|ConvertFrom-Json
      if(!$m.version){throw "Cached application manifest is invalid."}
      $cached=$true
    }catch{
      return @{version=$CurrentVersion;current_version=$CurrentVersion;updates_folder=$UpdatesPage;release_page=$UpdatesPage;warning=$warning;cached=$false}
    }
  }
  $page=if($m.release_page){[string]$m.release_page}else{$UpdatesPage}
  return @{version=$m.version;file_name=$m.file_name;published_utc=$m.published_utc;notes=$m.notes;current_version=$CurrentVersion;updates_folder=$UpdatesPage;release_page=$page;download_url=$m.download_url;warning=$warning;cached=$cached;checked_utc=[DateTime]::UtcNow.ToString("o")}
}

function Read-TelemetryStatus{
  try{
    if(Test-Path $TelemetryStatusPath -PathType Leaf){$x=(Get-Content -Raw -Encoding UTF8 $TelemetryStatusPath)|ConvertFrom-Json;if($x.pid){try{Get-Process -Id ([int]$x.pid) -ErrorAction Stop|Out-Null}catch{if(@('blocked','error')-notcontains[string]$x.state){$x.state='stopped';$x.message='Logger process is not running.'}}};return $x}
  }catch{}
  return @{state='stopped';message='Logger is stopped.';rate_hz=10;samples=0;file=$null;output_directory=$TelemetryOutput}
}
function Get-TelemetryPressureIntent($Manifest){
  $pressureAB=if($Manifest-and$Manifest.pressureAB){$Manifest.pressureAB}else{[pscustomobject][ordered]@{role='unclassified';tirePackId='';coldPressureAdjustmentPsi=[pscustomobject][ordered]@{fl=0;fr=0;rl=0;rr=0}}}
  $role=if($pressureAB.role){[string]$pressureAB.role}else{'unclassified'};$id=if($pressureAB.tirePackId){([string]$pressureAB.tirePackId).Trim()}else{''};$hasCorrection=$false
  foreach($wheel in @('fl','fr','rl','rr')){try{if([Math]::Abs([double]$pressureAB.coldPressureAdjustmentPsi.$wheel)-gt 0.000000001){$hasCorrection=$true}}catch{}}
  if(@('unclassified','baseline','corrected')-notcontains $role){$status='INTENT_INCOMPLETE';$warning='Unsupported pressure-test role.'}
  elseif($role-eq'unclassified'-and($id-or$hasCorrection)){$status='INTENT_INCOMPLETE';$warning='A TirePack ID or pressure correction is present, but the controlled pressure-test role is unclassified.'}
  elseif($role-eq'unclassified'){$status='UNCLASSIFIED_GENERIC_TELEMETRY';$warning='Pressure-test role is unclassified. Generic telemetry is retained, but it cannot be promoted as a controlled pressure screen.'}
  elseif(!$id){$status='INTENT_INCOMPLETE';$warning='Controlled pressure role is declared, but the TirePack ID is blank.'}
  else{$status='COMPLETE';$warning=$null}
  return [pscustomobject][ordered]@{pressureAB=$pressureAB;status=$status;warning=$warning}
}
function Start-Telemetry([int]$RateHz,$Manifest){
  if(@(10,20,50) -notcontains $RateHz){throw 'Sample rate must be 10, 20 or 50 Hz.'}
  if(!(Test-Path $TelemetryScript -PathType Leaf)){throw 'The native telemetry logger is missing from this installation.'}
  $current=Read-TelemetryStatus
  if(@('waiting','recording','starting')-contains [string]$current.state){return $current}
  Remove-Item $TelemetryStopPath,$TelemetryStatusPath,$TelemetryManifestInput -Force -ErrorAction SilentlyContinue
  $manifestReceived=$false;$intent=Get-TelemetryPressureIntent $Manifest
  if($null-ne$Manifest){
    if(!$Manifest.schema -or !$Manifest.appVersion -or !$Manifest.tireFileSha256){throw 'Generated telemetry manifest is incomplete; generate and validate the TirePack before starting the logger.'}
    $manifestJson=$Manifest|ConvertTo-Json -Depth 20
    if($manifestJson.Length-gt 262144){throw 'Telemetry manifest is too large.'}
    Write-Utf8 $TelemetryManifestInput $manifestJson
    $manifestReceived=$true
  }
  # Publish a server-owned starting state before launching the child process.
  # The HTTP server is single threaded, so a queued second start request now
  # observes this state instead of launching a duplicate logger while the
  # child is still materializing its own status file.
  $starting=@{state='starting';message='Logger process is starting.';pid=0;rate_hz=$RateHz;samples=0;file=$null;output_directory=$TelemetryOutput;manifest_received=$manifestReceived;pressure_ab=$intent.pressureAB;pressure_intent_status=$intent.status;pressure_intent_warning=$intent.warning;initial_ac_lap=$null}
  Write-Utf8 $TelemetryStatusPath ($starting|ConvertTo-Json -Depth 5)
  $exe=Join-Path $PSHOME 'powershell.exe';if(!(Test-Path $exe)){$exe='powershell.exe'}
  $args='-NoLogo -NoProfile -ExecutionPolicy Bypass -File "'+$TelemetryScript+'" -OutputDirectory "'+$TelemetryOutput+'" -RateHz '+$RateHz+' -StatusPath "'+$TelemetryStatusPath+'" -StopPath "'+$TelemetryStopPath+'"'
  if(Test-Path $TelemetryManifestInput -PathType Leaf){$args+=' -ManifestPath "'+$TelemetryManifestInput+'"'}
  try{$proc=Start-Process -FilePath $exe -ArgumentList $args -WindowStyle Hidden -PassThru}catch{Remove-Item $TelemetryStatusPath -Force -ErrorAction SilentlyContinue;throw}
  Start-Sleep -Milliseconds 300
  $status=Read-TelemetryStatus;$status|Add-Member -NotePropertyName manifest_received -NotePropertyValue $manifestReceived -Force
  if([string]$status.state -eq 'starting' -and ![int]$status.pid){$status.pid=$proc.Id;Write-Utf8 $TelemetryStatusPath ($status|ConvertTo-Json -Depth 5)}
  return $status
}
function Stop-Telemetry{
  [IO.File]::WriteAllText($TelemetryStopPath,[DateTime]::UtcNow.ToString('o'))
  $s=Read-TelemetryStatus;$s.state='stopping';$s.message='Stop requested; flushing the CSV.';return $s
}
function Read-SharedCsvSnapshot([string]$Path){
  $source=[IO.FileStream]::new($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
  try{$memory=[IO.MemoryStream]::new();try{$source.CopyTo($memory);$bytes=$memory.ToArray()}finally{$memory.Dispose()}}finally{$source.Dispose()}
  $lastNewline=-1
  for($i=$bytes.Length-1;$i -ge 0;$i--){if($bytes[$i] -eq 10){$lastNewline=$i;break}}
  if($lastNewline -lt 0){throw 'The latest telemetry file does not contain a complete CSV row yet.'}
  if($lastNewline -eq ($bytes.Length-1)){return $bytes}
  $complete=New-Object byte[] ($lastNewline+1)
  [Buffer]::BlockCopy($bytes,0,$complete,0,$complete.Length)
  return $complete
}
function Latest-Telemetry{
  $file=Get-ChildItem -LiteralPath $TelemetryOutput -Filter 'ACLM_AC_*.csv' -File -ErrorAction SilentlyContinue|Sort-Object LastWriteTimeUtc -Descending|Select-Object -First 1
  if(!$file){throw 'No ACLM native telemetry CSV has been recorded yet.'}
  return Read-SharedCsvSnapshot $file.FullName
}

function HashBytes([byte[]]$Bytes){$sha=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}}
function Import-KnowledgePackage([string]$RequestBody){
  if([string]::IsNullOrWhiteSpace($RequestBody)){throw "Knowledge package request is empty."}
  $request=$RequestBody|ConvertFrom-Json
  if(!$request.payload_base64 -or !$request.sha256){throw "Knowledge package request is incomplete."}
  try{$bytes=[Convert]::FromBase64String(([string]$request.payload_base64))}catch{throw "Knowledge payload is not valid base64."}
  if($bytes.Length -le 0 -or $bytes.Length -gt 6291456){throw "Knowledge payload size is invalid."}
  $actual=HashBytes $bytes
  if($actual -ne ([string]$request.sha256).ToLowerInvariant()){throw "Knowledge package SHA-256 verification failed."}
  $raw=[Text.Encoding]::UTF8.GetString($bytes)
  $obj=$raw|ConvertFrom-Json
  if(!$obj.releaseVersion -or !$obj.schemaVersion -or !([string]$obj.schemaVersion).StartsWith("1.") -or !$obj.contentSha256){throw "Unsupported or incomplete knowledge release."}
  if(!$obj.families -or !$obj.classes -or !$obj.sources -or !$obj.generatorPriors){throw "Knowledge release is missing required collections."}
  $familyIds=@($obj.families|ForEach-Object{[string]$_.id})
  $classIds=@($obj.classes|ForEach-Object{[string]$_.id})
  if($familyIds.Count -ne (@($familyIds|Select-Object -Unique)).Count -or $familyIds -contains ""){throw "Family IDs are missing or duplicated."}
  if($classIds.Count -ne (@($classIds|Select-Object -Unique)).Count -or $classIds -contains ""){throw "Class IDs are missing or duplicated."}
  foreach($c in $obj.classes){if($familyIds -notcontains [string]$c.familyId){throw "Class $($c.id) references a missing family."};if(!$c.menu){throw "Class $($c.id) has no tire menu."}}
  $priorIds=@($obj.generatorPriors.PSObject.Properties.Name)
  if($priorIds.Count -ne $familyIds.Count){throw "Generator-prior coverage count is invalid."}
  foreach($id in $familyIds){if($priorIds -notcontains $id){throw "Generator prior is missing for $id."}}
  Write-Utf8 $KnowledgeCache $raw
  return @{release=$obj;source="verified manual import";updated=$true;sha256=$actual;checked_utc=[DateTime]::UtcNow.ToString("o")}
}

function Read-RequestBody($reader,$headers){
  if(!$headers.ContainsKey("content-length")){return ""}
  $length=0
  if(![int]::TryParse([string]$headers["content-length"],[ref]$length) -or $length -le 0 -or $length -gt 8388608){return ""}
  $chars=New-Object char[] $length;$read=0
  while($read -lt $length){$n=$reader.ReadBlock($chars,$read,$length-$read);if($n -le 0){break};$read+=$n}
  if($read -le 0){return ""}
  return -join ($chars[0..($read-1)])
}

while($true){
  $client=$listener.AcceptTcpClient()
  try{
    $stream=$client.GetStream()
    $reader=New-Object IO.StreamReader($stream,[Text.Encoding]::UTF8,$false,4096,$true)
    $line=$reader.ReadLine();if(!$line){$client.Close();continue}
    $headers=@{}
    while(($h=$reader.ReadLine()) -ne $null -and $h -ne ''){$ix=$h.IndexOf(':');if($ix -gt 0){$headers[$h.Substring(0,$ix).Trim().ToLowerInvariant()]=$h.Substring($ix+1).Trim()}}
    $parts=$line.Split(' ');$method=$parts[0];$url=$parts[1].Split('?')[0]
    $requestBody=Read-RequestBody $reader $headers

    if($url -eq "/api/health"){
      $body=JsonBytes @{product="ACLM Historical Tire Lab";server_version=$CurrentVersion;status="ok"};$code="200 OK";$mime="application/json; charset=utf-8"
    }elseif($url -eq "/api/knowledge-current"){
      try{$k=Current-Knowledge;$body=JsonBytes @{release=$k.release;source=$k.source};$code="200 OK"}catch{$body=JsonBytes @{error=$_.Exception.Message};$code="500 Internal Server Error"};$mime="application/json; charset=utf-8"
    }elseif($url -eq "/api/knowledge-sync" -and $method -eq "POST"){
      $force=$false
      try{if($requestBody){$request=$requestBody|ConvertFrom-Json;$force=[bool]$request.force}}catch{}
      try{$k=Sync-Knowledge $force;$body=JsonBytes @{release=$k.release;source=$k.source;updated=$k.updated;checked_utc=$k.checked_utc};$code="200 OK"}catch{$body=JsonBytes @{error=$_.Exception.Message};$code="503 Service Unavailable"};$mime="application/json; charset=utf-8"
    }elseif($url -eq "/api/knowledge-import" -and $method -eq "POST"){
      try{$k=Import-KnowledgePackage $requestBody;$body=JsonBytes $k;$code="200 OK"}catch{$body=JsonBytes @{error=$_.Exception.Message};$code="400 Bad Request"};$mime="application/json; charset=utf-8"
    }elseif($url -eq "/api/telemetry-status"){
    try{$body=JsonBytes (Read-TelemetryStatus);$code="200 OK"}catch{$body=JsonBytes @{error=$_.Exception.Message};$code="500 Internal Server Error"};$mime="application/json; charset=utf-8"
  }elseif($url -eq "/api/telemetry-start" -and $method -eq "POST"){
    try{$rate=10;$manifest=$null;if($requestBody){$request=$requestBody|ConvertFrom-Json;$rate=[int]$request.rate_hz;$manifest=$request.manifest};$body=JsonBytes (Start-Telemetry $rate $manifest);$code="200 OK"}catch{$body=JsonBytes @{error=$_.Exception.Message};$code="400 Bad Request"};$mime="application/json; charset=utf-8"
  }elseif($url -eq "/api/telemetry-stop" -and $method -eq "POST"){
    try{$body=JsonBytes (Stop-Telemetry);$code="200 OK"}catch{$body=JsonBytes @{error=$_.Exception.Message};$code="500 Internal Server Error"};$mime="application/json; charset=utf-8"
  }elseif($url -eq "/api/telemetry-latest"){
    try{$body=Latest-Telemetry;$code="200 OK"}catch{$body=JsonBytes @{error=$_.Exception.Message};$code="404 Not Found"};$mime=if($code -eq "200 OK"){"text/csv; charset=utf-8"}else{"application/json; charset=utf-8"}
    }elseif($url -eq "/api/update-info"){
      $body=JsonBytes (App-UpdateInfo);$code="200 OK";$mime="application/json; charset=utf-8"
    }elseif($url -eq "/api/install-update"){
      $body=JsonBytes @{error="Automatic application installation is disabled. Open the release page and download updates in your browser.";manual_only=$true;release_page=$UpdatesPage};$code="409 Conflict";$mime="application/json; charset=utf-8"
    }else{
      $rel=[Uri]::UnescapeDataString($url.TrimStart('/'));if([string]::IsNullOrWhiteSpace($rel)){$rel="index.html"}
      $rel=$rel.Replace('/',[IO.Path]::DirectorySeparatorChar);$full=[IO.Path]::GetFullPath((Join-Path $AppDir $rel));$root=[IO.Path]::GetFullPath($AppDir)
      if(!$full.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)-or !(Test-Path $full -PathType Leaf)){$body=[Text.Encoding]::UTF8.GetBytes("404");$code="404 Not Found";$mime="text/plain; charset=utf-8"}else{$body=[IO.File]::ReadAllBytes($full);$code="200 OK";$mime=Mime $full}
    }
    $crlf=[char]13+[char]10
    $head="HTTP/1.1 $code"+$crlf+"Content-Type: $mime"+$crlf+"Content-Length: $($body.Length)"+$crlf+"Cache-Control: no-store"+$crlf+"Connection: close"+$crlf+$crlf
    $hb=[Text.Encoding]::ASCII.GetBytes($head);$stream.Write($hb,0,$hb.Length);if($method -ne "HEAD"){$stream.Write($body,0,$body.Length)};$stream.Flush()
  }catch{}finally{$client.Close()}
}
