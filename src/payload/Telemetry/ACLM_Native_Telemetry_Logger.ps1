param(
  [string]$OutputDirectory = '',
  [ValidateSet(10,20,50)][int]$RateHz = 10,
  [string]$StatusPath = '',
  [string]$StopPath = '',
  [switch]$SelfTest
)
$ErrorActionPreference='Stop'
$Invariant=[Globalization.CultureInfo]::InvariantCulture
$WheelNames=@('fl','fr','rl','rr')
$PhysicsOffsets=@{
  packetId=0; throttle=4; brake=8; fuel=12; gear=16; rpm=20; steering=24; speedKmh=28
  velocity=32; accG=44; wheelSlip=56; wheelLoad=72; pressure=88; wheelAngularSpeed=104
  tyreWear=120; dirty=136; coreTemp=152; camber=168; suspensionTravel=184
  airTemp=288; roadTemp=292; brakeTemp=348; tempInner=368; tempMiddle=384; tempOuter=400
}
$GraphicsOffsets=@{packetId=0;status=4;session=8;completedLaps=132;position=136;currentTimeMs=140;distance=156;isInPit=160;compound=176;normalizedPosition=248;surfaceGrip=280}
$StaticOffsets=@{carModel=68;track=134}

function New-Headers {
  $h=[Collections.Generic.List[string]]::new()
  @('timestamp_utc','elapsed_ms','packet_id','car','track','compound','lap','lap_time_ms','normalized_track_position','distance_traveled_m','in_pit','speed_kmh','throttle','brake','steering','gear','rpm','fuel_l','air_temp_c','road_temp_c','surface_grip','velocity_x_mps','velocity_y_mps','velocity_z_mps','accg_lat','accg_vert','accg_long')|ForEach-Object{$h.Add($_)}
  foreach($metric in @('pressure_psi','wear_raw','core_temp_c','temp_inner_c','temp_middle_c','temp_outer_c','wheel_load_n','wheel_slip_raw','wheel_angular_speed_rad_s','camber_rad','suspension_travel_m','brake_temp_c','dirty_raw')){foreach($w in $WheelNames){$h.Add("${metric}_${w}")}}
  return $h.ToArray()
}
$Headers=New-Headers
if($SelfTest){
  if($PhysicsOffsets.tyreWear -ne 120 -or $PhysicsOffsets.coreTemp -ne 152 -or $PhysicsOffsets.tempInner -ne 368 -or $PhysicsOffsets.tempOuter -ne 400){throw 'Physics offset invariant failed.'}
  if($GraphicsOffsets.compound -ne 176 -or $GraphicsOffsets.normalizedPosition -ne 248 -or $StaticOffsets.track -ne 134){throw 'Graphics/static offset invariant failed.'}
  if($Headers.Count -ne 79){throw "CSV schema invariant failed: $($Headers.Count) columns."}
  @{ok=$true;schema='ACLM native telemetry 1.0';columns=$Headers.Count;rate_hz=$RateHz}|ConvertTo-Json -Compress
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

$script:Samples=0;$script:CsvPath=$null;$script:Car='';$script:Track='';$script:Started=[DateTime]::UtcNow;$script:LastStatus=[DateTime]::MinValue
function Write-Status([string]$State,[string]$Message){
  $dir=Split-Path -Parent $StatusPath;if($dir){[IO.Directory]::CreateDirectory($dir)|Out-Null}
  $obj=[ordered]@{state=$State;message=$Message;pid=$PID;rate_hz=$RateHz;samples=$script:Samples;file=$script:CsvPath;output_directory=$OutputDirectory;car=$script:Car;track=$script:Track;updated_utc=[DateTime]::UtcNow.ToString('o')}
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
  if($value-is [float]-or $value-is [double]-or $value-is [decimal]){return ([Convert]::ToDouble($value)).ToString('0.########',$Invariant)}
  $s=[string]$value;if($s.IndexOfAny([char[]]",`"`r`n")-ge 0){return '"'+$s.Replace('"','""')+'"'};return $s
}
function Safe-Name([string]$s){if([string]::IsNullOrWhiteSpace($s)){return 'unknown'};return (($s-replace '[^A-Za-z0-9._-]+','_').Trim('_')).Substring(0,[Math]::Min(60,(($s-replace '[^A-Za-z0-9._-]+','_').Trim('_')).Length))}

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
          $script:Car=WS $s.View $StaticOffsets.carModel 33;$script:Track=WS $s.View $StaticOffsets.track 33
          $stamp=[DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss');$script:CsvPath=Join-Path $OutputDirectory ("ACLM_AC_${stamp}_$(Safe-Name $script:Car)_$(Safe-Name $script:Track).csv")
          $writer=[IO.StreamWriter]::new($script:CsvPath,$false,(New-Object Text.UTF8Encoding($false)));$writer.WriteLine(($Headers-join ','));$writer.Flush();$script:Started=[DateTime]::UtcNow
          Write-Status 'recording' 'Recording direct AC shared-memory telemetry.'
        }
        $packet=I $p.View $PhysicsOffsets.packetId
        if($packet -eq $lastPacket){Start-Sleep -Milliseconds $period;continue};$lastPacket=$packet
        $row=[Collections.Generic.List[object]]::new()
        $row.Add([DateTime]::UtcNow.ToString('o'));$row.Add([int]([DateTime]::UtcNow-$script:Started).TotalMilliseconds);$row.Add($packet);$row.Add($script:Car);$row.Add($script:Track);$row.Add((WS $g.View $GraphicsOffsets.compound 33));$row.Add((I $g.View $GraphicsOffsets.completedLaps));$row.Add((I $g.View $GraphicsOffsets.currentTimeMs));$row.Add((F $g.View $GraphicsOffsets.normalizedPosition));$row.Add((F $g.View $GraphicsOffsets.distance));$row.Add((I $g.View $GraphicsOffsets.isInPit));$row.Add((F $p.View $PhysicsOffsets.speedKmh));$row.Add((F $p.View $PhysicsOffsets.throttle));$row.Add((F $p.View $PhysicsOffsets.brake));$row.Add((F $p.View $PhysicsOffsets.steering));$row.Add((I $p.View $PhysicsOffsets.gear));$row.Add((I $p.View $PhysicsOffsets.rpm));$row.Add((F $p.View $PhysicsOffsets.fuel));$row.Add((F $p.View $PhysicsOffsets.airTemp));$row.Add((F $p.View $PhysicsOffsets.roadTemp));$row.Add((F $g.View $GraphicsOffsets.surfaceGrip))
        foreach($x in (FA $p.View $PhysicsOffsets.velocity 3)){$row.Add($x)};foreach($x in (FA $p.View $PhysicsOffsets.accG 3)){$row.Add($x)}
        foreach($offset in @($PhysicsOffsets.pressure,$PhysicsOffsets.tyreWear,$PhysicsOffsets.coreTemp,$PhysicsOffsets.tempInner,$PhysicsOffsets.tempMiddle,$PhysicsOffsets.tempOuter,$PhysicsOffsets.wheelLoad,$PhysicsOffsets.wheelSlip,$PhysicsOffsets.wheelAngularSpeed,$PhysicsOffsets.camber,$PhysicsOffsets.suspensionTravel,$PhysicsOffsets.brakeTemp,$PhysicsOffsets.dirty)){foreach($x in (FA $p.View $offset 4)){$row.Add($x)}}
        if($row.Count -ne $Headers.Count){throw "Row/schema mismatch: $($row.Count)/$($Headers.Count)."}
        $writer.WriteLine((@($row|ForEach-Object{Csv $_})-join ','));$script:Samples++
        if(($script:Samples%$RateHz)-eq 0){$writer.Flush();Write-Status 'recording' 'Recording direct AC shared-memory telemetry.'}
        Start-Sleep -Milliseconds $period
      }
    }catch{
      if(!(Test-Path -LiteralPath $StopPath)){Write-Status 'waiting' ($_.Exception.Message+' Retrying...');Start-Sleep -Milliseconds 1000}
    }finally{if($writer){$writer.Flush();$writer.Dispose()};Close-Map $p;Close-Map $g;Close-Map $s}
  }
  Write-Status 'stopped' 'Telemetry logger stopped cleanly.'
}catch{Write-Status 'error' $_.Exception.Message;exit 1}
finally{if(Test-Path -LiteralPath $StopPath){Remove-Item -LiteralPath $StopPath -Force -ErrorAction SilentlyContinue}}
