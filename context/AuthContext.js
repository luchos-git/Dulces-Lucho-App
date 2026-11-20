// explicación del archivo: maneja el registro, el inicio de sesión, la sesión del usuario y la verificación adicional del administrador
import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';
import { usuariosIniciales, CODIGO_AUTORIZACION_ADMIN } from '../data/usuarios';

const AuthContext = createContext();
const correoValido = /^\S+@\S+\.\S+$/;

export function AuthProvider({ children }) {
  // se guardan los datos necesarios para saber quién inició sesión
  const [usuarios] = useState(usuariosIniciales);
  const [usuario, setUsuario] = useState(null);
  const [adminPendiente, setAdminPendiente] = useState(null);

  // revisa los datos antes de enviarlos al servidor para crear una cuenta
  const registrar = async (datos) => {
    const email = datos.email.trim().toLowerCase();

    if (
      !datos.nombre.trim() ||
      !correoValido.test(email) ||
      datos.password.length < 6 ||
      datos.password !== datos.repetirPassword
    ) {
      return { ok: false, error: 'Revisá nombre, correo y contraseñas.' };
    }

    // para registrar un administrador también se necesita el código y la clave de seis números
    if (
      datos.rol === 'admin' &&
      (datos.codigoAutorizacion.trim() !== CODIGO_AUTORIZACION_ADMIN || !/^\d{6}$/.test(datos.claveUnica))
    ) {
      return { ok: false, error: 'Datos de administrador inválidos.' };
    }

    try {
      await api('/auth/registro', {
        method: 'POST',
        body: JSON.stringify(datos),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  // consulta la cuenta en mysql y, si es administradora, deja pendiente la segunda verificación
  const iniciarSesion = async (email, password) => {
    try {
      const respuesta = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (respuesta.requiereClave) {
        setAdminPendiente(respuesta);
        return { ok: true, requiereClave: true };
      }

      setUsuario(respuesta);
      return { ok: true, requiereClave: false };
    } catch (error) {
      // las cuentas de demostración permiten probar algunas pantallas si la api está desconectada
      const cuentaLocal = usuarios.find(
        (item) => item.email === email.trim().toLowerCase() && item.password === password
      );

      if (!cuentaLocal) return { ok: false, error: error.message };

      if (cuentaLocal.rol === 'admin') {
        setAdminPendiente(cuentaLocal);
        return { ok: true, requiereClave: true };
      }

      setUsuario(cuentaLocal);
      return { ok: true, requiereClave: false };
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
