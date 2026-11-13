// explicación del archivo: carga el catálogo desde la api, conserva una copia local y administra los productos
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { productos as productosIniciales } from '../data/productos';

const ProductosContext = createContext();
const CLAVE_PRODUCTOS = 'productos_dulces_lucho';

// usa el catálogo real del emprendimiento como respaldo cuando mysql no está disponible
export function ProductosProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // guarda los productos recibidos para que puedan recuperarse aunque se cierre la app
  const guardarCache = async (lista) => {
    setProductos(lista);
    await AsyncStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(lista));
  };

  // intenta obtener la lista actual desde el backend y usa el almacenamiento local si falla
  const cargarProductos = async () => {
    try {
      const lista = await api('/productos');
      await guardarCache(lista);
      return lista;
    } catch {
      const guardados = JSON.parse(await AsyncStorage.getItem(CLAVE_PRODUCTOS) || 'null') || productosIniciales;
      await guardarCache(guardados);
      return guardados;
    }
  };

  // carga el catálogo una sola vez cuando se monta el proveedor
  useEffect(() => {
    cargarProductos().finally(() => setCargando(false));
  }, []);

  // envía un producto nuevo al servidor y actualiza la copia local
  const agregarProducto = async (producto) => {
    const guardado = await api('/productos', {
      method: 'POST',
      body: JSON.stringify(producto),
    });
    await guardarCache([guardado, ...productos]);
    return guardado;
  };

  // modifica el producto en mysql y reemplaza su versión local
  const editarProducto = async (id, producto) => {
    const actualizado = await api(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(producto),
    });
    await guardarCache(productos.map((item) => String(item.id) === String(id) ? actualizado : item));
    return actualizado;
  };

  // realiza una baja lógica en el backend y lo quita del catálogo visible
  const eliminarProducto = async (id) => {
    await api(`/productos/${id}`, { method: 'DELETE' });
    await guardarCache(productos.filter((item) => String(item.id) !== String(id)));
  };

  return (
    <ProductosContext.Provider value={{ productos, cargando, cargarProductos, agregarProducto, editarProducto, eliminarProducto }}>
      {children}
    </ProductosContext.Provider>
  );
}

// este hook permite trabajar con el catálogo desde cualquier pantalla
export const useProductos = () => useContext(ProductosContext);
