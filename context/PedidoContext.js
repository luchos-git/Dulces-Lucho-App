import React, { createContext, useContext, useState } from 'react';

const PedidoContext = createContext();

// Guarda el pedido que está en curso (solo mientras la app está abierta).
export function PedidoProvider({ children }) {
  const [pedidoActual, setPedidoActual] = useState(null);

  // datos: items, total, medioPago, codigoRapipago, conEnvio, direccion, localidad,
  //        destino, distanciaKm, avisosActivados
  const crearPedido = (datos) => {
    const pedido = {
      ...datos,
      numero: Math.floor(1000 + Math.random() * 9000), // número de ejemplo
      inicio: Date.now(),
    };
    setPedidoActual(pedido);
    return pedido;
  };

  const limpiarPedido = () => setPedidoActual(null);

  return (
    <PedidoContext.Provider value={{ pedidoActual, crearPedido, limpiarPedido }}>
      {children}
    </PedidoContext.Provider>
  );
}

export function usePedido() {
  return useContext(PedidoContext);
}
