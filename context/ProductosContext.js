import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'productos_dulces_lucho';

const productosIniciales = [
  { id: 1, nombre: 'Alfajor de maicena', categoria: 'Alfajores', precio: 1500 },
  { id: 2, nombre: 'Alfajor de chocolate', categoria: 'Alfajores', precio: 1600 },
  { id: 3, nombre: 'Alfajor triple', categoria: 'Alfajores', precio: 2000 },
  { id: 4, nombre: 'Chocolate con almendras', categoria: 'Chocolates', precio: 2500 },
  { id: 5, nombre: 'Chocolate blanco', categoria: 'Chocolates', precio: 2300 },
  { id: 6, nombre: 'Chocolate amargo 70%', categoria: 'Chocolates', precio: 2400 },
  { id: 7, nombre: 'Caramelos de miel', categoria: 'Caramelos', precio: 900 },
  { id: 8, nombre: 'Caramelos surtidos', categoria: 'Caramelos', precio: 950 },
  { id: 9, nombre: 'Bombones surtidos', categoria: 'Bombones', precio: 3000 },
  { id: 10, nombre: 'Bombones de licor', categoria: 'Bombones', precio: 3500 },
];

const ProductosContext = createContext();

export function ProductosProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const guardado = await AsyncStorage.getItem(STORAGE_KEY);
        if (guardado) {
          setProductos(JSON.parse(guardado));
        } else {
          setProductos(productosIniciales);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(productosIniciales));
        }
      } catch (e) {
        setProductos(productosIniciales);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const agregarProducto = async (nuevo) => {
    const nuevoId = productos.length > 0 ? Math.max(...productos.map((p) => p.id)) + 1 : 1;
    const productoConId = { ...nuevo, id: nuevoId };
    const actualizados = [...productos, productoConId];
    setProductos(actualizados);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
    return productoConId;
  };

  return (
    <ProductosContext.Provider value={{ productos, agregarProducto, cargando }}>
      {children}
    </ProductosContext.Provider>
  );
}

export function useProductos() {
  return useContext(ProductosContext);
}