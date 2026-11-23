// explicación del archivo: maneja el registro, el inicio de sesión, la sesión del usuario y la verificación adicional del administrador
import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

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
    const password = String(datos.password || '');
    const repetirPassword = String(datos.repetirPassword || '');
    const rol = datos.rol === 'admin' ? 'admin' : 'cliente';
    const codigoAutorizacion = String(datos.codigoAutorizacion || '').trim();
    const claveUnica = String(datos.claveUnica || '').trim();

    if (!nombre || nombre.length > 100 || !correoValido.test(email) || email.length > 150 || password.length < 6) {
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
        body: JSON.stringify({ nombre, email, password, rol, codigoAutorizacion, claveUnica }),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'No se pudo crear la cuenta.' };
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
      const respuesta = adminPendiente.id
        ? await api('/auth/verificar-admin', {
            method: 'POST',
            body: JSON.stringify({ usuarioId: adminPendiente.id, clave }),
          })
        : null;

      if (respuesta) {
        setUsuario(respuesta);
      } else if (clave === adminPendiente.claveUnica) {
        setUsuario(adminPendiente);
      } else {
        return { ok: false, error: 'La clave única es incorrecta.' };
      }

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
        adminPendiente,
        registrar,
        iniciarSesion,
        verificarClaveAdmin,
        cancelarClaveAdmin: () => setAdminPendiente(null),
        cerrarSesion: () => {
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
