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

function normalizarImagenes(producto = {}) {
  const principal = String(
    producto.miniaturaUrl || producto.miniatura_url || producto.imagenUrl ||
    producto.imagen_url || producto.portada || producto.imagen || ''
  ).trim();
  let lista = producto.imagenes ?? producto.imagenesJson ?? producto.imagenes_json ?? producto.galeria ?? [];
  for (let intento = 0; intento < 2 && typeof lista === 'string' && lista.trim(); intento += 1) {
    try { lista = JSON.parse(lista); }
    catch { lista = /^https?:\/\//i.test(lista.trim()) ? [lista.trim()] : []; break; }
  }
  if (!Array.isArray(lista)) lista = lista ? [lista] : [];
  const urls = lista.map((item) => {
    if (typeof item === 'string') return item;
    return item?.url || item?.imagenUrl || item?.imageUrl || item?.src || item?.displayUrl || item?.display_url || item?.data?.url || item?.data?.display_url || '';
  }).map((url) => String(url || '').trim()).filter((url) => /^https?:\/\//i.test(url));
  if (!urls.length && principal && /^https?:\/\//i.test(principal)) urls.push(principal);
  const imagenes = [...new Set(urls)].slice(0, 3);
  return {
    ...producto,
    imagenes,
    imagenUrl: imagenes[0] || '',
    miniaturaUrl: imagenes[0] || '',
    stockDisponible: Number(producto.stockDisponible ?? producto.stock_disponible ?? 0),
    stockMinimo: Number(producto.stockMinimo ?? producto.stock_minimo ?? 0),
    destacadoDia: Boolean(Number(producto.destacadoDia ?? producto.destacado_dia ?? 0)),
    destacadoOrden: Number(producto.destacadoOrden ?? producto.destacado_orden ?? 0),
    proveedorId: producto.proveedorId ?? producto.proveedor_id ?? null,
    diasReposicionEstimados: Number(producto.diasReposicionEstimados ?? producto.dias_reposicion_estimados ?? 7),
  };
}

export function ProductosProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const guardarCache = async (lista) => {
    const normalizados = (Array.isArray(lista) ? lista : []).map(normalizarImagenes);
    setProductos(normalizados);
    await AsyncStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(normalizados));
    return normalizados;
  };

  // Primero intenta leer MySQL. Si el servidor no está disponible, muestra la última copia local.
  const cargarProductos = async () => {
    try {
      const lista = await api('/productos');
      return await guardarCache(Array.isArray(lista) ? lista : lista?.productos || []);
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
    const guardado = normalizarImagenes(await api('/productos', {
      method: 'POST',
      body: JSON.stringify(producto),
    }));
    await guardarCache([guardado, ...productos]);
    return guardado;
  };

  // UPDATE: reemplaza el producto editado aunque el id llegue como número o texto.
  const editarProducto = async (id, producto) => {
    const actualizado = normalizarImagenes(await api(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(producto),
    }));
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
