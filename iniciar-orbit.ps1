param([switch]$SomenteVerificar)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeDirectory = Join-Path $env:ProgramFiles 'nodejs'
if (Test-Path -LiteralPath $nodeDirectory) { $env:Path = "$nodeDirectory;$env:Path" }
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$npx = (Get-Command npx.cmd -ErrorAction Stop).Source
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha ao executar $Program. Verifique a mensagem acima." }
}
try {
    # Windows PowerShell 5 writes a BOM with Set-Content -Encoding utf8.
    # Expo requires plain UTF-8 JSON. Normalize previous launcher output too.
    $manifestPath = Join-Path $PSScriptRoot 'package.json'
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $manifestText = [System.IO.File]::ReadAllText($manifestPath)
    $null = $manifestText | ConvertFrom-Json
    [System.IO.File]::WriteAllText($manifestPath, $manifestText, $utf8NoBom)
    if (!(Test-Path -LiteralPath 'node_modules/expo/package.json')) {
        Write-Host 'Consultando a versao estavel do Expo e suas dependencias compativeis...'
        $setupDirectory = Join-Path $PSScriptRoot '.orbit-setup'
        New-Item -ItemType Directory -Force -Path $setupDirectory | Out-Null
        $packOutput = & $npm pack expo@latest --json --pack-destination $setupDirectory --fetch-retries=0 --fetch-timeout=20000
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel baixar o Expo. Verifique o acesso a registry.npmjs.org.' }
        $packed = ($packOutput | Out-String | ConvertFrom-Json)[0]
        $archive = Join-Path $setupDirectory $packed.filename
        $bundleText = & tar -xOf $archive package/bundledNativeModules.json
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel ler a matriz de dependencias do Expo.' }
        $bundle = $bundleText | Out-String | ConvertFrom-Json
        $manifest = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
        $manifest.dependencies.expo = $packed.version
        foreach ($name in @('expo-router','expo-status-bar','expo-linking','expo-constants','react','react-native','react-native-web','react-native-safe-area-context','react-native-screens','@react-native-async-storage/async-storage')) {
            $version = $bundle.$name
            if (!$version) { throw "O Expo nao informou a versao de $name. Nenhum arquivo foi alterado." }
            $manifest.dependencies.$name = $version
        }
        $manifest.dependencies.'react-dom' = $manifest.dependencies.react
        $reactVersion = $manifest.dependencies.react -replace '^[^0-9]*',''
        $reactParts = $reactVersion.Split('.')
        $manifest.devDependencies.'@types/react' = "~$($reactParts[0]).$($reactParts[1]).0"
        $manifestJson = $manifest | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($manifestPath, $manifestJson, $utf8NoBom)
        Invoke-Checked $npm @('install')
    }
    if ($SomenteVerificar) {
        Invoke-Checked $npx @('expo','install','--fix')
        Invoke-Checked $npx @('expo-doctor')
    }
    if (!(Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
    Invoke-Checked $npm @('run','typecheck')
    Invoke-Checked $npm @('test')
    if (!$SomenteVerificar) { Invoke-Checked $npm @('run','web') }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
