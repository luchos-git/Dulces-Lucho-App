// explicación del archivo: guarda los productos del carrito y permite agregar, quitar, seleccionar y cambiar cantidades
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const CarritoContext = createContext();
const CLAVE_CARRITO = 'dulces_lucho_carrito_usuario_';

export function CarritoProvider({ children }) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id != null ? String(usuario.id) : '';
  const [items, setItems] = useState([]); // { id, nombre, precio, cantidad, seleccionado, ... }
  const [carritoCargadoPara, setCarritoCargadoPara] = useState('');

  // Cada cuenta conserva su propio carrito. Al cerrar sesión se oculta, pero no se borra.
  // Al volver a entrar o reiniciar Expo, se recupera desde el almacenamiento del teléfono.
  useEffect(() => {
    let vigente = true;
    setItems([]);
    setCarritoCargadoPara('');

    if (!usuarioId) return () => { vigente = false; };

    AsyncStorage.getItem(`${CLAVE_CARRITO}${usuarioId}`)
      .then((guardado) => {
        if (!vigente) return;
        let lista = [];
        try {
          const parseado = guardado ? JSON.parse(guardado) : [];
          lista = Array.isArray(parseado) ? parseado : [];
        } catch {
          lista = [];
        }
        setItems(lista);
        setCarritoCargadoPara(usuarioId);
      })
      .catch((error) => {
        console.warn('No se pudo recuperar el carrito guardado:', error?.message || error);
        if (vigente) setCarritoCargadoPara(usuarioId);
      });

    return () => { vigente = false; };
  }, [usuarioId]);

  // No guarda el estado vacío temporal mientras se está leyendo la cuenta nueva.
  useEffect(() => {
    if (!usuarioId || carritoCargadoPara !== usuarioId) return;
    AsyncStorage.setItem(`${CLAVE_CARRITO}${usuarioId}`, JSON.stringify(items))
      .catch((error) => console.warn('No se pudo guardar el carrito:', error?.message || error));
  }, [items, usuarioId, carritoCargadoPara]);

  const stockDe = (producto) => Math.max(0, Number(producto?.stockDisponible ?? producto?.stock_disponible ?? 0));

  const agregarAlCarrito = (producto, cantidad = 1) => {
    const maximo = stockDe(producto);
    const unidades = Math.max(1, Math.floor(Number(cantidad) || 1));
    if (maximo <= 0) return false;
    const existente = items.find((i) => String(i.id) === String(producto.id));
    const cantidadActual = Number(existente?.cantidad || 0);
    if (cantidadActual >= maximo) return false;
    const nuevaCantidad = Math.min(maximo, cantidadActual + unidades);
    setItems((prev) => {
      const encontrado = prev.some((i) => String(i.id) === String(producto.id));
      if (encontrado) return prev.map((i) => String(i.id) === String(producto.id) ? { ...i, ...producto, cantidad: nuevaCantidad } : i);
      return [...prev, { ...producto, cantidad: Math.min(unidades, maximo), seleccionado: true }];
    });
    return true;
  };

  const quitarDelCarrito = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const cambiarCantidad = (id, delta, stockActualizado = null) => {
    const actual = items.find((i) => String(i.id) === String(id));
    if (!actual) return false;
    const maximo = stockActualizado == null ? stockDe(actual) : Math.max(0, Number(stockActualizado) || 0);
    const actualCantidad = Number(actual.cantidad || 1);
    // Siempre permite bajar la cantidad; para subir respeta el stock más reciente del catálogo.
    const propuesta = Math.max(1, actualCantidad + Number(delta || 0));
    const nueva = Number(delta) < 0 ? propuesta : Math.min(maximo, propuesta);
    if (nueva < 1 || (Number(delta) > 0 && maximo <= 0)) return false;
    setItems((prev) => prev.map((i) => String(i.id) === String(id) ? { ...i, cantidad: nueva } : i));
    return nueva !== Number(actual.cantidad || 1);
  };

  const toggleSeleccionado = (id) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, seleccionado: !i.seleccionado } : i)));

  const toggleSeleccionarTodo = () => {
    const todosSeleccionados = items.length > 0 && items.every((i) => i.seleccionado);
    setItems((prev) => prev.map((i) => ({ ...i, seleccionado: !todosSeleccionados })));
  };

  // Saca del carrito los productos que se acaban de comprar
  const quitarSeleccionados = () => setItems((prev) => prev.filter((i) => !i.seleccionado));

  // Vacía el carrito solo cuando se solicita expresamente; el cierre de sesión no lo llama.
  const vaciarCarrito = () => setItems([]);

  return (
    <CarritoContext.Provider
      value={{
        items,
        agregarAlCarrito,
        quitarDelCarrito,
        cambiarCantidad,
        toggleSeleccionado,
        toggleSeleccionarTodo,
        quitarSeleccionados,
        vaciarCarrito,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  return useContext(CarritoContext);
}
