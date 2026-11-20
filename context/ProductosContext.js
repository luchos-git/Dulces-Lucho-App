import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const ProductosContext = createContext();
const CLAVE_PRODUCTOS = 'productos_dulces_lucho';

const productosIniciales = [
  { id: 1, nombre: 'Bolsita Smacks 3 obleas + alfajor', categoria: 'Bolsitas', precio: 1500, descripcion: 'Bolsita sellada con 3 obleas Smacks de chocolate y un alfajor adentro.', imagenUrl: '', imagenes: [] },
  { id: 2, nombre: 'Bolsita Smacks 4 obleas + alfajor', categoria: 'Bolsitas', precio: 1800, descripcion: 'Bolsita sellada con 4 obleas Smacks de chocolate y un alfajor adentro.', imagenUrl: '', imagenes: [] },
  { id: 3, nombre: 'Jugo Baggio', categoria: 'Jugos', precio: 700, descripcion: 'Jugo Baggio individual.', imagenUrl: '', imagenes: [] },
  { id: 4, nombre: 'Combo 3 obleas + alfajor con jugo Baggio', categoria: 'Combos', precio: 2100, descripcion: 'La bolsita de 3 obleas Smacks y alfajor, junto con un jugo Baggio.', imagenUrl: '', imagenes: [] },
  { id: 5, nombre: 'Combo 4 obleas + alfajor con jugo Baggio', categoria: 'Combos', precio: 2400, descripcion: 'La bolsita de 4 obleas Smacks y alfajor, junto con un jugo Baggio.', imagenUrl: '', imagenes: [] },
];

export function ProductosProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const guardarCache = async (lista) => {
    setProductos(lista);
    await AsyncStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(lista));
  };

  // Primero intenta leer MySQL. Si el servidor no está disponible, muestra la última copia local.
  const cargarProductos = async () => {
    try {
      const lista = await api('/productos');
      await guardarCache(lista);
      return lista;
    } catch (error) {
      const cache = await AsyncStorage.getItem(CLAVE_PRODUCTOS);
      const listaGuardada = cache ? JSON.parse(cache) : productosIniciales;
      await guardarCache(listaGuardada);
      return listaGuardada;
    }
  };

  useEffect(() => {
    cargarProductos().finally(() => setCargando(false));
  }, []);

  // CREATE: envía el producto nuevo al backend y actualiza la lista de la app.
  const agregarProducto = async (producto) => {
    const guardado = await api('/productos', {
      method: 'POST',
      body: JSON.stringify(producto),
    });
    await guardarCache([guardado, ...productos]);
    return guardado;
  };

  // UPDATE: reemplaza el producto editado aunque el id llegue como número o texto.
  const editarProducto = async (id, producto) => {
    const actualizado = await api(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(producto),
    });
    const existe = productos.some((item) => String(item.id) === String(id));
    const lista = existe
      ? productos.map((item) => String(item.id) === String(id) ? actualizado : item)
      : [actualizado, ...productos];
    await guardarCache(lista);
    return actualizado;
  };

  // DELETE: el servidor hace una baja lógica para conservar las ventas anteriores.
  const eliminarProducto = async (id) => {
    const resultado = await api(`/productos/${id}`, { method: 'DELETE' });
    await guardarCache(productos.filter((item) => String(item.id) !== String(id)));
    return resultado;
  };

  return (
    <ProductosContext.Provider value={{ productos, cargando, cargarProductos, agregarProducto, editarProducto, eliminarProducto }}>
      {children}
    </ProductosContext.Provider>
  );
}

export const useProductos = () => useContext(ProductosContext);
