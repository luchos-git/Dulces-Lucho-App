import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useCarrito } from '../context/CarritoContext';
import { useProductos } from '../context/ProductosContext';
import { useAuth } from '../context/AuthContext';
import SliderImagenes from '../components/SliderImagenes';

export default function DetalleProducto({ route, navigation }) {
  const { agregarAlCarrito } = useCarrito();
  const { productos, eliminarProducto } = useProductos();
  const { esAdmin } = useAuth();
  const [cantidad, setCantidad] = useState(1);
  const productoInicial = route.params.producto;
  const producto = productos.find((item) => String(item.id) === String(productoInicial.id)) || productoInicial;
  const stockDisponible = Math.max(0, Number(producto.stockDisponible ?? producto.stock_disponible ?? 0));
  const agotado = stockDisponible <= 0;

  const sumar = () => setCantidad((actual) => Math.min(stockDisponible, actual + 1));
  const restar = () => setCantidad((actual) => (actual > 1 ? actual - 1 : 1));

  useEffect(() => {
    if (stockDisponible > 0) setCantidad((actual) => Math.min(actual, stockDisponible));
  }, [stockDisponible]);

  const agregar = () => {
    const ok = agregarAlCarrito(producto, cantidad);
    if (!ok) { Alert.alert('Stock insuficiente', 'No quedan unidades suficientes de este producto.'); return; }
    Alert.alert('Agregado', `${cantidad} x ${producto.nombre} agregado al carrito.`);
  };

  const comprarAhora = () => {
    if (stockDisponible <= 0 || cantidad > stockDisponible) { Alert.alert('Stock insuficiente', 'No hay unidades suficientes para esa cantidad.'); return; }
    navigation.navigate('PrepararCompra', {
      items: [{ ...producto, cantidad, seleccionado: true }],
      subtotal: producto.precio * cantidad,
      comprarAhora: true,
      entrega: { conEnvio: false },
    });
  };

  // El administrador vuelve al formulario del panel con los datos de este producto.
  const modificarProducto = () => {
    navigation.navigate('PanelAdmin', { productoEditar: producto });
  };

  // La baja es lógica: el producto deja de aparecer en la tienda, pero se conserva en las ventas.
  const confirmarEliminar = () => {
    Alert.alert(
      'Eliminar producto',
      `¿Querés eliminar “${producto.nombre}” del catálogo? Se conservará el historial de ventas anteriores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarProducto(producto.id);
              Alert.alert('Producto eliminado', 'El producto ya no aparece en el catálogo.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('No se pudo eliminar', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.marcoFotoGrande}>
        {(producto.imagenes?.length || producto.imagenUrl) ? (
          <SliderImagenes imagenes={producto.imagenes?.length ? producto.imagenes : [producto.imagenUrl]} style={styles.fotoGrande} resizeMode="cover" />
        ) : (
          <View style={styles.fotoGrande}>
            <Text>{producto.categoria === 'Jugos' ? '🧃' : producto.categoria === 'Combos' ? '🍬' : '🍫'}</Text>
            <Text>Foto del producto</Text>
          </View>
        )}
        {agotado && <View pointerEvents="none" style={styles.capaAgotado}><Text style={styles.textoAgotado}>AGOTADO</Text></View>}
      </View>

      <View style={styles.info}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.categoria}>{producto.categoria}</Text>
        <Text style={styles.precio}>${producto.precio}</Text>
        <Text style={styles.stock}>{agotado ? 'Sin unidades disponibles' : `${stockDisponible} unidades disponibles`}</Text>
        {producto.descripcion ? <Text style={styles.descripcion}>{producto.descripcion}</Text> : null}

        {agotado ? (
          <TouchableOpacity style={styles.botonPedidoAgotado} onPress={() => navigation.navigate('PedidoAgotado', { producto })}>
            <Text style={styles.textoBotonPedido}>Realizar pedido</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.selectorCantidad}>
              <Text style={styles.label}>Cantidad</Text>
              <View style={styles.contador}>
                <TouchableOpacity style={styles.botonContador} onPress={restar}>
                  <Text style={styles.botonContadorTexto}>-</Text>
                </TouchableOpacity>
                <Text style={styles.cantidadTexto}>{cantidad}</Text>
                <TouchableOpacity style={[styles.botonContador, cantidad >= stockDisponible && styles.botonInactivo]} onPress={sumar} disabled={cantidad >= stockDisponible}>
                  <Text style={styles.botonContadorTexto}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.botonComprar} onPress={comprarAhora}>
              <Text style={styles.textoBotonComprar}>Comprar ahora</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonAgregar} onPress={agregar}>
              <Text style={styles.textoBotonAgregar}>Agregar al carrito</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Estas dos opciones aparecen en la ficha solamente cuando la cuenta es administradora. */}
        {esAdmin ? (
          <View style={styles.cajaAdmin}>
            <Text style={styles.tituloAdmin}>Opciones de administrador</Text>
            <TouchableOpacity style={styles.botonModificar} onPress={modificarProducto}>
              <Text style={styles.textoBotonModificar}>Modificar producto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonEliminar} onPress={confirmarEliminar}>
              <Text style={styles.textoBotonEliminar}>Eliminar del catálogo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!agotado && productos
          .filter((item) => Number(item.stockDisponible ?? 0) > 0 && item.categoria === producto.categoria && String(item.id) !== String(producto.id))
          .slice(0, 2)
          .map((item) => (
            <TouchableOpacity key={item.id} style={styles.parecido} onPress={() => navigation.push('DetalleProducto', { producto: item })}>
              <Text>{item.nombre}</Text>
              <Text style={styles.precio}>${item.precio}</Text>
            </TouchableOpacity>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  marcoFotoGrande: { height: 260, backgroundColor: '#eee', position: 'relative', overflow: 'hidden' },
  fotoGrande: { width: '100%', height: '100%', backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  capaAgotado: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(45,33,24,0.62)', justifyContent: 'center', alignItems: 'center' },
  textoAgotado: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  stock: { color: '#806B4E', fontSize: 12, marginBottom: 12 },
  botonPedidoAgotado: { backgroundColor: '#A86616', padding: 15, borderRadius: 9, alignItems: 'center', marginTop: 6 },
  textoBotonPedido: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonInactivo: { opacity: 0.4 },
  info: { padding: 20 },
  nombre: { fontSize: 22, fontWeight: 'bold' },
  categoria: { color: '#888', marginTop: 2, marginBottom: 8 },
  precio: { fontSize: 20, fontWeight: 'bold', color: '#c77b00', marginBottom: 12 },
  descripcion: { color: '#555', marginBottom: 16 },
  selectorCantidad: { marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 6, color: '#555' },
  contador: { flexDirection: 'row', alignItems: 'center' },
  botonContador: { width: 36, height: 36, backgroundColor: '#ffcc80', justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  botonContadorTexto: { fontSize: 18, fontWeight: 'bold' },
  cantidadTexto: { marginHorizontal: 16, fontSize: 16 },
  botonComprar: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotonComprar: { color: '#fff', fontWeight: 'bold' },
  botonAgregar: { backgroundColor: '#ffcc80', padding: 14, borderRadius: 8, alignItems: 'center' },
  textoBotonAgregar: { fontWeight: 'bold' },
  cajaAdmin: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginTop: 20, borderWidth: 1, borderColor: '#ead7bd' },
  tituloAdmin: { fontWeight: 'bold', marginBottom: 10, color: '#5c3c12' },
  botonModificar: { backgroundColor: '#ffcc80', padding: 13, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  textoBotonModificar: { color: '#3d2a0d', fontWeight: 'bold' },
  botonEliminar: { backgroundColor: '#fde8e7', padding: 13, borderRadius: 8, alignItems: 'center' },
  textoBotonEliminar: { color: '#b42318', fontWeight: 'bold' },
  parecido: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 10 },
});
