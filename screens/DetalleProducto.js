import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useCarrito } from '../context/CarritoContext';

export default function DetalleProducto({ route }) {
  const { producto } = route.params;
  const [cantidad, setCantidad] = useState(1);

  const sumar = () => setCantidad((c) => c + 1);
  const restar = () => setCantidad((c) => (c > 1 ? c - 1 : 1));

const { agregarAlCarrito: agregarAlCarritoContext } = useCarrito();

const agregarAlCarrito = () => {
  agregarAlCarritoContext(producto, cantidad);
  Alert.alert('Agregado', `${cantidad} x ${producto.nombre} agregado al carrito.`);
};

  const comprarAhora = () => {
    Alert.alert('En proceso', 'Esta sección estará lista pronto.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.fotoGrande}><Text>Foto del producto</Text></View>

      <View style={styles.info}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.categoria}>{producto.categoria}</Text>
        <Text style={styles.precio}>${producto.precio}</Text>

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

        <TouchableOpacity style={styles.botonAgregar} onPress={agregarAlCarrito}>
          <Text style={styles.textoBotonAgregar}>Agregar al carrito</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  fotoGrande: { height: 260, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  info: { padding: 20 },
  nombre: { fontSize: 22, fontWeight: 'bold' },
  categoria: { color: '#888', marginTop: 2, marginBottom: 8 },
  precio: { fontSize: 20, fontWeight: 'bold', color: '#c77b00', marginBottom: 16 },
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
});