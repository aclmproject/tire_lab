param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'
$checkpointPath = Join-Path $RepositoryRoot 'research_staging\checkpoint_004_milestone4_fulltext'
$queue = Get-Content (Join-Path $checkpointPath 'fulltext_priority_queue.json') -Raw | ConvertFrom-Json
$results = [System.Collections.Generic.List[object]]::new()

foreach ($source in $queue) {
    $citationId = [regex]::Match($source.canonicalUrl, '/citations/(\d+)').Groups[1].Value
    $apiUrl = "https://ntrs.nasa.gov/api/citations/$citationId"
    try {
        $metadata = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 60 -MaximumRetryCount 2 -UserAgent 'ACLM-Tire-Lab-Research/1.0'
        $results.Add([pscustomobject]@{
            sourceId = $source.sourceId
            ntrsCitationId = $citationId
            metadataStatus = 'RETRIEVED'
            reportNumber = @($metadata.reportNumber)
            accessionNumber = $metadata.accessionNumber
            documentId = $metadata.id
            distribution = $metadata.distribution
            subjectCategories = @($metadata.subjectCategories)
        })
    }
    catch {
        $results.Add([pscustomobject]@{
            sourceId = $source.sourceId
            ntrsCitationId = $citationId
            metadataStatus = 'FAILED'
            reportNumber = @()
            accessionNumber = $null
            documentId = $null
            distribution = $null
            subjectCategories = @()
            error = $_.Exception.Message
        })
    }
}

$output = Join-Path $checkpointPath 'ntrs_metadata.json'
[System.IO.File]::WriteAllText($output, ($results | ConvertTo-Json -Depth 8) + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
$results | Group-Object metadataStatus | Select-Object Name,Count | Format-Table -AutoSize
