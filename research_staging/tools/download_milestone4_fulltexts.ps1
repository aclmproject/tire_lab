param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'
$sourcePath = Join-Path $RepositoryRoot 'research_staging\checkpoint_003_milestone3_archive_first\layer_e_source_reviews.jsonl'
$checkpointPath = Join-Path $RepositoryRoot 'research_staging\checkpoint_004_milestone4_fulltext'
$pdfPath = Join-Path $checkpointPath 'fulltext_sources'

New-Item -ItemType Directory -Force -Path $pdfPath | Out-Null

$sources = @(Get-Content -LiteralPath $sourcePath | ForEach-Object { $_ | ConvertFrom-Json })
$queue = @($sources | Where-Object {
    $_.archive -like 'NASA*' -and $_.fullTextUrl -match '\.pdf$'
} | Sort-Object @{ Expression = 'relevanceScore'; Descending = $true }, sourceId)

$results = [System.Collections.Generic.List[object]]::new()
foreach ($source in $queue) {
    $destination = Join-Path $pdfPath ($source.sourceId + '.pdf')
    $status = 'RETRIEVED'
    $errorMessage = $null
    try {
        if (-not (Test-Path -LiteralPath $destination) -or (Get-Item -LiteralPath $destination).Length -lt 1024) {
            Invoke-WebRequest -Uri $source.fullTextUrl -OutFile $destination -TimeoutSec 90 -MaximumRetryCount 2 -UserAgent 'ACLM-Tire-Lab-Research/1.0'
        }
        $item = Get-Item -LiteralPath $destination
        $header = [System.IO.File]::ReadAllBytes($destination)[0..3]
        if ([System.Text.Encoding]::ASCII.GetString($header) -ne '%PDF') {
            throw 'Retrieved content is not a PDF.'
        }
        $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        $bytes = $item.Length
    }
    catch {
        $status = 'ACCESS_BLOCKED_OR_RETRIEVAL_FAILED'
        $errorMessage = $_.Exception.Message
        $hash = $null
        $bytes = if (Test-Path -LiteralPath $destination) { (Get-Item -LiteralPath $destination).Length } else { 0 }
    }

    $results.Add([pscustomobject]@{
        sourceId = $source.sourceId
        title = $source.title
        publicationYear = $source.publicationYear
        canonicalUrl = $source.canonicalUrl
        fullTextUrl = $source.fullTextUrl
        priorityTopics = @($source.topics)
        relevanceScore = $source.relevanceScore
        retrievalStatus = $status
        localPdf = if ($status -eq 'RETRIEVED') { 'fulltext_sources/' + $source.sourceId + '.pdf' } else { $null }
        bytes = $bytes
        sha256 = $hash
        retrievalError = $errorMessage
    })
}

$manifestPath = Join-Path $checkpointPath 'fulltext_acquisition_manifest.json'
$json = $results | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($manifestPath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

$summary = $results | Group-Object retrievalStatus | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ status = $_.Name; count = $_.Count }
}
$summary | Format-Table -AutoSize
