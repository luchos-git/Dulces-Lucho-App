import React, { createContext, useContext, useState } from 'react';
import { usuariosIniciales, CODIGO_AUTORIZACION_ADMIN } from '../data/usuarios';

const AuthContext = createContext();

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [usuario, setUsuario] = useState(null); // sesión iniciada
  const [adminPendiente, setAdminPendiente] = useState(null); // pasó la contraseña, falta la clave única

  // Devuelve { ok: true } o { ok: false, error: '...' }
  const registrar = ({ nombre, email, password, repetirPassword, rol, codigoAutorizacion, claveUnica }) => {
    const emailLimpio = email.trim().toLowerCase();

    if (!nombre.trim()) return { ok: false, error: 'Escribí tu nombre.' };
    if (!EMAIL_VALIDO.test(emailLimpio)) return { ok: false, error: 'El correo no es válido.' };
    if (password.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    if (password !== repetirPassword) return { ok: false, error: 'Las contraseñas no coinciden.' };
    if (usuarios.some((u) => u.email === emailLimpio)) {
      return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
    }

    if (rol === 'admin') {
      if (codigoAutorizacion.trim() !== CODIGO_AUTORIZACION_ADMIN) {
        return { ok: false, error: 'El código de autorización es incorrecto.' };
      }
      if (!/^\d{6}$/.test(claveUnica)) {
        return { ok: false, error: 'La clave única debe tener exactamente 6 números.' };
      }
    }

    const nuevo = {
      nombre: nombre.trim(),
      email: emailLimpio,
      password,
      rol,
      ...(rol === 'admin' ? { claveUnica } : {}),
    };
    setUsuarios((prev) => [...prev, nuevo]);
    return { ok: true };
  };

  // Si es cliente entra directo. Si es administrador, queda pendiente de la clave única.
  const iniciarSesion = (email, password) => {
    const emailLimpio = email.trim().toLowerCase();
    const encontrado = usuarios.find((u) => u.email === emailLimpio && u.password === password);

    if (!encontrado) return { ok: false, error: 'Correo o contraseña incorrectos.' };

    if (encontrado.rol === 'admin') {
      setAdminPendiente(encontrado);
      return { ok: true, requiereClave: true };
    }

    setUsuario(encontrado);
    return { ok: true, requiereClave: false };
  };

  const verificarClaveAdmin = (clave) => {
    if (!adminPendiente) return { ok: false, error: 'Volvé a iniciar sesión.' };
    if (clave !== adminPendiente.claveUnica) return { ok: false, error: 'La clave única es incorrecta.' };

    setUsuario(adminPendiente);
    setAdminPendiente(null);
    return { ok: true };
  };

  const cancelarClaveAdmin = () => setAdminPendiente(null);

  const cerrarSesion = () => {
    setUsuario(null);
    setAdminPendiente(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        esAdmin: usuario ? usuario.rol === 'admin' : false,
        adminPendiente,
        registrar,
        iniciarSesion,
        verificarClaveAdmin,
        cancelarClaveAdmin,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
