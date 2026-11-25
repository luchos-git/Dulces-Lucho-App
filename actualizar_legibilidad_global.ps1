$ErrorActionPreference = 'Stop'

# Este script modifica únicamente context/ThemeContext.js.
# Conserva los componentes y las exportaciones que ya tenga la versión instalada.
$archivo = Join-Path $PSScriptRoot 'context\ThemeContext.js'

if (-not (Test-Path -LiteralPath $archivo -PathType Leaf)) {
  throw "No encontré '$archivo'. Extraé este archivo ZIP en la carpeta principal Dulces-Lucho-App, donde está App.js. No se modificó ningún archivo."
}

$contenidoOriginal = [System.IO.File]::ReadAllText($archivo, [System.Text.Encoding]::UTF8)
$contenido = $contenidoOriginal

# Escala las tipografías de las hojas que usan createThemedStyles.
# Se conserva el diseño y no se reemplaza el ThemeContext completo.
$anclaFuente = 'const base = StyleSheet.create(definicion);'
$anclaNueva = 'const definicionConTipografia = Object.keys(definicion).reduce('

if (-not $contenido.Contains($anclaNueva)) {
  $cantidadAnclas = ([regex]::Matches($contenido, [regex]::Escape($anclaFuente))).Count
  if ($cantidadAnclas -ne 1) {
    throw "No reconocí con seguridad la versión de createThemedStyles en ThemeContext.js. No se modificó ningún archivo. Compartime ese archivo para adaptar el cambio a tu versión."
  }

  $reemplazoFuente = @'
  const definicionConTipografia = Object.keys(definicion).reduce((resultado, nombre) => {
    const estilo = definicion[nombre];
    if (!estilo || typeof estilo !== 'object' || Array.isArray(estilo)) {
      resultado[nombre] = estilo;
      return resultado;
    }

    const ajustado = { ...estilo };
    if (typeof ajustado.fontSize === 'number' && ajustado.fontSize > 0) {
      ajustado.fontSize = Math.ceil(ajustado.fontSize * 1.12);
    }
    if (typeof ajustado.lineHeight === 'number' && ajustado.lineHeight > 0) {
      ajustado.lineHeight = Math.ceil(ajustado.lineHeight * 1.10);
    }

    resultado[nombre] = ajustado;
    return resultado;
  }, {});
  const base = StyleSheet.create(definicionConTipografia);
'@

  $contenido = $contenido.Replace($anclaFuente, $reemplazoFuente.TrimEnd())
}

# Ajusta únicamente los colores de texto del tema oscuro.
# Los nuevos tonos reducen el blanco brillante y mantienen contraste alto sobre el fondo oscuro.
$coincidenciaOscuro = [regex]::Match(
  $contenido,
  '(?s)(oscuro\s*:\s*\{)(.*?)(\r?\n\s*\},)'
)

if (-not $coincidenciaOscuro.Success) {
  throw "No encontré el bloque del tema oscuro en ThemeContext.js. No se modificó ningún archivo."
}

$bloqueOscuro = $coincidenciaOscuro.Groups[2].Value
$reemplazos = @(
  [pscustomobject]@{ Patron = 'text\s*:\s*[''"]#F5EBDD[''"]'; Nuevo = "text: '#DED2C1'"; Ya = 'text\s*:\s*[''"]#DED2C1[''"]'; Nombre = 'texto principal' },
  [pscustomobject]@{ Patron = 'muted\s*:\s*[''"]#C0B29E[''"]'; Nuevo = "muted: '#A99A85'"; Ya = 'muted\s*:\s*[''"]#A99A85[''"]'; Nombre = 'texto secundario' },
  [pscustomobject]@{ Patron = 'placeholder\s*:\s*[''"]#AFA08D[''"]'; Nuevo = "placeholder: '#8C7E6D'"; Ya = 'placeholder\s*:\s*[''"]#8C7E6D[''"]'; Nombre = 'texto de ayuda' }
)

foreach ($item in $reemplazos) {
  if ($bloqueOscuro -match $item.Patron) {
    $bloqueOscuro = [regex]::Replace($bloqueOscuro, $item.Patron, $item.Nuevo)
  } elseif ($bloqueOscuro -notmatch $item.Ya) {
    throw "No reconocí el color de $($item.Nombre) en el tema oscuro. No se modificó ningún archivo."
  }
}

$bloqueCompletoNuevo = $coincidenciaOscuro.Groups[1].Value + $bloqueOscuro + $coincidenciaOscuro.Groups[3].Value
$contenido = $contenido.Substring(0, $coincidenciaOscuro.Index) + $bloqueCompletoNuevo + $contenido.Substring($coincidenciaOscuro.Index + $coincidenciaOscuro.Length)

if ($contenido -eq $contenidoOriginal) {
  Write-Host 'La mejora de legibilidad ya estaba aplicada. No hubo cambios.' -ForegroundColor Yellow
  exit 0
}

$marcaTiempo = Get-Date -Format 'yyyyMMdd-HHmmss'
$respaldo = "$archivo.backup-legibilidad-$marcaTiempo"
Copy-Item -LiteralPath $archivo -Destination $respaldo

$utf8SinBOM = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($archivo, $contenido, $utf8SinBOM)

Write-Host 'Se actualizó la legibilidad global.' -ForegroundColor Green
Write-Host 'Tipografías: aproximadamente 12% más grandes; interlineado: 10% mayor.'
Write-Host 'Modo oscuro: texto principal y secundario menos brillantes, conservando contraste alto.'
Write-Host "Copia de seguridad: $respaldo"
Write-Host 'Solo se modificó context/ThemeContext.js. No se tocaron pantallas, pagos, pedidos, stock, envíos, backend ni base de datos.'
