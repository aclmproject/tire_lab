function Read-ACLMGeneratedManifest {
  param([string]$Path,[string]$FallbackVersion='0.10.2')
  if($Path -and (Test-Path -LiteralPath $Path -PathType Leaf)){
    $manifest=(Get-Content -Raw -Encoding UTF8 -LiteralPath $Path)|ConvertFrom-Json
    if(!$manifest.schema){throw 'Generated telemetry manifest schema is missing.'}
    if(!$manifest.appVersion){$manifest|Add-Member -NotePropertyName appVersion -NotePropertyValue $FallbackVersion -Force}
    return $manifest
  }
  return [pscustomobject][ordered]@{schema='ACLM telemetry calibration manifest 1.2';appVersion=$FallbackVersion;generatedConfigurationStatus='missing';generatedConfigurationWarning='No generated TirePack manifest reached the logger; runtime evidence is retained but cannot be joined to a generated configuration.'}
}

function Get-ACLMFileSha256 {
  param([string]$Path)
  if([string]::IsNullOrWhiteSpace($Path)-or!(Test-Path -LiteralPath $Path -PathType Leaf)){return $null}
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Read-ACLMSimpleIni {
  param([string]$Path)
  $sections=[ordered]@{};$section='ROOT';$sections[$section]=[ordered]@{}
  foreach($raw in Get-Content -Encoding UTF8 -LiteralPath $Path){
    $line=[string]$raw
    if($line-match'^\s*\[([^]]+)\]\s*$'){$section=$matches[1].Trim();if(!$sections.Contains($section)){$sections[$section]=[ordered]@{}};continue}
    if($line-match'^\s*([^;#][^=]*?)\s*=\s*(.*?)\s*(?:[;#].*)?$'){$sections[$section][$matches[1].Trim()]=$matches[2].Trim()}
  }
  return $sections
}

function Resolve-ACLMAssettoCorsaRoot {
  param([string]$ExplicitRoot='')
  foreach($candidate in @($ExplicitRoot,$env:ACLM_ASSETTO_CORSA_ROOT)){
    if(![string]::IsNullOrWhiteSpace($candidate)-and(Test-Path -LiteralPath (Join-Path $candidate 'content\cars') -PathType Container)){return [IO.Path]::GetFullPath($candidate)}
  }
  foreach($name in @('acs','acs_x86')){
    foreach($process in @(Get-Process -Name $name -ErrorAction SilentlyContinue)){
      try{$root=Split-Path -Parent $process.MainModule.FileName;if(Test-Path -LiteralPath (Join-Path $root 'content\cars') -PathType Container){return [IO.Path]::GetFullPath($root)}}catch{}
    }
  }
  return $null
}

function Get-ACLMActiveInstalledPhysics {
  param([string]$CarId,[string]$ObservedCompoundString,[string]$AssettoCorsaRoot='')
  $root=Resolve-ACLMAssettoCorsaRoot -ExplicitRoot $AssettoCorsaRoot
  if([string]::IsNullOrWhiteSpace($root)){return [pscustomobject][ordered]@{status='ACTIVE_PHYSICS_UNRESOLVED';carId=$CarId;warning='Assetto Corsa root could not be resolved from an explicit setting, ACLM_ASSETTO_CORSA_ROOT, or the running AC process.'}}
  $carRoot=Join-Path $root ('content\cars\'+$CarId);$data=Join-Path $carRoot 'data';$tyres=Join-Path $data 'tyres.ini'
  if(!(Test-Path -LiteralPath $tyres -PathType Leaf)){
    $acd=Join-Path $carRoot 'data.acd';$reason=if(Test-Path -LiteralPath $acd -PathType Leaf){'The active car uses data.acd and no loose data/tyres.ini is available for authoritative hashing.'}else{'The active car data/tyres.ini was not found.'}
    return [pscustomobject][ordered]@{status='ACTIVE_PHYSICS_UNRESOLVED';carId=$CarId;assettoCorsaRoot=$root;carRoot=$carRoot;warning=$reason}
  }
  $ini=Read-ACLMSimpleIni $tyres;$compoundRows=New-Object Collections.Generic.List[object]
  foreach($section in @($ini.Keys|Where-Object{$_-match'^FRONT(?:_\d+)?$'})){
    $values=$ini[$section];$name=[string]$values.NAME;$short=[string]$values.SHORT_NAME;$wearCurve=[string]$values.WEAR_CURVE;$slot=$null
    if($wearCurve-match'(?i)aclm_([^_]+)_'){$slot=$matches[1].ToLowerInvariant()}
    [void]$compoundRows.Add([pscustomobject][ordered]@{section=$section;name=$name;shortName=$short;internalSlot=$slot;pressureStaticPsi=if($values.PRESSURE_STATIC-ne$null){[double]$values.PRESSURE_STATIC}else{$null};pressureIdealPsi=if($values.PRESSURE_IDEAL-ne$null){[double]$values.PRESSURE_IDEAL}else{$null};wearCurve=$wearCurve})
  }
  $observedBase=([string]$ObservedCompoundString-replace'\s*\([^)]*\)\s*$','').Trim();$activeCompound=$compoundRows|Where-Object{$_.name-eq$observedBase-or($_.shortName-and[regex]::IsMatch([string]$ObservedCompoundString,'\('+[regex]::Escape($_.shortName)+'\)\s*$'))}|Select-Object -First 1
  $rearSections=@($ini.Keys|Where-Object{$_-match'^REAR(?:_\d+)?$'});$rear=$null
  if($activeCompound){$suffix=([string]$activeCompound.section).Substring(5);$rearName='REAR'+$suffix;if($ini.Contains($rearName)){$rear=$ini[$rearName]}}
  if(!$rear-and$rearSections.Count){$rear=$ini[$rearSections[0]]}
  $lutNames=New-Object Collections.Generic.List[string]
  foreach($row in $compoundRows){if($row.wearCurve){[void]$lutNames.Add($row.wearCurve)}}
  foreach($section in @($ini.Keys|Where-Object{$_-match'^REAR(?:_\d+)?$'-or$_-match'^THERMAL(?:2)?_(?:FRONT|REAR)(?:_\d+)?$'})){foreach($key in @('WEAR_CURVE','PERFORMANCE_CURVE')){if($ini[$section][$key]){[void]$lutNames.Add([string]$ini[$section][$key])}}}
  $lutHashes=[ordered]@{};foreach($name in @($lutNames|Select-Object -Unique)){$hash=Get-ACLMFileSha256 (Join-Path $data $name);if($hash){$lutHashes[$name]=$hash}}
  $frontStatic=if($activeCompound){$activeCompound.pressureStaticPsi}else{$null};$frontIdeal=if($activeCompound){$activeCompound.pressureIdealPsi}else{$null};$rearStatic=if($rear-and$rear.PRESSURE_STATIC-ne$null){[double]$rear.PRESSURE_STATIC}else{$null};$rearIdeal=if($rear-and$rear.PRESSURE_IDEAL-ne$null){[double]$rear.PRESSURE_IDEAL}else{$null}
  return [pscustomobject][ordered]@{
    status='ACTIVE_PHYSICS_OBSERVED';identitySource='LOOSE_INSTALLED_PHYSICS_HASH';carId=$CarId;assettoCorsaRoot=$root;carRoot=$carRoot;dataPath=$data
    tyresIniSha256=(Get-ACLMFileSha256 $tyres);carIniSha256=(Get-ACLMFileSha256 (Join-Path $data 'car.ini'));lutSha256=[pscustomobject]$lutHashes
    installedCompounds=@($compoundRows|ForEach-Object{$_});observedCompoundString=$ObservedCompoundString
    activeCompoundIdentity=if($activeCompound){[pscustomobject][ordered]@{name=$activeCompound.name;shortName=$activeCompound.shortName;internalSlot=$activeCompound.internalSlot;source='installed tyres.ini matched to AC shared-memory compound string'}}else{[pscustomobject][ordered]@{name=$observedBase;shortName=$null;internalSlot=$null;source='AC shared-memory string; installed section match unresolved'}}
    activePressureStaticFrontPsi=$frontStatic;activePressureStaticRearPsi=$rearStatic;activePressureIdealFrontPsi=$frontIdeal;activePressureIdealRearPsi=$rearIdeal
  }
}

function Merge-ACLMRunManifest {
  param($Generated,$ActiveInstalledPhysics,$Observed,$Runtime,[string]$FallbackVersion='0.10.2')
  if($null-eq$Generated){$Generated=Read-ACLMGeneratedManifest -FallbackVersion $FallbackVersion}
  $generatedCopy=(($Generated|ConvertTo-Json -Depth 40)|ConvertFrom-Json)
  $result=[ordered]@{};foreach($property in $Generated.PSObject.Properties){$result[$property.Name]=$property.Value}
  if(!$result.Contains('schema')){$result.schema='ACLM telemetry calibration manifest 1.2'}
  if(!$result.Contains('appVersion')-or[string]::IsNullOrWhiteSpace([string]$result.appVersion)){$result.appVersion=$FallbackVersion}
  $generatedHash=([string]$Generated.tireFileSha256).ToLowerInvariant();$activeHash=([string]$ActiveInstalledPhysics.tyresIniSha256).ToLowerInvariant();$hashMatch=$null;$identityStatus='ACTIVE_PHYSICS_UNRESOLVED'
  if(![string]::IsNullOrWhiteSpace($activeHash)-and![string]::IsNullOrWhiteSpace($generatedHash)){$hashMatch=$activeHash-eq$generatedHash;$identityStatus=if($hashMatch){'MATCH'}else{'STALE/HASH_MISMATCH'}}elseif(![string]::IsNullOrWhiteSpace($activeHash)){$identityStatus='ACTIVE_PHYSICS_OBSERVED / GENERATED_CONFIG_MISSING'}
  $observedCompound=if($Runtime.observedCompoundString){[string]$Runtime.observedCompoundString}elseif($Observed.observedCompoundString){[string]$Observed.observedCompoundString}else{''}
  $activeCompound=if($ActiveInstalledPhysics.activeCompoundIdentity){$ActiveInstalledPhysics.activeCompoundIdentity}else{[pscustomobject][ordered]@{name=($observedCompound-replace'\s*\([^)]*\)\s*$','').Trim();shortName=$null;internalSlot=$null;source='AC shared memory'}}
  $availableMenu=if($Generated.availableCompoundMenu){$Generated.availableCompoundMenu}elseif($Generated.profileState.context.menu){$Generated.profileState.context.menu}else{@()}
  $result.generatedConfiguration=$generatedCopy;$result.activeInstalledPhysics=$ActiveInstalledPhysics;$result.observedACCondition=$Observed;$result.observedRuntimeState=$Runtime
  $result.physicsIdentityStatus=$identityStatus;$result.physicsHashMatch=$hashMatch;$result.activeTyresIniSha256=if($activeHash){$activeHash}else{$null};$result.generatedTyresIniSha256=if($generatedHash){$generatedHash}else{$null}
  $result.physicsIdentityWarning=if($identityStatus-eq'STALE/HASH_MISMATCH'){'Generated handoff is stale. Active installed physics identity is authoritative; generated pressure and compound fields are retained only inside generatedConfiguration.'}elseif($identityStatus-ne'MATCH'){'Generated provenance could not be hash-matched to active installed physics.'}else{$null}
  $result.availableCompoundMenu=$availableMenu;$result.generatedCompounds=@($Generated.compound);$result.activeSelectedCompound=$activeCompound;$result.observedCompoundString=$observedCompound
  if($activeCompound.internalSlot){$result.compound=@([string]$activeCompound.internalSlot)}elseif($activeCompound.name){$result.compound=@([string]$activeCompound.name)}
  $result.compoundIdentitySource='ACTIVE_INSTALLED_PHYSICS_PLUS_SHARED_MEMORY';$result.generatedRecommendedSetupPressure=$Generated.pressureReference
  if(![string]::IsNullOrWhiteSpace($activeHash)){$result.tireFileSha256=$activeHash}
  $result.activePressureStaticFrontPsi=$ActiveInstalledPhysics.activePressureStaticFrontPsi;$result.activePressureStaticRearPsi=$ActiveInstalledPhysics.activePressureStaticRearPsi;$result.activePressureIdealFrontPsi=$ActiveInstalledPhysics.activePressureIdealFrontPsi;$result.activePressureIdealRearPsi=$ActiveInstalledPhysics.activePressureIdealRearPsi
  if($identityStatus-ne'MATCH'-and$ActiveInstalledPhysics){$result.pressureReference=[pscustomobject][ordered]@{identitySource='ACTIVE_INSTALLED_PHYSICS';activePressureStaticFrontPsi=$ActiveInstalledPhysics.activePressureStaticFrontPsi;activePressureStaticRearPsi=$ActiveInstalledPhysics.activePressureStaticRearPsi;activePressureIdealFrontPsi=$ActiveInstalledPhysics.activePressureIdealFrontPsi;activePressureIdealRearPsi=$ActiveInstalledPhysics.activePressureIdealRearPsi;generatedRecommendedSetupPressure=$Generated.pressureReference;observedStartingPressure=$Observed.initialPressurePsi}}
  if($Runtime.track){$result.track=$Runtime.track;$result.trackIdentitySource='LOGGER_RUNTIME_OBSERVED'}
  if($Observed.initialCoreTemperatureC){$result.observedStartingThermalState=[pscustomobject][ordered]@{temperatureC=$Observed.initialCoreTemperatureC;source='DIRECT_TELEMETRY';authority='recorded Assetto Corsa physics shared memory'}}
  if($null-ne$Observed.rawAidTireRate){$result.rawAidTireRate=$Observed.rawAidTireRate;$result.aidTireRateInterpretation='UNKNOWN';$result.aidTireRateMeaning='A raw value of 0 does not mean tire wear was disabled.'}
  return [pscustomobject]$result
}
