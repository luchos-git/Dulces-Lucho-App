// Mantiene el historial separado por cuenta y sincroniza las compras de cada usuario con MySQL.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const PedidoContext = createContext();
const CLAVE_PEDIDOS = 'pedidos_dulces_lucho_usuario_';

export function PedidoProvider({ children }) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id != null ? String(usuario.id) : '';
  const claveUsuario = usuarioId ? `${CLAVE_PEDIDOS}${usuarioId}` : null;
  const [pedidos, setPedidos] = useState([]);
  // Evita que una lectura de caché antigua pise una respuesta más nueva de MySQL.
  const revision = useRef(0);
  const usuarioIdActualRef = useRef(usuarioId);
  usuarioIdActualRef.current = usuarioId;

  useEffect(() => {
    let vigente = true;
    const revisionLectura = revision.current;
    setPedidos([]);

    if (!claveUsuario) return () => { vigente = false; };

    AsyncStorage.getItem(claveUsuario)
      .then((datos) => {
        if (!vigente || !datos || revision.current !== revisionLectura) return;
        try {
          const guardados = JSON.parse(datos);
          const propios = Array.isArray(guardados)
            ? guardados.filter((pedido) => String(pedido.usuarioId ?? pedido.usuario_id ?? '') === usuarioId)
            : [];
          setPedidos(propios);
        } catch {
          setPedidos([]);
        }
      })
      .catch(() => {});

    return () => { vigente = false; };
  }, [claveUsuario, usuarioId]);

  // datos puede incluir id y número devueltos por la API al guardar la venta.
  const crearPedido = useCallback((datos) => {
    if (!usuarioId || usuarioIdActualRef.current !== usuarioId) throw new Error('Iniciá sesión antes de registrar un pedido.');
    const propietarioRecibido = datos?.usuarioId ?? datos?.usuario_id;
    if (propietarioRecibido != null && String(propietarioRecibido) !== usuarioId) {
      throw new Error('El pedido no pertenece a la cuenta activa.');
    }
    const id = datos?.id != null ? String(datos.id) : `local-${Date.now()}`;
    const pedido = {
      ...datos,
      id,
      pedidoId: datos?.pedidoId ?? id,
      usuarioId,
      numero: datos?.numero || datos?.id || Math.floor(1000 + Math.random() * 9000),
      inicio: Number(datos?.inicio || Date.now()),
      estado: datos?.estadoPedido || datos?.estado || 'confirmado',
      estadoPedido: datos?.estadoPedido || datos?.estado || 'confirmado',
    };
    setPedidos((actuales) => {
      const siguientes = [pedido, ...actuales.filter((p) => String(p.id) !== String(pedido.id))];
      if (claveUsuario) AsyncStorage.setItem(claveUsuario, JSON.stringify(siguientes)).catch(() => {});
      return siguientes;
    });
    return pedido;
  }, [usuarioId, claveUsuario]);

  // MySQL es la fuente principal: solo conserva pedidos que pertenecen al usuario activo.
  const sincronizarPedidos = useCallback((remotos = []) => {
    if (!usuarioId || usuarioIdActualRef.current !== usuarioId) return;
    revision.current += 1;
    const normalizados = (Array.isArray(remotos) ? remotos : [])
      .filter((pedido) => String(pedido.usuarioId ?? pedido.usuario_id ?? '') === usuarioId)
      .map((pedido) => ({
        ...pedido,
        id: String(pedido.id ?? pedido.pedidoId),
        pedidoId: String(pedido.id ?? pedido.pedidoId),
        usuarioId,
        numero: pedido.numero || pedido.id || pedido.pedidoId,
        inicio: Number(pedido.inicio || (pedido.fecha ? new Date(pedido.fecha).getTime() : Date.now())),
        estado: pedido.estadoPedido || pedido.estado || 'confirmado',
        estadoPedido: pedido.estadoPedido || pedido.estado || 'confirmado',
        items: Array.isArray(pedido.items)
          ? pedido.items.map((item) => ({ ...item, precio: Number(item.precio), cantidad: Number(item.cantidad) }))
          : [],
        total: Number(pedido.total || 0),
      }));
    setPedidos((actuales) => {
      const idsRemotos = new Set(normalizados.map((p) => String(p.id)));
      const localesPropios = actuales.filter((p) =>
        String(p.usuarioId ?? p.usuario_id ?? '') === usuarioId &&
        String(p.id).startsWith('local-') && !idsRemotos.has(String(p.id))
      );
      const siguientes = [...normalizados, ...localesPropios];
      if (claveUsuario) AsyncStorage.setItem(claveUsuario, JSON.stringify(siguientes)).catch(() => {});
      return siguientes;
    });
  }, [usuarioId, claveUsuario]);

  const finalizarPedido = useCallback((id) => {
    if (!usuarioId || usuarioIdActualRef.current !== usuarioId) return;
    setPedidos((actuales) => {
      const siguientes = actuales.map((pedido) => String(pedido.id) === String(id)
        ? { ...pedido, estado: 'entregado', estadoPedido: 'entregado', finalizadoEn: Date.now() }
        : pedido);
      if (claveUsuario) AsyncStorage.setItem(claveUsuario, JSON.stringify(siguientes)).catch(() => {});
      return siguientes;
    });
  }, [usuarioId, claveUsuario]);

  const limpiarPedido = useCallback((id) => {
    if (id == null) return;
    finalizarPedido(id);
  }, [finalizarPedido]);
  const pedidoActual = pedidos.find((pedido) => !['entregado', 'cancelado'].includes(pedido.estado)) || null;

  return (
    <PedidoContext.Provider value={{ pedidos, pedidoActual, crearPedido, sincronizarPedidos, finalizarPedido, limpiarPedido }}>
      {children}
    </PedidoContext.Provider>
  );
}

export const usePedido = () => useContext(PedidoContext);
