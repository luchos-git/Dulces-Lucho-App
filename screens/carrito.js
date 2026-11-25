import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text } from '../context/ThemeContext';
// Muestra el carrito y un carrusel desplazable de productos que todavía tienen stock.
import { createThemedStyles } from '../context/ThemeContext';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useProductos } from '../context/ProductosContext';
import EntregaEnvio, { useEntrega } from '../components/EntregaEnvio';
import ModalAgregar from '../components/ModalAgregar';
import SliderImagenes from '../components/SliderImagenes';
import CarruselProductos from '../components/CarruselProductos';

const esDireccionPredeterminada = (direccion) =>
  direccion?.esPredeterminada === true || Number(direccion?.esPredeterminada) === 1;

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
  const { usuario } = useAuth();
  const entrega = useEntrega();
  const [productoModal, setProductoModal] = useState(null);
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState(null);
  const direccionEditadaManualmente = useRef(false);
  const direccionSeleccionadaRef = useRef(null);
  const direccionEraPredeterminadaRef = useRef(false);

  const cargarProductosRef = useRef(cargarProductos);
  cargarProductosRef.current = cargarProductos;

  useEffect(() => {
    const actualizar = () => {
      cargarProductosRef.current().catch((error) =>
        console.warn('No se pudo actualizar el catálogo del carrito:', error?.message || error)
      );
    };

    actualizar();
    const listener = navigation.addListener('focus', actualizar);
    return listener;
  }, [navigation]);

  // Carga las direcciones del usuario y preselecciona la marcada como principal.
  // Esta selección se utiliza en el carrito para calcular los kilómetros de envío.
  useEffect(() => {
    if (!usuario?.id) return undefined;
    let vigente = true;
    const cargarDirecciones = async () => {
      try {
        const lista = await api(`/usuarios/${usuario.id}/direcciones`);
        if (!vigente) return;
        const direcciones = Array.isArray(lista) ? lista : [];
        setDireccionesGuardadas(direcciones);
        if (!direccionEditadaManualmente.current) {
          const principal = direcciones.find(esDireccionPredeterminada) || direcciones[0];
          const seleccionAnterior = direccionSeleccionadaRef.current
            ? direcciones.find((d) => String(d.id) === String(direccionSeleccionadaRef.current))
            : null;
          const elegida = direccionEraPredeterminadaRef.current
            ? (principal || seleccionAnterior)
            : (seleccionAnterior || principal);
          if (elegida) {
            setDireccionSeleccionadaId(elegida.id);
            direccionSeleccionadaRef.current = elegida.id;
            direccionEraPredeterminadaRef.current = esDireccionPredeterminada(elegida);
            entrega.cambiarDireccion(elegida.direccion || '');
            entrega.cambiarLocalidad(elegida.localidad || '');
          }
        }
      } catch (error) {
        console.warn('No se pudieron cargar las direcciones del carrito:', error?.message || error);
      }
    };
    cargarDirecciones();
    const listener = navigation.addListener('focus', cargarDirecciones);
    return () => { vigente = false; listener(); };
  }, [usuario?.id, navigation, entrega.cambiarDireccion, entrega.cambiarLocalidad]);

  const seleccionarDireccion = (direccion) => {
    direccionEditadaManualmente.current = false;
    setDireccionSeleccionadaId(direccion.id);
    direccionSeleccionadaRef.current = direccion.id;
    direccionEraPredeterminadaRef.current = esDireccionPredeterminada(direccion);
    entrega.cambiarDireccion(direccion.direccion || '');
    entrega.cambiarLocalidad(direccion.localidad || '');
    entrega.setConEnvio(true);
  };

  const marcarDireccionEditada = () => {
    direccionEditadaManualmente.current = true;
    direccionSeleccionadaRef.current = null;
    direccionEraPredeterminadaRef.current = false;
    setDireccionSeleccionadaId(null);
  };

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
        direccionGuardadaId: entrega.conEnvio ? direccionSeleccionadaId : null,
        direccionGuardada: entrega.conEnvio
          ? (direccionesGuardadas.find((direccion) => String(direccion.id) === String(direccionSeleccionadaId)) || null)
          : null,
        envio: entrega.envio,
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
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
          {direccionesGuardadas.length > 0 && (
            <View style={styles.direccionesGuardadas}>
              <Text style={styles.tituloDirecciones}>Mis direcciones guardadas</Text>
              {direccionesGuardadas.map((direccion) => (
                <TouchableOpacity
                  key={direccion.id}
                  style={[styles.tarjetaDireccion, Number(direccionSeleccionadaId) === Number(direccion.id) && styles.tarjetaDireccionActiva]}
                  onPress={() => seleccionarDireccion(direccion)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nombreDireccion}>{direccion.alias || 'Dirección'}{esDireccionPredeterminada(direccion) ? ' · Principal' : ''}</Text>
                  <Text style={styles.textoDireccion}>{direccion.direccion}, {direccion.localidad}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <EntregaEnvio entrega={entrega} mostrarDireccionLocal onDireccionEditada={marcarDireccionEditada} />
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

const styles = createThemedStyles({
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
  direccionesGuardadas: { marginBottom: 12 },
  tituloDirecciones: { fontWeight: 'bold', marginBottom: 8 },
  tarjetaDireccion: { borderWidth: 1, borderColor: '#eadcc9', borderRadius: 8, padding: 9, marginBottom: 7 },
  tarjetaDireccionActiva: { borderColor: '#B97719', backgroundColor: '#FFF3E0' },
  nombreDireccion: { fontWeight: 'bold', fontSize: 13 },
  textoDireccion: { fontSize: 12, marginTop: 3 },
  resumen: { marginHorizontal: 12, marginTop: 4 },
  avisoStock: { color: '#B42318', marginHorizontal: 12, marginTop: 8, fontSize: 12 },
  filaTotal: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginVertical: 14 },
  totalBox: { backgroundColor: '#a5d6a7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginRight: 10 },
  totalTexto: { fontWeight: 'bold' },
  botonComprar: { flex: 1, backgroundColor: '#ffcc80', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  botonComprarTexto: { fontWeight: 'bold' },
  botonDeshabilitado: { opacity: 0.5 },
});
