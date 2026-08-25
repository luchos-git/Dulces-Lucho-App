import React, { createContext, useContext, useState } from 'react';

const CarritoContext = createContext();

export function CarritoProvider({ children }) {
  const [items, setItems] = useState([]); // { id, nombre, precio, cantidad, seleccionado }

  const agregarAlCarrito = (producto, cantidad = 1) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.id === producto.id);
      if (existente) {
        return prev.map((i) => (i.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { ...producto, cantidad, seleccionado: true }];
    });
  };

  const quitarDelCarrito = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const cambiarCantidad = (id, delta) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i)));

  const toggleSeleccionado = (id) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, seleccionado: !i.seleccionado } : i)));

  const toggleSeleccionarTodo = () => {
    const todosSeleccionados = items.length > 0 && items.every((i) => i.seleccionado);
    setItems((prev) => prev.map((i) => ({ ...i, seleccionado: !todosSeleccionados })));
  };

  return (
    <CarritoContext.Provider
      value={{ items, agregarAlCarrito, quitarDelCarrito, cambiarCantidad, toggleSeleccionado, toggleSeleccionarTodo }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  return useContext(CarritoContext);
}