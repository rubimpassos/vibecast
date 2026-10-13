[CmdletBinding()]
param(
    [ValidateSet('renderer', 'backend')]
    [string]$Probe = 'renderer'
)

$ErrorActionPreference = 'Stop'
$sourcePath = Join-Path $PSScriptRoot "$Probe-probe.cjs"
$sourceText = Get-Content -LiteralPath $sourcePath -Raw
$invocation = if ($Probe -eq 'backend') {
    'JSON.stringify(await vibecastBackendProbe(), null, 2)'
} else {
    'JSON.stringify(vibecastRendererProbe(), null, 2)'
}

# Coloca somente código de diagnóstico no clipboard. Não lê o clipboard,
# configurações de aplicativos, tokens ou dados de rede.
$snippet = $sourceText + [Environment]::NewLine + $invocation
Set-Clipboard -Value $snippet

if ($Probe -eq 'backend') {
    Write-Host 'Sonda copiada. Cole no console do Web UI HTTPS local do Vibeshine, após login normal.'
} else {
    Write-Host 'Sonda copiada. Cole no console do Discord desktop com Vencord, dentro da chamada.'
}
Write-Host 'Execute e envie somente o JSON resultante. Se aparecer erro, informe a etapa e o erro sem credenciais.'
