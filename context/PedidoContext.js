// explicación del archivo: crea los pedidos y conserva el historial en el almacenamiento local del celular
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PedidoContext = createContext();
const CLAVE_PEDIDOS = 'pedidos_dulces_lucho';

export function PedidoProvider({ children }) {
  const [pedidos, setPedidos] = useState([]);

  // al abrir la app recupera los pedidos guardados anteriormente en el dispositivo
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_PEDIDOS).then((datos) => {
      if (datos) setPedidos(JSON.parse(datos));
    });
  }, []);

  // actualiza el estado de react y guarda la misma información en el celular
  const guardarPedidos = (nuevosPedidos) => {
    setPedidos(nuevosPedidos);
    AsyncStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(nuevosPedidos));
  };

  // genera un identificador local y agrega el pedido al comienzo del historial
  const crearPedido = (datos) => {
    const pedido = {
      ...datos,
      id: `local-${Date.now()}`,
      numero: Math.floor(1000 + Math.random() * 9000),
      inicio: Date.now(),
      estado: 'en_camino',
    };
    guardarPedidos([pedido, ...pedidos]);
    return pedido;
  };

  // cambia el estado del pedido cuando se marca como entregado
  const finalizarPedido = (id) => {
    guardarPedidos(
      pedidos.map((pedido) =>
        pedido.id === id
          ? { ...pedido, estado: 'entregado', finalizadoEn: Date.now() }
          : pedido
      )
    );
  };

  const limpiarPedido = (id) => finalizarPedido(id);

  // selecciona el primer pedido que todavía no se entregó
  const pedidoActual = pedidos.find((pedido) => pedido.estado !== 'entregado') || null;

  return (
    <PedidoContext.Provider value={{ pedidos, pedidoActual, crearPedido, finalizarPedido, limpiarPedido }}>
      {children}
    </PedidoContext.Provider>
  );
}

// este hook permite usar los pedidos desde las pantallas
export const usePedido = () => useContext(PedidoContext);
