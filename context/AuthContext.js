// explicación del archivo: maneja el registro, el inicio de sesión, la sesión del usuario y la verificación adicional del administrador
import React, { createContext, useContext, useState } from 'react';
import { api, configurarTokenSesion } from '../services/api';

const AuthContext = createContext();
const correoValido = /^\S+@\S+\.\S+$/;

export function AuthProvider({ children }) {
  // se guardan los datos necesarios para saber quién inició sesión
  const [usuario, setUsuario] = useState(null);
  const [adminPendiente, setAdminPendiente] = useState(null);

  // revisa los datos antes de enviarlos al servidor para crear una cuenta
  const registrar = async (datos = {}) => {
    const nombre = String(datos.nombre || '').trim();
    const email = String(datos.email || '').trim().toLowerCase();
    const telefono = String(datos.telefono || '').trim();
    const password = String(datos.password || '');
    const repetirPassword = String(datos.repetirPassword || '');
    const rol = datos.rol === 'admin' ? 'admin' : 'cliente';
    const codigoAutorizacion = String(datos.codigoAutorizacion || '').trim();
    const claveUnica = String(datos.claveUnica || '').trim();

    if (!nombre || nombre.length > 100 || !correoValido.test(email) || email.length > 150 || telefono.length > 30 || password.length < 6) {
      return { ok: false, error: 'Revisá el nombre, el correo y la contraseña (mínimo 6 caracteres).' };
    }
    if (password !== repetirPassword) {
      return { ok: false, error: 'Las contraseñas no coinciden.' };
    }

    // La app solo valida el formato de la clave; el código secreto se comprueba en el backend.
    if (rol === 'admin' && (!codigoAutorizacion || !/^\d{6}$/.test(claveUnica))) {
      return { ok: false, error: 'Ingresá el código de autorización y una clave personal de 6 números.' };
    }

    try {
      await api('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, telefono, password, rol, codigoAutorizacion, claveUnica }),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'No se pudo crear la cuenta.' };
    }
  };

  // Actualiza los datos básicos del perfil en MySQL y sincroniza la sesión activa.
  const actualizarPerfil = async (datos = {}) => {
    if (!usuario?.id) return { ok: false, error: 'La sesión actual no está vinculada a una cuenta de MySQL.' };
    const nombre = String(datos.nombre || '').trim();
    const telefono = String(datos.telefono || '').trim();
    if (!nombre) return { ok: false, error: 'El nombre no puede quedar vacío.' };
    if (nombre.length > 100 || telefono.length > 30) return { ok: false, error: 'Revisá el largo del nombre o teléfono.' };
    try {
      const actualizado = await api(`/usuarios/${usuario.id}/perfil`, {
        method: 'PUT',
        body: JSON.stringify({ nombre, telefono }),
      });
      setUsuario(actualizado);
      return { ok: true, usuario: actualizado };
    } catch (error) {
      return { ok: false, error: error.message || 'No se pudo actualizar el perfil.' };
    }
  };

  // La API ya sube la foto a ImgBB y guarda la URL en MySQL; acá sincronizamos la sesión.
  const actualizarFotoPerfil = async (usuarioActualizado) => {
    if (!usuario?.id) return { ok: false, error: 'Iniciá sesión para actualizar tu foto.' };
    if (!usuarioActualizado?.fotoPerfilUrl) return { ok: false, error: 'El servidor no devolvió una foto de perfil guardada.' };
    setUsuario((actual) => ({ ...actual, ...usuarioActualizado }));
    return { ok: true, usuario: usuarioActualizado };
  };

  // Verifica la identidad y obtiene un permiso temporal de un solo uso para cambiar credenciales.
  const verificarProteccionCuenta = async (datos = {}) => {
    if (!usuario?.id) return { ok: false, error: 'Iniciá sesión nuevamente.' };
    try {
      const resultado = await api('/auth/verificar-proteccion-cuenta', {
        method: 'POST',
        body: JSON.stringify({ usuarioId: usuario.id, ...datos }),
      });
      return { ok: true, ...resultado };
    } catch (error) {
      return { ok: false, error: error.message || 'No se pudo verificar la cuenta.' };
    }
  };

  // Cambia correo, contraseña o ambos; el backend consume el permiso temporal.
  const actualizarCredenciales = async ({ token, nuevoEmail, nuevaPassword } = {}) => {
    if (!usuario?.id) return { ok: false, error: 'Iniciá sesión nuevamente.' };
    try {
      const resultado = await api(`/usuarios/${usuario.id}/credenciales`, {
        method: 'PUT',
        headers: { 'X-Proteccion-Cuenta': token },
        body: JSON.stringify({ nuevoEmail, nuevaPassword }),
      });
      if (resultado.usuario) setUsuario((actual) => ({ ...actual, ...resultado.usuario }));
      return { ok: true, ...resultado };
    } catch (error) {
      return { ok: false, error: error.message || 'No se pudieron actualizar los datos de acceso.' };
    }
  };

  // consulta la cuenta en mysql y, si es administradora, deja pendiente la segunda verificación
  const iniciarSesion = async (email, password) => {
    const correo = String(email || '').trim().toLowerCase();
    const clave = String(password || '');
    if (!correo || !clave) return { ok: false, error: 'Completá el correo y la contraseña.' };

    try {
      const respuesta = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: correo, password: clave }),
      });

      if (respuesta.requiereClave) {
        setAdminPendiente(respuesta);
        return { ok: true, requiereClave: true };
      }

      if (!respuesta.sessionToken) return { ok: false, error: 'El servidor no emitió una sesión segura. Reiniciá el backend y volvé a ingresar.' };
      configurarTokenSesion(respuesta.sessionToken);
      setUsuario(respuesta);
      return { ok: true, requiereClave: false };
    } catch (error) {
      // No se usa una cuenta de demostración si falla la API: el acceso debe validar contra MySQL.
      return { ok: false, error: error.message || 'No se pudo iniciar sesión.' };
    }
  };

  // comprueba la clave única en el servidor antes de habilitar el acceso de administrador
  const verificarClaveAdmin = async (clave) => {
    if (!adminPendiente) return { ok: false, error: 'Volvé a iniciar sesión.' };

    try {
      if (!adminPendiente.id) return { ok: false, error: 'La sesión de administrador no es válida. Volvé a iniciar sesión.' };
      const respuesta = await api('/auth/verificar-admin', {
        method: 'POST',
        body: JSON.stringify({ usuarioId: adminPendiente.id, clave }),
      });
      if (!respuesta.sessionToken) return { ok: false, error: 'El servidor no emitió una sesión segura. Reiniciá el backend y volvé a intentar.' };
      configurarTokenSesion(respuesta.sessionToken);
      setUsuario(respuesta);

      setAdminPendiente(null);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  // comparte los datos y las funciones de autenticación con todas las pantallas
  return (
    <AuthContext.Provider
      value={{
        usuario,
        esAdmin: String(usuario?.rol || '').toLowerCase() === 'admin',
        esPropietario: Boolean(usuario?.esPropietario),
        permisosAdmin: Array.isArray(usuario?.permisosAdmin) ? usuario.permisosAdmin : [],
        puede: (permiso) => Boolean(usuario?.esPropietario || (Array.isArray(usuario?.permisosAdmin) && usuario.permisosAdmin.includes(permiso))),
        adminPendiente,
        registrar,
        actualizarPerfil,
        actualizarFotoPerfil,
        verificarProteccionCuenta,
        actualizarCredenciales,
        iniciarSesion,
        verificarClaveAdmin,
        cancelarClaveAdmin: () => setAdminPendiente(null),
        cerrarSesion: () => {
          configurarTokenSesion('');
          setUsuario(null);
          setAdminPendiente(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// este hook permite consultar el contexto sin importar todos sus detalles
export const useAuth = () => useContext(AuthContext);
