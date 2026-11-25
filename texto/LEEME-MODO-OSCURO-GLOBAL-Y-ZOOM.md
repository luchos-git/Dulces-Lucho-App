# Modo oscuro global y visor ampliado de imágenes

## Qué se corrigió

- Todas las pantallas y componentes que muestran texto utilizan `ThemedText`, que detecta colores oscuros de texto y los reemplaza por el color legible del tema cuando está activo el modo oscuro.
- Todos los campos `TextInput` usan `ThemedTextInput`, que define color de escritura, placeholder y cursor según el tema. Esto incluye cantidades, números y formularios.
- Se conserva el texto claro que ya está pensado para mostrarse sobre fondos oscuros (por ejemplo, el cartel AGOTADO y las flechas del visor).
- En la pantalla de detalle, tocar la imagen abre un visor a pantalla completa. Se puede tocar la imagen para ampliar/reducir, usar + y − para ajustar el zoom, restablecer al 100% y recorrer las fotos disponibles.
- El visor admite desplazamiento horizontal y vertical cuando la imagen está ampliada.

## Instalación

1. Hacé una copia de seguridad del proyecto.
2. Extraé el contenido del ZIP en la carpeta principal, donde está `App.js`.
3. Aceptá combinar carpetas y reemplazar los archivos.
4. No reemplaces `.env`, `backend/.env` ni archivos de base de datos.
5. Reiniciá Expo:

```bash
npx expo start --lan -c
```

No hace falta ejecutar SQL ni reiniciar el backend.

## Archivos

- `context/ThemeContext.js`
- `App.js`
- todas las pantallas de `screens/`
- todos los componentes de `components/`
- `navigation/DrawerMenu.js`
- `components/SliderImagenes.js` ahora informa qué foto fue tocada para abrir el visor.
