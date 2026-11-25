# Archivos incluidos

- `screens/AdminStockScreen.js`: elimina el campo y el botón de suma manual; conserva stock visible como solo lectura y configuración de mínimo/proveedor/plazo.
- `backend/src/server.js`: la ruta de stock ya no modifica unidades y rechaza campos de incrementos manuales. El stock se actualiza por ventas, cancelaciones y recepción de pedidos a proveedores.
- `LEEME-SOLO-RECEPCION-PROVEEDOR.md`: instrucciones y pruebas de Thunder Client.

No requiere migración SQL.
