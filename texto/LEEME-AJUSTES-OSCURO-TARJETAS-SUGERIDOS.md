# Dulces Lucho – contraste, tarjetas y productos sugeridos

Este parche se aplica sobre la última versión estética de Dulces Lucho. No modifica backend, SQL, credenciales, sesión, stock, ventas ni proveedores.

## Archivos incluidos

- `context/ThemeContext.js`: mejora el contraste en modo oscuro. Los colores oscuros escritos directamente en estilos se convierten en un color legible cuando se usa la apariencia oscura. Los campos de texto también reciben color de escritura y los textos sin estilo usan el color principal del tema.
- `screens/HomeScreen.js`: aumenta el tamaño de las tarjetas del catálogo y fija un marco de imagen de dimensiones iguales. Las imágenes se ajustan dentro del marco con `contain` para que no deformen la tarjeta.
- `components/CarruselProductos.js`: aplica tarjetas de tamaño uniforme y mayor, con marcos de imagen fijos. Se utiliza tanto en el carrito como en los productos destacados y sugerencias.
- `screens/DetalleProducto.js`: reemplaza los enlaces de texto pequeños por una calesita de hasta cinco productos aleatorios disponibles. Usa las mismas tarjetas del carrito, permite abrir la ficha de cada producto y ofrece el botón Agregar con selector de cantidad.

## Instalación

1. Hacé una copia de seguridad del proyecto.
2. Extraé el ZIP en la carpeta raíz, donde está `App.js`.
3. Combiná las carpetas `context`, `screens` y `components`, reemplazando solamente los cuatro archivos incluidos.
4. No reemplaces `.env`, `backend/.env` ni cambies MySQL.
5. Reiniciá Expo:

```bash
npx expo start --lan -c
```

No hace falta reiniciar el backend ni ejecutar migraciones SQL.

## Pruebas recomendadas

1. Cambiar a Configuración → Apariencia → Oscuro y revisar textos, precios, cantidades y campos de escritura.
2. Revisar que todas las tarjetas del Inicio tengan el mismo tamaño aunque sus fotos tengan proporciones distintas.
3. Abrir una ficha de producto y comprobar que aparezcan hasta cinco sugerencias aleatorias disponibles.
4. Tocar una sugerencia para abrir su ficha y usar Agregar para añadirla al carrito desde el selector.
5. Abrir el carrito y comprobar que sus tarjetas mantienen el mismo tamaño y estilo.
