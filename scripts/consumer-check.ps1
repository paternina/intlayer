# Installs the packed tarball into an empty project and checks ESM, CJS and TypeScript consumers.
# Usage: npm pack; pwsh scripts/consumer-check.ps1 paternina-intlayer-1.0.0.tgz
param([Parameter(Mandatory)][string]$Tarball)
$ErrorActionPreference = 'Stop'
$tgz = (Resolve-Path $Tarball).Path
$d = Join-Path ([IO.Path]::GetTempPath()) "intlayer-consumer-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory $d | Out-Null
Push-Location $d
try {
  npm init -y | Out-Null
  npm i $tgz typescript@latest 2>&1 | Select-Object -Last 2
  Set-Content a.mjs "import { createI18n } from '@paternina/intlayer'; console.log('esm', createI18n({locale:'en',messages:{en:{a:'ok'}}}).t('a'))"
  Set-Content b.cjs "const { createI18n } = require('@paternina/intlayer'); console.log('cjs', createI18n({locale:'en',messages:{en:{a:'ok'}}}).t('a'))"
  node a.mjs; node b.cjs
  Set-Content c.ts "import { createI18n, validateMessages, type I18nInstance } from '@paternina/intlayer'
const i18n: I18nInstance<'a' | 'b.c'> = createI18n<'a' | 'b.c'>({ locale: 'en', messages: { en: { a: 'x', b: { c: 'y' } } } })
i18n.t('a'); i18n.t('b.c', { n: 1 }); validateMessages({ a: 'x' })
// @ts-expect-error unknown key must not compile
i18n.t('nope')"
  foreach ($r in 'node16', 'nodenext', 'bundler') {
    $mod = if ($r -eq 'bundler') { 'esnext' } else { $r }
    npx tsc --noEmit --strict --skipLibCheck false --module $mod --moduleResolution $r --target es2022 c.ts
    "tsc ($r): exit $LASTEXITCODE"
  }
} finally { Pop-Location; Remove-Item -Recurse -Force $d }
