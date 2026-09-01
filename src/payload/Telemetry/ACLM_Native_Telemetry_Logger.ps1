param(
  [string]$OutputDirectory = '',
  [ValidateSet(10,20,50)][int]$RateHz = 10,
  [string]$StatusPath = '',
  [string]$StopPath = '',
  [string]$ManifestPath = '',
  [string]$AssettoCorsaRoot = '',
  [switch]$SelfTest
)
$ErrorActionPreference='Stop'
$ManifestHelpers=Join-Path $PSScriptRoot 'ACLM_Telemetry_Manifest.ps1'
if(!(Test-Path -LiteralPath $ManifestHelpers -PathType Leaf)){throw 'Telemetry manifest merge helper is missing.'}
. $ManifestHelpers
$Invariant=[Globalization.CultureInfo]::InvariantCulture
$WheelNames=@('fl','fr','rl','rr')
$PhysicsOffsets=@{
  packetId=0; throttle=4; brake=8; fuel=12; gear=16; rpm=20; steering=24; speedKmh=28
  velocity=32; accG=44; wheelSlip=56; wheelLoad=72; pressure=88; wheelAngularSpeed=104
  tyreWear=120; dirty=136; coreTemp=152; camber=168; suspensionTravel=184
  airTemp=288; roadTemp=292; brakeTemp=348; tempInner=368; tempMiddle=384; tempOuter=400
}
$GraphicsOffsets=@{packetId=0;status=4;session=8;completedLaps=132;position=136;currentTimeMs=140;distance=156;isInPit=160;compound=176;normalizedPosition=248;surfaceGrip=280}
$StaticOffsets=@{carModel=68;track=134;aidTireRate=536}

function New-Headers {
  $h=[Collections.Generic.List[string]]::new()
  @('timestamp_utc','elapsed_ms','packet_id','car','track','compound','lap','lap_time_ms','normalized_track_position','distance_traveled_m','logger_cumulative_distance_m','session_distance_m','stint_distance_m','tire_set_distance_m','in_pit','speed_kmh','throttle','brake','steering','gear','rpm','fuel_l','air_temp_c','road_temp_c','surface_grip','aid_tire_rate','velocity_x_mps','velocity_y_mps','velocity_z_mps','accg_lat','accg_vert','accg_long')|ForEach-Object{$h.Add($_)}
  foreach($metric in @('pressure_psi','wear_raw','core_temp_c','temp_inner_c','temp_middle_c','temp_outer_c','wheel_load_n','wheel_slip_raw','wheel_angular_speed_rad_s','camber_rad','suspension_travel_m','brake_temp_c','dirty_raw')){foreach($w in $WheelNames){$h.Add("${metric}_${w}")}}
  return $h.ToArray()
}
$Headers=New-Headers
if($SelfTest){
  if($PhysicsOffsets.tyreWear -ne 120 -or $PhysicsOffsets.coreTemp -ne 152 -or $PhysicsOffsets.tempInner -ne 368 -or $PhysicsOffsets.tempOuter -ne 400){throw 'Physics offset invariant failed.'}
  if($GraphicsOffsets.compound -ne 176 -or $GraphicsOffsets.normalizedPosition -ne 248 -or $StaticOffsets.track -ne 134 -or $StaticOffsets.aidTireRate -ne 536){throw 'Graphics/static offset invariant failed.'}
  if($Headers.Count -ne 84){throw "CSV schema invariant failed: $($Headers.Count) columns."}
  @{ok=$true;schema='ACLM native telemetry 1.2';columns=$Headers.Count;rate_hz=$RateHz;wear_precision='IEEE-754 single round-trip';aid_tire_rate=$true;distance_bases=@('logger_cumulative','session','stint','tire_set')}|ConvertTo-Json -Compress
  exit 0
}

if([string]::IsNullOrWhiteSpace($OutputDirectory)){
  $documents=[Environment]::GetFolderPath('MyDocuments')
  if([string]::IsNullOrWhiteSpace($documents)){$documents=$env:USERPROFILE}
  if([string]::IsNullOrWhiteSpace($documents)){$documents=$env:TEMP}
  $OutputDirectory=Join-Path $documents 'ACLM Tire Lab\Telemetry'
}
$stateRoot=$env:TEMP
if([string]::IsNullOrWhiteSpace($stateRoot)){$stateRoot=[IO.Path]::GetTempPath()}
if([string]::IsNullOrWhiteSpace($StatusPath)){$StatusPath=Join-Path $stateRoot 'aclm-telemetry-status.json'}
if([string]::IsNullOrWhiteSpace($StopPath)){$StopPath=Join-Path $stateRoot 'aclm-telemetry-stop.signal'}

$script:Samples=0;$script:CsvPath=$null;$script:Car='';$script:Track='';$script:Started=[DateTime]::UtcNow;$script:LastStatus=[DateTime]::MinValue;$script:BlockedReason=$null
$script:LoggerDistance=0.0;$script:SessionDistance=0.0;$script:StintDistance=0.0;$script:TireSetDistance=0.0;$script:LastSampleUtc=$null;$script:LastSessionKey='';$script:LastPit=$null;$script:LastWear=$null;$script:ManifestSidecar=$null;$script:ObservedAirStart=$null;$script:ObservedRoadStart=$null;$script:ObservedAirLatest=$null;$script:ObservedRoadLatest=$null;$script:ObservedPressureStart=$null;$script:ObservedCoreStart=$null;$script:ObservedPressureLatest=$null;$script:ObservedCoreLatest=$null;$script:ObservedAidTireRate=$null;$script:ObservedCompoundStart=$null;$script:ObservedCompoundLatest=$null;$script:ActiveInstalledPhysics=$null;$script:PhysicsIdentityMessage='Active physics identity pending session start.'
$script:GeneratedManifest=Read-ACLMGeneratedManifest -Path $ManifestPath -FallbackVersion '0.10.2'
$script:PressureIntent=Get-ACLMPressureIntentAssessment $script:GeneratedManifest.pressureAB;$script:InitialAcLap=$null;$script:LoggerStartedInPit=$null;$script:InitialNormalizedTrackPosition=$null;$script:InitialSessionDistanceM=$null;$script:InitialTireSetDistanceM=$null
function Write-Status([string]$State,[string]$Message){
  $dir=Split-Path -Parent $StatusPath;if($dir){[IO.Directory]::CreateDirectory($dir)|Out-Null}
  $advice=if($null-ne$script:InitialAcLap-and$script:InitialAcLap-gt 1){" AC lap counter began at $($script:InitialAcLap); a fresh AC session is recommended for canonical testing."}else{''}
  $obj=[ordered]@{state=$State;message=($Message+$advice);pid=$PID;rate_hz=$RateHz;samples=$script:Samples;file=$script:CsvPath;output_directory=$OutputDirectory;car=$script:Car;track=$script:Track;pressure_ab=$script:GeneratedManifest.pressureAB;pressure_intent_status=$script:PressureIntent.status;pressure_intent_warning=$script:PressureIntent.warning;initial_ac_lap=$script:InitialAcLap;logger_started_in_pit=$script:LoggerStartedInPit;updated_utc=[DateTime]::UtcNow.ToString('o')}
  $tmp=$StatusPath+'.tmp';[IO.File]::WriteAllText($tmp,($obj|ConvertTo-Json -Compress),(New-Object Text.UTF8Encoding($false)));Move-Item -LiteralPath $tmp -Destination $StatusPath -Force
  $script:LastStatus=[DateTime]::UtcNow
}
function Open-Map([string]$Name){
  foreach($candidate in @($Name,"Local\$Name")){
    try{$mmf=[IO.MemoryMappedFiles.MemoryMappedFile]::OpenExisting($candidate,[IO.MemoryMappedFiles.MemoryMappedFileRights]::Read);return @{Map=$mmf;View=$mmf.CreateViewAccessor(0,0,[IO.MemoryMappedFiles.MemoryMappedFileAccess]::Read)}}catch{}
  }
  throw "Assetto Corsa shared-memory map '$Name' is not available."
}
function Close-Map($m){if($m){try{$m.View.Dispose()}catch{};try{$m.Map.Dispose()}catch{}}}
function F($view,[int]$offset){return $view.ReadSingle($offset)}
function I($view,[int]$offset){return $view.ReadInt32($offset)}
function FA($view,[int]$offset,[int]$count){$a=New-Object float[] $count;[void]$view.ReadArray([long]$offset,$a,0,$count);return $a}
function WS($view,[int]$offset,[int]$chars){$b=New-Object byte[] ($chars*2);[void]$view.ReadArray([long]$offset,$b,0,$b.Length);return ([Text.Encoding]::Unicode.GetString($b).Split([char]0)[0]).Trim()}
function Csv([object]$value){
  if($null -eq $value){return ''}
  if($value-is [float]){return $value.ToString('R',$Invariant)}
  if($value-is [double]){return $value.ToString('G17',$Invariant)}
  if($value-is [decimal]){return $value.ToString('G29',$Invariant)}
  $s=[string]$value;if($s.IndexOfAny([char[]]",`"`r`n")-ge 0){return '"'+$s.Replace('"','""')+'"'};return $s
}
function Safe-Name([string]$s){if([string]::IsNullOrWhiteSpace($s)){return 'unknown'};return (($s-replace '[^A-Za-z0-9._-]+','_').Trim('_')).Substring(0,[Math]::Min(60,(($s-replace '[^A-Za-z0-9._-]+','_').Trim('_')).Length))}
function Write-RunManifest {
  if([string]::IsNullOrWhiteSpace($script:ManifestSidecar)){return}
  try{
    $observed=[ordered]@{airTemperatureCStart=$script:ObservedAirStart;roadTemperatureCStart=$script:ObservedRoadStart;airTemperatureCLatest=$script:ObservedAirLatest;roadTemperatureCLatest=$script:ObservedRoadLatest;initialPressurePsi=$script:ObservedPressureStart;latestPressurePsi=$script:ObservedPressureLatest;initialCoreTemperatureC=$script:ObservedCoreStart;latestCoreTemperatureC=$script:ObservedCoreLatest;observedCompoundString=$script:ObservedCompoundLatest;rawAidTireRate=$script:ObservedAidTireRate;aidTireRateInterpretation='UNKNOWN';aidTireRateMeaning='A raw value of 0 does not mean tire wear was disabled.';authority='recorded Assetto Corsa physics shared memory'}
    $runtime=[ordered]@{csvPath=$script:CsvPath;loggerSchema='ACLM native telemetry 1.2';loggerRateHz=$RateHz;car=$script:Car;track=$script:Track;observedCompoundString=$script:ObservedCompoundLatest;samples=$script:Samples;sessionStart=[ordered]@{initialAcLap=$script:InitialAcLap;loggerStartedInPit=$script:LoggerStartedInPit;initialNormalizedTrackPosition=$script:InitialNormalizedTrackPosition;initialSessionDistanceM=$script:InitialSessionDistanceM;initialTireSetDistanceM=$script:InitialTireSetDistanceM;freshSessionRecommended=($null-ne$script:InitialAcLap-and$script:InitialAcLap-gt 1)};distanceMeters=[ordered]@{loggerCumulative=$script:LoggerDistance;session=$script:SessionDistance;stint=$script:StintDistance;currentTireSet=$script:TireSetDistance};updatedUtc=[DateTime]::UtcNow.ToString('o')}
    $manifest=Merge-ACLMRunManifest -Generated $script:GeneratedManifest -ActiveInstalledPhysics $script:ActiveInstalledPhysics -Observed $observed -Runtime $runtime -FallbackVersion '0.10.2'
    $json=$manifest|ConvertTo-Json -Depth 20
    $tmp=$script:ManifestSidecar+'.tmp';[IO.File]::WriteAllText($tmp,$json,(New-Object Text.UTF8Encoding($false)));Move-Item -LiteralPath $tmp -Destination $script:ManifestSidecar -Force
  }catch{}
}

[IO.Directory]::CreateDirectory($OutputDirectory)|Out-Null
if(Test-Path -LiteralPath $StopPath){Remove-Item -LiteralPath $StopPath -Force}
Write-Status 'waiting' 'Start Assetto Corsa; recording begins automatically when a live session is available.'
$period=[Math]::Max(5,[int](1000/$RateHz))
try{
  while(!(Test-Path -LiteralPath $StopPath)){
    $p=$null;$g=$null;$s=$null;$writer=$null
    try{
      $p=Open-Map 'acpmf_physics';$g=Open-Map 'acpmf_graphics';$s=Open-Map 'acpmf_static'
      while(!(Test-Path -LiteralPath $StopPath)){
        if((I $g.View $GraphicsOffsets.status)-ne 2){if(([DateTime]::UtcNow-$script:LastStatus).TotalSeconds-ge 1){Write-Status 'waiting' 'Shared memory connected; waiting for a live driving session.'};Start-Sleep -Milliseconds 250;continue}
        if(!$writer){
          $script:Car=WS $s.View $StaticOffsets.carModel 33;$script:Track=WS $s.View $StaticOffsets.track 33;$script:ObservedCompoundStart=WS $g.View $GraphicsOffsets.compound 33;$script:ObservedCompoundLatest=$script:ObservedCompoundStart
          $script:InitialAcLap=I $g.View $GraphicsOffsets.completedLaps;$script:LoggerStartedInPit=(I $g.View $GraphicsOffsets.isInPit)-eq 1;$script:InitialNormalizedTrackPosition=F $g.View $GraphicsOffsets.normalizedPosition;$script:InitialSessionDistanceM=$script:SessionDistance;$script:InitialTireSetDistanceM=$script:TireSetDistance
          $script:ActiveInstalledPhysics=Get-ACLMActiveInstalledPhysics -CarId $script:Car -ObservedCompoundString $script:ObservedCompoundStart -AssettoCorsaRoot $AssettoCorsaRoot
          $activeHash=[string]$script:ActiveInstalledPhysics.tyresIniSha256;$generatedHash=[string]$script:GeneratedManifest.tireFileSha256
          $stamp=[DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss');$script:CsvPath=Join-Path $OutputDirectory ("ACLM_AC_${stamp}_$(Safe-Name $script:Car)_$(Safe-Name $script:Track).csv")
          $script:ManifestSidecar=[IO.Path]::ChangeExtension($script:CsvPath,'.manifest.json')
          if($activeHash-and$generatedHash-and$activeHash-eq$generatedHash){$script:PhysicsIdentityMessage='Active installed physics hash MATCH.'}
          elseif($activeHash-and$generatedHash){$script:BlockedReason='BLOCKED: STALE/HASH_MISMATCH. Re-import the TirePack whose tyres.ini is installed in the active car, then restart the logger.'}
          else{$script:BlockedReason='BLOCKED: active and generated physics identity could not be hash-matched. Recording requires physicsHashMatch=true.'}
          if($script:BlockedReason){$script:PhysicsIdentityMessage=$script:BlockedReason;Write-RunManifest;Write-Status 'blocked' $script:BlockedReason;[IO.File]::WriteAllText($StopPath,[DateTime]::UtcNow.ToString('o'));break}
          $csvStream=[IO.FileStream]::new($script:CsvPath,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite)
          $writer=[IO.StreamWriter]::new($csvStream,(New-Object Text.UTF8Encoding($false)));$writer.WriteLine(($Headers-join ','));$writer.Flush();$script:Started=[DateTime]::UtcNow
          Write-RunManifest
          Write-Status 'recording' ('Recording direct AC shared-memory telemetry. '+$script:PhysicsIdentityMessage)
        }
        $packet=I $p.View $PhysicsOffsets.packetId
        if($packet -eq $lastPacket){Start-Sleep -Milliseconds $period;continue};$lastPacket=$packet
        $now=[DateTime]::UtcNow;$speedKmh=F $p.View $PhysicsOffsets.speedKmh;$pit=I $g.View $GraphicsOffsets.isInPit;$sessionCode=I $g.View $GraphicsOffsets.session;$sessionKey="$($script:Car)|$($script:Track)|$sessionCode";$wearValues=FA $p.View $PhysicsOffsets.tyreWear 4;$pressureValues=FA $p.View $PhysicsOffsets.pressure 4;$coreValues=FA $p.View $PhysicsOffsets.coreTemp 4;$airTemp=F $p.View $PhysicsOffsets.airTemp;$roadTemp=F $p.View $PhysicsOffsets.roadTemp;$aidTireRate=F $s.View $StaticOffsets.aidTireRate
        $compoundString=WS $g.View $GraphicsOffsets.compound 33
        if($null-eq$script:ObservedAirStart){$script:ObservedAirStart=$airTemp;$script:ObservedRoadStart=$roadTemp;$script:ObservedPressureStart=@($pressureValues);$script:ObservedCoreStart=@($coreValues)};$script:ObservedAirLatest=$airTemp;$script:ObservedRoadLatest=$roadTemp;$script:ObservedPressureLatest=@($pressureValues);$script:ObservedCoreLatest=@($coreValues);$script:ObservedAidTireRate=$aidTireRate;$script:ObservedCompoundLatest=$compoundString
        if($script:LastSessionKey -and $sessionKey-ne$script:LastSessionKey){$script:SessionDistance=0.0;$script:StintDistance=0.0;$script:TireSetDistance=0.0;$script:LastWear=$null}
        if($null-ne$script:LastPit-and$script:LastPit-eq 1-and$pit-eq 0){$script:StintDistance=0.0}
        if($null-ne$script:LastWear){for($wi=0;$wi-lt 4;$wi++){if(($wearValues[$wi]-$script:LastWear[$wi])-gt 0.05){$script:TireSetDistance=0.0;break}}}
        $dt=if($null-ne$script:LastSampleUtc){[Math]::Min(1.0,[Math]::Max(0.0,($now-$script:LastSampleUtc).TotalSeconds))}else{0.0};$increment=[Math]::Max(0.0,$speedKmh/3.6*$dt)
        $script:LoggerDistance+=$increment;$script:SessionDistance+=$increment;$script:StintDistance+=$increment;$script:TireSetDistance+=$increment;$script:LastSampleUtc=$now;$script:LastSessionKey=$sessionKey;$script:LastPit=$pit;$script:LastWear=@($wearValues)
        $row=[Collections.Generic.List[object]]::new()
        $row.Add($now.ToString('o'));$row.Add([int]($now-$script:Started).TotalMilliseconds);$row.Add($packet);$row.Add($script:Car);$row.Add($script:Track);$row.Add($compoundString);$row.Add((I $g.View $GraphicsOffsets.completedLaps));$row.Add((I $g.View $GraphicsOffsets.currentTimeMs));$row.Add((F $g.View $GraphicsOffsets.normalizedPosition));$row.Add($script:SessionDistance);$row.Add($script:LoggerDistance);$row.Add($script:SessionDistance);$row.Add($script:StintDistance);$row.Add($script:TireSetDistance);$row.Add($pit);$row.Add($speedKmh);$row.Add((F $p.View $PhysicsOffsets.throttle));$row.Add((F $p.View $PhysicsOffsets.brake));$row.Add((F $p.View $PhysicsOffsets.steering));$row.Add((I $p.View $PhysicsOffsets.gear));$row.Add((I $p.View $PhysicsOffsets.rpm));$row.Add((F $p.View $PhysicsOffsets.fuel));$row.Add($airTemp);$row.Add($roadTemp);$row.Add((F $g.View $GraphicsOffsets.surfaceGrip));$row.Add($aidTireRate)
        foreach($x in (FA $p.View $PhysicsOffsets.velocity 3)){$row.Add($x)};foreach($x in (FA $p.View $PhysicsOffsets.accG 3)){$row.Add($x)}
        foreach($x in $pressureValues){$row.Add($x)};foreach($x in $wearValues){$row.Add($x)};foreach($x in $coreValues){$row.Add($x)};foreach($offset in @($PhysicsOffsets.tempInner,$PhysicsOffsets.tempMiddle,$PhysicsOffsets.tempOuter,$PhysicsOffsets.wheelLoad,$PhysicsOffsets.wheelSlip,$PhysicsOffsets.wheelAngularSpeed,$PhysicsOffsets.camber,$PhysicsOffsets.suspensionTravel,$PhysicsOffsets.brakeTemp,$PhysicsOffsets.dirty)){foreach($x in (FA $p.View $offset 4)){$row.Add($x)}}
        if($row.Count -ne $Headers.Count){throw "Row/schema mismatch: $($row.Count)/$($Headers.Count)."}
        $writer.WriteLine((@($row|ForEach-Object{Csv $_})-join ','));$script:Samples++
        if(($script:Samples%$RateHz)-eq 0){$writer.Flush();Write-RunManifest;Write-Status 'recording' ('Recording direct AC shared-memory telemetry. '+$script:PhysicsIdentityMessage)}
        Start-Sleep -Milliseconds $period
      }
    }catch{
      if(!(Test-Path -LiteralPath $StopPath)){Write-Status 'waiting' ($_.Exception.Message+' Retrying...');Start-Sleep -Milliseconds 1000}
    }finally{if($writer){$writer.Flush();$writer.Dispose();Write-RunManifest};Close-Map $p;Close-Map $g;Close-Map $s}
  }
  if($script:BlockedReason){Write-Status 'blocked' $script:BlockedReason}else{Write-Status 'stopped' 'Telemetry logger stopped cleanly.'}
}catch{Write-Status 'error' $_.Exception.Message;exit 1}
finally{if(Test-Path -LiteralPath $StopPath){Remove-Item -LiteralPath $StopPath -Force -ErrorAction SilentlyContinue}}
