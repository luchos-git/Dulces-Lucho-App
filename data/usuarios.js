// explicación del archivo: contiene cuentas de demostración y el código de autorización usado por el formulario de administrador
// ---------------------------------------------------------------------------
// DATOS DE EJEMPLO PARA EL PROTOTIPO
// Estas cuentas sirven como respaldo de demostración si la api no está disponible
// el registro real se guarda en mysql cuando el backend funciona correctamente.
//
//   Cliente:        cliente@dulceslucho.com  /  cliente123
//   Administrador:  admin@dulceslucho.com    /  admin123   (clave única: 482913)
// ---------------------------------------------------------------------------

// este valor permite validar el formulario antes de enviarlo
// el backend vuelve a comprobarlo con ADMIN_REGISTRATION_CODE en backend/.env
export const CODIGO_AUTORIZACION_ADMIN = 'DULCES-ADMIN-2026';

export const usuariosIniciales = [
  { nombre: 'Cliente de prueba', email: 'cliente@dulceslucho.com', password: 'cliente123', rol: 'cliente' },
  { nombre: 'Administrador de prueba', email: 'admin@dulceslucho.com', password: 'admin123', rol: 'admin', claveUnica: '482913' },
];
