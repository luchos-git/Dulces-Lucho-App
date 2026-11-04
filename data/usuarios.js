// ---------------------------------------------------------------------------
// DATOS DE EJEMPLO PARA EL PROTOTIPO
// Las cuentas que se crean desde la app viven solo mientras la app está abierta
// (no hay base de datos). Estas dos sirven para probar.
//
//   Cliente:        cliente@dulceslucho.com  /  cliente123
//   Administrador:  admin@dulceslucho.com    /  admin123   (clave única: 482913)
// ---------------------------------------------------------------------------

// Código que hay que ingresar para poder crear una cuenta de administrador.
// Cambialo por uno propio. (En una app real esto se valida en el servidor.)
export const CODIGO_AUTORIZACION_ADMIN = 'DULCES-ADMIN-2026';

export const usuariosIniciales = [
  { nombre: 'Cliente de prueba', email: 'cliente@dulceslucho.com', password: 'cliente123', rol: 'cliente' },
  { nombre: 'Administrador de prueba', email: 'admin@dulceslucho.com', password: 'admin123', rol: 'admin', claveUnica: '482913' },
];
