// explicación del archivo: muestra la información completa de un producto, permite comprarlo y ofrece controles de edición al administrador
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useCarrito } from '../context/CarritoContext';
import { useProductos } from '../context/ProductosContext';
import { useAuth } from '../context/AuthContext';

export default function DetalleProducto({ route, navigation }) {
  const { agregarAlCarrito } = useCarrito();
  const { productos, eliminarProducto } = useProductos();
  const { esAdmin } = useAuth();
  const [cantidad, setCantidad] = useState(1);

  // usa la versión más reciente del producto por si el administrador volvió de editarlo
  const productoInicial = route.params.producto;
  const producto = productos.find((item) => String(item.id) === String(productoInicial.id)) || productoInicial;

  // aumenta la cantidad seleccionada en una unidad
  const sumar = () => setCantidad((actual) => actual + 1);

  // evita que la cantidad baje de una unidad
  const restar = () => setCantidad((actual) => (actual > 1 ? actual - 1 : 1));

  // agrega al carrito la cantidad seleccionada
  const agregar = () => {
    agregarAlCarrito(producto, cantidad);
    Alert.alert('Agregado', `${cantidad} x ${producto.nombre} agregado al carrito.`);
  };

  // envía el producto directamente a la pantalla de compra sin pasar por el carrito
  const comprarAhora = () => {
    navigation.navigate('PrepararCompra', {
      items: [{ ...producto, cantidad, seleccionado: true }],
      subtotal: producto.precio * cantidad,
      comprarAhora: true,
      entrega: { conEnvio: false },
    });
  };

  // abre el formulario administrativo con los datos del producto elegido
  const modificarProducto = () => {
    navigation.navigate('PanelAdmin', { productoEditar: producto });
  };

  // pide confirmación y realiza una baja lógica desde la propia ficha del producto
  const confirmarEliminar = () => {
    Alert.alert(
      'Eliminar producto',
      `¿Querés quitar "${producto.nombre}" del catálogo?`,
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

  // muestra foto, descripción, precio, cantidad y productos relacionados
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      {producto.imagenUrl ? (
        <Image source={{ uri: producto.imagenUrl }} style={styles.fotoGrande} resizeMode="cover" />
      ) : (
        <View style={styles.fotoGrande}>
          <Text style={styles.iconoFoto}>{producto.categoria === 'Jugos' ? '🧃' : producto.categoria === 'Combos' ? '🍬' : '🍫'}</Text>
          <Text style={styles.textoFoto}>imagen del producto</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.categoria}>{producto.categoria}</Text>
        <Text style={styles.precio}>${producto.precio}</Text>

        {producto.descripcion ? <Text style={styles.descripcion}>{producto.descripcion}</Text> : null}

        <View style={styles.selectorCantidad}>
          <Text style={styles.label}>Cantidad</Text>
          <View style={styles.contador}>
            <TouchableOpacity style={styles.botonContador} onPress={restar}>
              <Text style={styles.botonContadorTexto}>-</Text>
            </TouchableOpacity>
            <Text style={styles.cantidadTexto}>{cantidad}</Text>
            <TouchableOpacity style={styles.botonContador} onPress={sumar}>
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

        {esAdmin && (
          <View style={styles.cajaAdmin}>
            <Text style={styles.tituloAdmin}>Opciones de administrador</Text>
            <TouchableOpacity style={styles.botonModificar} onPress={modificarProducto}>
              <Text style={styles.textoBotonModificar}>✏️  Modificar producto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonEliminar} onPress={confirmarEliminar}>
              <Text style={styles.textoBotonEliminar}>🗑️  Eliminar producto</Text>
            </TouchableOpacity>
          </View>
        )}

        {productos
          .filter((item) => item.categoria === producto.categoria && String(item.id) !== String(producto.id))
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

// estilos de la ficha, los botones de compra y las acciones que solo ve el administrador
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { paddingBottom: 24 },
  fotoGrande: { height: 260, backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center' },
  iconoFoto: { fontSize: 76 },
  textoFoto: { color: '#9B7139', marginTop: 5, fontSize: 12 },
  info: { padding: 20 },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#35230E' },
  categoria: { color: '#888', marginTop: 2, marginBottom: 8 },
  precio: { fontSize: 20, fontWeight: 'bold', color: '#C77B00', marginBottom: 12 },
  descripcion: { color: '#555', marginBottom: 16, lineHeight: 20 },
  selectorCantidad: { marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 6, color: '#555' },
  contador: { flexDirection: 'row', alignItems: 'center' },
  botonContador: { width: 38, height: 38, backgroundColor: '#FFCC80', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  botonContadorTexto: { fontSize: 20, fontWeight: 'bold' },
  cantidadTexto: { marginHorizontal: 18, fontSize: 17, fontWeight: '600' },
  botonComprar: { backgroundColor: '#007BFF', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotonComprar: { color: '#fff', fontWeight: 'bold' },
  botonAgregar: { backgroundColor: '#FFCC80', padding: 14, borderRadius: 8, alignItems: 'center' },
  textoBotonAgregar: { fontWeight: 'bold', color: '#442B0B' },
  cajaAdmin: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginTop: 20, borderWidth: 1, borderColor: '#E8D8C2' },
  tituloAdmin: { fontWeight: 'bold', color: '#5E421F', marginBottom: 10 },
  botonModificar: { backgroundColor: '#FFF0D8', padding: 13, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  textoBotonModificar: { color: '#89530D', fontWeight: 'bold' },
  botonEliminar: { backgroundColor: '#FDE8E7', padding: 13, borderRadius: 8, alignItems: 'center' },
  textoBotonEliminar: { color: '#B42318', fontWeight: 'bold' },
  parecido: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 10 },
});
