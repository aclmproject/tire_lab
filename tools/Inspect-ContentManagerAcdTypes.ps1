param([string]$ContentManagerPath='C:\Users\spam\Downloads\Content Manager (0.8.1976.36095)\Content Manager.exe')
$assembly=[Reflection.Assembly]::LoadFile($ContentManagerPath)
$types=try{$assembly.GetTypes()}catch [Reflection.ReflectionTypeLoadException]{$_.Exception.Types|Where-Object{$_}}
$types|Where-Object{$_.FullName-match'Acd|Packed.*Data|Data.*Acd|Acd.*Data|Unpack'}|ForEach-Object{
  [pscustomobject]@{Type=$_.FullName;Methods=@($_.GetMethods([Reflection.BindingFlags]'Public,NonPublic,Static,Instance')|Select-Object -ExpandProperty Name -Unique)-join','}
}|Sort-Object Type|Format-List
