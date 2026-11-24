// Muestra el carrito y un carrusel desplazable de productos que todavía tienen stock.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useCarrito } from '../context/CarritoContext';
import { useProductos } from '../context/ProductosContext';
import EntregaEnvio, { useEntrega } from '../components/EntregaEnvio';
import ModalAgregar from '../components/ModalAgregar';
import SliderImagenes from '../components/SliderImagenes';
import CarruselProductos from '../components/CarruselProductos';

export default function CarritoScreen({ navigation }) {
  const {
    items,
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidad,
    toggleSeleccionado,
    toggleSeleccionarTodo,
  } = useCarrito();
  const { productos, cargarProductos } = useProductos();
  const entrega = useEntrega();
  const [productoModal, setProductoModal] = useState(null);

  useEffect(() => {
    const actualizar = () => cargarProductos().catch((error) => console.warn('No se pudo actualizar el catálogo del carrito:', error.message));
    actualizar();
    const listener = navigation.addListener('focus', actualizar);
    return listener;
  }, [navigation]);

  // Cruza el carrito con el stock actual del servidor, por si otra persona compró las últimas unidades.
  const itemsActualizados = items.map((item) => {
    const actual = productos.find((producto) => String(producto.id) === String(item.id));
    return actual
      ? { ...item, ...actual, cantidad: item.cantidad, seleccionado: item.seleccionado }
      : item;
  });

  const todosSeleccionados = itemsActualizados.length > 0 && itemsActualizados.every((item) => item.seleccionado);
  const subtotal = itemsActualizados
    .filter((item) => item.seleccionado)
    .reduce((totalActual, item) => totalActual + Number(item.precio) * Number(item.cantidad), 0);
  const costoEnvio = entrega.conEnvio && entrega.envio ? entrega.envio.costo : 0;
  const total = subtotal + costoEnvio;
  const hayProblemasStock = itemsActualizados.some((item) => {
    if (!item.seleccionado) return false;
    const stock = Math.max(0, Number(item.stockDisponible ?? item.stock_disponible ?? 0));
    return stock <= 0 || Number(item.cantidad) > stock;
  });

  const idsEnCarrito = items.map((item) => String(item.id));
  const recomendados = productos.filter((producto) =>
    Number(producto.stockDisponible ?? producto.stock_disponible ?? 0) > 0
    && !idsEnCarrito.includes(String(producto.id))
  );

  const irADetalle = (item) => {
    const { cantidad, seleccionado, ...producto } = item;
    navigation.navigate('DetalleProducto', { producto });
  };

  const confirmarAgregado = (cantidad) => {
    const agregado = agregarAlCarrito(productoModal, cantidad);
    setProductoModal(null);
    if (!agregado) Alert.alert('Stock insuficiente', 'No quedan unidades suficientes de ese producto.');
  };

  const prepararCompra = () => {
    const seleccionados = itemsActualizados.filter((item) => item.seleccionado);
    if (!seleccionados.length) {
      Alert.alert('Carrito vacío', 'Seleccioná al menos un producto para continuar.');
      return;
    }
    if (hayProblemasStock) {
      Alert.alert('Revisá el stock', 'Uno de los productos seleccionados ya no tiene unidades suficientes. Quitalo del carrito o ajustá la cantidad.');
      return;
    }
    if (entrega.conEnvio && !entrega.envio) {
      Alert.alert('Falta el envío', 'Calculá el costo de envío antes de continuar.');
      return;
    }
    navigation.navigate('PrepararCompra', {
      items: seleccionados,
      subtotal,
      comprarAhora: false,
      entrega: {
        conEnvio: entrega.conEnvio,
        direccion: entrega.direccion,
        localidad: entrega.localidad,
        envio: entrega.envio,
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {itemsActualizados.length > 0 && (
        <TouchableOpacity style={styles.filaSeleccionarTodo} onPress={toggleSeleccionarTodo}>
          <View style={[styles.checkbox, todosSeleccionados && styles.checkboxActivo]}>
            {todosSeleccionados && <Text style={styles.check}>✓</Text>}
          </View>
          <Text style={styles.textoSeleccionarTodo}>Seleccionar todo</Text>
        </TouchableOpacity>
      )}

      {itemsActualizados.length === 0 && (
        <Text style={styles.carritoVacio}>Tu carrito está vacío. Agregá productos desde el catálogo.</Text>
      )}

      {itemsActualizados.map((item) => {
        const stock = Math.max(0, Number(item.stockDisponible ?? item.stock_disponible ?? 0));
        const agotado = stock <= 0;
        const excedido = Number(item.cantidad) > stock;
        return (
          <View key={item.id} style={styles.filaItem}>
            <TouchableOpacity onPress={() => toggleSeleccionado(item.id)} style={styles.checkboxWrapper} disabled={agotado || excedido}>
              <View style={[styles.checkbox, item.seleccionado && styles.checkboxActivo, (agotado || excedido) && styles.checkboxDeshabilitado]}>
                {item.seleccionado && <Text style={styles.check}>✓</Text>}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fotoPlaceholder} onPress={() => irADetalle(item)} activeOpacity={0.85}>
              {(item.imagenes?.length || item.imagenUrl) ? (
                <SliderImagenes imagenes={item.imagenes?.length ? item.imagenes : [item.imagenUrl]} style={styles.fotoCarrito} resizeMode="cover" />
              ) : <Text>🍬</Text>}
              {agotado && <View pointerEvents="none" style={styles.capaAgotado}><Text style={styles.textoAgotado}>AGOTADO</Text></View>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoItem} onPress={() => irADetalle(item)} activeOpacity={0.85}>
              <Text style={styles.nombreItem}>{item.nombre}</Text>
              <Text style={styles.precioItem}>${item.precio}</Text>
              <Text style={agotado ? styles.stockAgotado : excedido ? styles.stockAgotado : styles.stockDisponible}>
                {agotado ? 'AGOTADO' : excedido ? `Quedan ${stock}; ajustá la cantidad` : `${stock} disponibles`}
              </Text>
            </TouchableOpacity>

            <View style={styles.controles}>
              <TouchableOpacity onPress={() => quitarDelCarrito(item.id)}>
                <Text style={styles.tacho}>🗑️</Text>
              </TouchableOpacity>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBoton} onPress={() => cambiarCantidad(item.id, -1, stock)}>
                  <Text style={styles.stepperTexto}>-</Text>
                </TouchableOpacity>
                <Text style={styles.cantidadTexto}>{item.cantidad}</Text>
                <TouchableOpacity style={[styles.stepperBoton, (agotado || Number(item.cantidad) >= stock) && styles.stepperInactivo]} onPress={() => cambiarCantidad(item.id, 1, stock)} disabled={agotado || Number(item.cantidad) >= stock}>
                  <Text style={styles.stepperTexto}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      {itemsActualizados.length > 0 && (
        <View style={styles.cajaEnvio}>
          <EntregaEnvio entrega={entrega} />
        </View>
      )}

      {itemsActualizados.length > 0 && (
        <View>
          <View style={styles.resumen}>
            <Text>Subtotal: ${subtotal}</Text>
            {entrega.conEnvio && <Text>Envío: {entrega.envio ? (entrega.envio.costo === 0 ? 'gratis' : `$${entrega.envio.costo}`) : 'sin calcular'}</Text>}
          </View>
          {hayProblemasStock && <Text style={styles.avisoStock}>Hay productos seleccionados sin stock suficiente. No podés confirmar hasta corregir el carrito.</Text>}
          <View style={styles.filaTotal}>
            <View style={styles.totalBox}><Text style={styles.totalTexto}>${total}</Text></View>
            <TouchableOpacity style={[styles.botonComprar, hayProblemasStock && styles.botonDeshabilitado]} onPress={prepararCompra}>
              <Text style={styles.botonComprarTexto}>Preparar compra</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CarruselProductos
        titulo="También te puede interesar"
        productos={recomendados}
        onPress={(producto) => navigation.navigate('DetalleProducto', { producto })}
        onAgregar={(producto) => setProductoModal(producto)}
      />

      <ModalAgregar
        producto={productoModal}
        maxCantidad={productoModal?.stockDisponible ?? 0}
        onCancelar={() => setProductoModal(null)}
        onConfirmar={confirmarAgregado}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { paddingBottom: 35 },
  filaSeleccionarTodo: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  textoSeleccionarTodo: { marginLeft: 10, fontSize: 15 },
  checkboxWrapper: { justifyContent: 'center', paddingRight: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#c77b00', justifyContent: 'center', alignItems: 'center' },
  checkboxActivo: { backgroundColor: '#c77b00' },
  checkboxDeshabilitado: { opacity: 0.45 },
  check: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  carritoVacio: { textAlign: 'center', color: '#888', marginTop: 30, paddingHorizontal: 20 },
  filaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 10, padding: 10, borderRadius: 10 },
  fotoPlaceholder: { width: 60, height: 60, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginLeft: 8, overflow: 'hidden' },
  fotoCarrito: { width: '100%', height: '100%' },
  capaAgotado: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(45,33,24,0.58)', justifyContent: 'center', alignItems: 'center' },
  textoAgotado: { color: '#fff', fontWeight: '900', fontSize: 10 },
  infoItem: { flex: 1, marginLeft: 9 },
  nombreItem: { fontWeight: 'bold', fontSize: 12 },
  precioItem: { color: '#c77b00', marginTop: 2 },
  stockDisponible: { color: '#777', fontSize: 10, marginTop: 3 },
  stockAgotado: { color: '#B42318', fontSize: 10, fontWeight: 'bold', marginTop: 3 },
  controles: { alignItems: 'center', marginLeft: 4 },
  tacho: { fontSize: 18, marginBottom: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffcc80', borderRadius: 6 },
  stepperBoton: { paddingHorizontal: 7, paddingVertical: 4 },
  stepperInactivo: { opacity: 0.4 },
  stepperTexto: { fontWeight: 'bold' },
  cantidadTexto: { marginHorizontal: 6 },
  cajaEnvio: { backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 10, padding: 12, borderRadius: 10 },
  resumen: { marginHorizontal: 12, marginTop: 4 },
  avisoStock: { color: '#B42318', marginHorizontal: 12, marginTop: 8, fontSize: 12 },
  filaTotal: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginVertical: 14 },
  totalBox: { backgroundColor: '#a5d6a7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginRight: 10 },
  totalTexto: { fontWeight: 'bold' },
  botonComprar: { flex: 1, backgroundColor: '#ffcc80', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  botonComprarTexto: { fontWeight: 'bold' },
  botonDeshabilitado: { opacity: 0.5 },
});
