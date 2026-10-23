import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useCarrito } from '../context/CarritoContext';
import { productos } from '../data/productos';
import { calcularEnvio, UMBRAL_GRATIS_KM } from '../services/envio';

export default function CarritoScreen({ navigation }) {
  const { items, quitarDelCarrito, cambiarCantidad, toggleSeleccionado, toggleSeleccionarTodo } = useCarrito();

  const [conEnvio, setConEnvio] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [envio, setEnvio] = useState(null); // { distanciaKm, costo }
  const [calculando, setCalculando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  const todosSeleccionados = items.length > 0 && items.every((i) => i.seleccionado);
  const subtotal = items
    .filter((i) => i.seleccionado)
    .reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const costoEnvio = conEnvio && envio ? envio.costo : 0;
  const total = subtotal + costoEnvio;

  const idsEnCarrito = items.map((i) => i.id);
  const recomendados = productos.filter((p) => !idsEnCarrito.includes(p.id)).slice(0, 2);

  const irADetalle = (item) => {
    const { cantidad, seleccionado, ...producto } = item;
    navigation.navigate('DetalleProducto', { producto });
  };

  const calcular = async () => {
    if (!direccion.trim()) {
      setErrorEnvio('Escribí tu dirección (calle y número).');
      return;
    }
    setCalculando(true);
    setErrorEnvio('');
    setEnvio(null);
    try {
      const resultado = await calcularEnvio(direccion.trim());
      setEnvio(resultado);
    } catch (e) {
      setErrorEnvio(e.message || 'No pudimos calcular el envío. Probá de nuevo.');
    } finally {
      setCalculando(false);
    }
  };

  const prepararCompra = () => {
    const seleccionados = items.filter((i) => i.seleccionado);
    if (seleccionados.length === 0) {
      Alert.alert('Carrito vacío', 'Seleccioná al menos un producto para continuar.');
      return;
    }
    if (conEnvio && !envio) {
      Alert.alert('Falta el envío', 'Calculá el costo de envío antes de continuar.');
      return;
    }
    navigation.navigate('PrepararCompra', {
      items: seleccionados,
      subtotal,
      conEnvio,
      direccion,
      envio,
    });
  };

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
        <TouchableOpacity
          key={item.id}
          style={styles.filaItem}
          activeOpacity={0.8}
          onPress={() => irADetalle(item)}
        >
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
        </TouchableOpacity>
      ))}

      {items.length > 0 && (
        <View style={styles.cajaEnvio}>
          <Text style={styles.tituloEnvio}>Entrega</Text>

          <View style={styles.filaOpciones}>
            <TouchableOpacity
              style={[styles.opcion, !conEnvio && styles.opcionActiva]}
              onPress={() => setConEnvio(false)}
            >
              <Text style={[styles.opcionTexto, !conEnvio && styles.opcionTextoActivo]}>Retiro en el local</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.opcion, conEnvio && styles.opcionActiva]}
              onPress={() => setConEnvio(true)}
            >
              <Text style={[styles.opcionTexto, conEnvio && styles.opcionTextoActivo]}>Envío a domicilio</Text>
            </TouchableOpacity>
          </View>

          {conEnvio && (
            <View>
              <TextInput
                style={styles.inputDireccion}
                placeholder="Calle y número (ej: Av. Mitre 1234)"
                value={direccion}
                onChangeText={(texto) => {
                  setDireccion(texto);
                  setEnvio(null);
                }}
              />

              <TouchableOpacity style={styles.botonCalcular} onPress={calcular} disabled={calculando}>
                {calculando ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.botonCalcularTexto}>Calcular envío</Text>
                )}
              </TouchableOpacity>

              {errorEnvio !== '' && <Text style={styles.errorEnvio}>{errorEnvio}</Text>}

              {envio && (
                <Text style={styles.resultadoEnvio}>
                  {envio.distanciaKm.toFixed(1)} km — {envio.costo === 0 ? '¡Envío gratis!' : `Envío: $${envio.costo}`}
                </Text>
              )}

              <Text style={styles.notaEnvio}>Envío gratis hasta {UMBRAL_GRATIS_KM} km. Datos © OpenStreetMap.</Text>
            </View>
          )}
        </View>
      )}

      {items.length > 0 && (
        <View>
          <View style={styles.resumen}>
            <Text>Subtotal: ${subtotal}</Text>
            {conEnvio && (
              <Text>
                Envío: {envio ? (envio.costo === 0 ? 'gratis' : `$${envio.costo}`) : 'sin calcular'}
              </Text>
            )}
          </View>

          <View style={styles.filaTotal}>
            <View style={styles.totalBox}>
              <Text style={styles.totalTexto}>${total}</Text>
            </View>
            <TouchableOpacity style={styles.botonComprar} onPress={prepararCompra}>
              <Text style={styles.botonComprarTexto}>Preparar compra</Text>
            </TouchableOpacity>
          </View>
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

  cajaEnvio: { backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 10, padding: 12, borderRadius: 10 },
  tituloEnvio: { fontWeight: 'bold', marginBottom: 8 },
  filaOpciones: { flexDirection: 'row' },
  opcion: { flex: 1, borderWidth: 1, borderColor: '#ffcc80', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  opcionActiva: { backgroundColor: '#ffcc80' },
  opcionTexto: { color: '#c77b00' },
  opcionTextoActivo: { color: '#000', fontWeight: 'bold' },
  inputDireccion: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginTop: 12 },
  botonCalcular: { backgroundColor: '#ffcc80', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  botonCalcularTexto: { fontWeight: 'bold' },
  errorEnvio: { color: '#e57373', fontWeight: 'bold', marginTop: 8 },
  resultadoEnvio: { color: '#2e7d32', fontWeight: 'bold', marginTop: 8 },
  notaEnvio: { color: '#888', fontSize: 12, marginTop: 6 },

  resumen: { marginHorizontal: 12, marginTop: 4 },
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