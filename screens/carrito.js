import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useCarrito } from '../context/CarritoContext';
import { productos } from '../data/productos';

export default function CarritoScreen() {
  const { items, quitarDelCarrito, cambiarCantidad, toggleSeleccionado, toggleSeleccionarTodo } = useCarrito();

  const todosSeleccionados = items.length > 0 && items.every((i) => i.seleccionado);
  const total = items
    .filter((i) => i.seleccionado)
    .reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  const idsEnCarrito = items.map((i) => i.id);
  const recomendados = productos.filter((p) => !idsEnCarrito.includes(p.id)).slice(0, 2);

  const prepararCompra = () => Alert.alert('En proceso', 'Esta sección estará lista pronto.');

  return (
    <ScrollView style={styles.container}>
      {items.length > 0 && (
        <TouchableOpacity style={styles.filaSeleccionarTodo} onPress={toggleSeleccionarTodo}>
          <View style={[styles.checkbox, todosSeleccionados && styles.checkboxActivo]}>
            {todosSeleccionados && <Text style={styles.check}>✓</Text>}
          </View>
          <Text style={styles.textoSeleccionarTodo}>Seleccionar todo</Text>
        </TouchableOpacity>
      )}

      {items.length === 0 && (
        <Text style={styles.carritoVacio}>Tu carrito está vacío. Agregá productos desde el catálogo.</Text>
      )}

      {items.map((item) => (
        <View key={item.id} style={styles.filaItem}>
          <TouchableOpacity onPress={() => toggleSeleccionado(item.id)} style={styles.checkboxWrapper}>
            <View style={[styles.checkbox, item.seleccionado && styles.checkboxActivo]}>
              {item.seleccionado && <Text style={styles.check}>✓</Text>}
            </View>
          </TouchableOpacity>

          <View style={styles.fotoPlaceholder}><Text>Foto</Text></View>

          <View style={styles.infoItem}>
            <Text style={styles.nombreItem}>{item.nombre}</Text>
            <Text style={styles.precioItem}>${item.precio}</Text>
          </View>

          <View style={styles.controles}>
            <TouchableOpacity onPress={() => quitarDelCarrito(item.id)}>
              <Text style={styles.tacho}>🗑️</Text>
            </TouchableOpacity>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperBoton} onPress={() => cambiarCantidad(item.id, -1)}>
                <Text style={styles.stepperTexto}>-</Text>
              </TouchableOpacity>
              <Text style={styles.cantidadTexto}>{item.cantidad}</Text>
              <TouchableOpacity style={styles.stepperBoton} onPress={() => cambiarCantidad(item.id, 1)}>
                <Text style={styles.stepperTexto}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {items.length > 0 && (
        <View style={styles.filaTotal}>
          <View style={styles.totalBox}>
            <Text style={styles.totalTexto}>${total}</Text>
          </View>
          <TouchableOpacity style={styles.botonComprar} onPress={prepararCompra}>
            <Text style={styles.botonComprarTexto}>Preparar compra</Text>
          </TouchableOpacity>
        </View>
      )}

      {recomendados.length > 0 && (
        <>
          <Text style={styles.tituloSeccion}>También te puede interesar</Text>
          <View style={styles.filaRecomendados}>
            {recomendados.map((prod) => (
              <View key={prod.id} style={styles.cardRecomendado}>
                <View style={styles.fotoPlaceholderChica}><Text>Foto</Text></View>
                <Text numberOfLines={1}>{prod.nombre}</Text>
                <Text style={styles.precioItem}>${prod.precio}</Text>
                <TouchableOpacity
                  style={styles.botonAgregarChico}
                  onPress={() => Alert.alert('En proceso', 'Andá al detalle del producto para agregarlo.')}
                >
                  <Text>Agregar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },

  filaSeleccionarTodo: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  textoSeleccionarTodo: { marginLeft: 10, fontSize: 15 },

  checkboxWrapper: { justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#c77b00', justifyContent: 'center', alignItems: 'center' },
  checkboxActivo: { backgroundColor: '#c77b00' },
  check: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  carritoVacio: { textAlign: 'center', color: '#888', marginTop: 30, paddingHorizontal: 20 },

  filaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 10, padding: 10, borderRadius: 10 },
  fotoPlaceholder: { width: 60, height: 60, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginLeft: 10 },
  infoItem: { flex: 1, marginLeft: 10 },
  nombreItem: { fontWeight: 'bold' },
  precioItem: { color: '#c77b00', marginTop: 2 },

  controles: { alignItems: 'center' },
  tacho: { fontSize: 18, marginBottom: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffcc80', borderRadius: 6 },
  stepperBoton: { paddingHorizontal: 8, paddingVertical: 4 },
  stepperTexto: { fontWeight: 'bold' },
  cantidadTexto: { marginHorizontal: 6 },

  filaTotal: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginVertical: 14 },
  totalBox: { backgroundColor: '#a5d6a7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginRight: 10 },
  totalTexto: { fontWeight: 'bold' },
  botonComprar: { flex: 1, backgroundColor: '#ffcc80', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  botonComprarTexto: { fontWeight: 'bold' },

  tituloSeccion: { fontSize: 16, fontWeight: 'bold', marginLeft: 10, marginTop: 10, marginBottom: 6 },
  filaRecomendados: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 20 },
  cardRecomendado: { width: 150, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10 },
  fotoPlaceholderChica: { width: '100%', height: 70, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 6 },
  botonAgregarChico: { backgroundColor: '#ffcc80', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, marginTop: 5 },
});