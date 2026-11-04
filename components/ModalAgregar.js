import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Ventana para elegir la cantidad antes de sumar un producto al carrito.
// producto = null  → cerrada.
export default function ModalAgregar({ producto, onCancelar, onConfirmar }) {
  const [cantidad, setCantidad] = useState(1);

  // Cada vez que se abre con otro producto, vuelve a 1
  useEffect(() => {
    setCantidad(1);
  }, [producto]);

  return (
    <Modal visible={producto !== null} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.fondo}>
        {producto && (
          <View style={styles.caja}>
            <View style={styles.foto}><Text>Foto</Text></View>

            <Text style={styles.nombre}>{producto.nombre}</Text>
            <Text style={styles.categoria}>{producto.categoria}</Text>
            <Text style={styles.descripcion}>{producto.descripcion || 'Sin descripción por ahora.'}</Text>
            <Text style={styles.precio}>${producto.precio} c/u</Text>

            <View style={styles.filaCantidad}>
              <Text style={styles.label}>Cantidad</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBoton} onPress={() => setCantidad((c) => Math.max(1, c - 1))}>
                  <Text style={styles.stepperTexto}>-</Text>
                </TouchableOpacity>
                <Text style={styles.cantidad}>{cantidad}</Text>
                <TouchableOpacity style={styles.stepperBoton} onPress={() => setCantidad((c) => c + 1)}>
                  <Text style={styles.stepperTexto}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.subtotal}>Subtotal: ${producto.precio * cantidad}</Text>

            <View style={styles.filaBotones}>
              <TouchableOpacity style={styles.botonCancelar} onPress={onCancelar}>
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonAgregar} onPress={() => onConfirmar(cantidad)}>
                <Text style={styles.botonAgregarTexto}>Agregar al carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  caja: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  foto: { height: 110, backgroundColor: '#eee', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  nombre: { fontSize: 18, fontWeight: 'bold' },
  categoria: { color: '#888', marginBottom: 6 },
  descripcion: { color: '#555', marginBottom: 8 },
  precio: { color: '#c77b00', fontWeight: 'bold', marginBottom: 12 },

  filaCantidad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, color: '#555' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffcc80', borderRadius: 6 },
  stepperBoton: { paddingHorizontal: 14, paddingVertical: 8 },
  stepperTexto: { fontWeight: 'bold', fontSize: 16 },
  cantidad: { marginHorizontal: 8, fontSize: 16 },

  subtotal: { fontWeight: 'bold', marginTop: 12, marginBottom: 14 },
  filaBotones: { flexDirection: 'row' },
  botonCancelar: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginRight: 8 },
  botonAgregar: { flex: 2, backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botonAgregarTexto: { color: '#fff', fontWeight: 'bold' },
});
