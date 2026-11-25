# Dulces Lucho — mejora global de legibilidad

Esta actualización modifica únicamente `context/ThemeContext.js`, conservando las demás exportaciones y componentes que ya tenga la versión instalada.

## Cambios

- Aumenta alrededor de un 12% los tamaños `fontSize` en las hojas que usan `createThemedStyles`.
- Aumenta aproximadamente un 10% el interlineado para que el texto no quede apretado.
- En el modo oscuro baja el brillo del texto principal (`#DED2C1`), del secundario (`#A99A85`) y de los placeholders (`#8C7E6D`). Estos tonos mantienen contraste alto sobre el fondo oscuro.
- No cambia la distribución, navegación, lógica de negocio, stock, pedidos, pagos, envíos, servidor ni base de datos.

## Instalación

1. Extraé `actualizar_legibilidad_global.ps1` en la carpeta principal `Dulces-Lucho-App`, donde está `App.js`.
2. Abrí PowerShell en esa carpeta y ejecutá:

```powershell
powershell -ExecutionPolicy Bypass -File .\actualizar_legibilidad_global.ps1
```

3. El script crea automáticamente una copia de seguridad de `context/ThemeContext.js` antes de escribir.
4. Si no reconoce la versión del archivo, se detiene sin modificarlo. En ese caso, compartí `context/ThemeContext.js` para adaptar el cambio con precisión.
5. Reiniciá Expo desde la carpeta principal:

```powershell
npx expo start --lan -c
```

No es necesario reiniciar el backend ni ejecutar SQL.
