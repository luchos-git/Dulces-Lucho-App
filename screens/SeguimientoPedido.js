import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { usePedido } from '../context/PedidoContext';
import { pasosDe, indicePaso } from '../data/seguimiento';
import { cancelarAvisos } from '../services/notificaciones';

export default function SeguimientoPedido({ navigation, route }) {
  const { pedidoActual, pedidos, limpiarPedido } = usePedido();
  const pedidoSeleccionado = route.params?.pedidoId ? pedidos.find((p) => p.id === route.params.pedidoId) : pedidoActual;
  const [ahora, setAhora] = useState(Date.now());

  // Reloj que actualiza la pantalla cada segundo
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  if (!pedidoSeleccionado) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.vacioTexto}>No tenés ningún pedido en curso.</Text>
        <TouchableOpacity style={styles.botonPrincipal} onPress={() => navigation.popToTop()}>
          <Text style={styles.botonPrincipalTexto}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pasos = pasosDe(pedidoSeleccionado);
  const segundos = (ahora - pedidoSeleccionado.inicio) / 1000;
  const indice = indicePaso(pasos, segundos);
  const pasoActual = pasos[indice];
  const terminado = indice === pasos.length - 1;

  const colorEstado = terminado ? styles.estadoTerminado : pasoActual.destacado ? styles.estadoDestacado : styles.estadoNormal;

  const finalizar = () => {
    navigation.popToTop();
    limpiarPedido(pedidoSeleccionado.id);
    cancelarAvisos();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Estado actual */}
      <View style={[styles.estado, colorEstado]}>
        <Text style={styles.estadoIcono}>{pasoActual.icono}</Text>
        <Text style={styles.estadoTitulo}>{pasoActual.titulo}</Text>
        <Text style={styles.estadoDetalle}>{pasoActual.detalle}</Text>
        <Text style={styles.estadoPedido}>Pedido #{pedidoSeleccionado.numero}</Text>
      </View>

      {/* Etapas */}
      <View style={styles.caja}>
        <Text style={styles.titulo}>Seguimiento</Text>
        {pasos.map((paso, i) => {
          const hecho = i < indice || (i === indice && terminado);
          const actual = i === indice;
          return (
            <View key={paso.titulo} style={styles.filaPaso}>
              <View style={styles.columnaIndicador}>
                <View style={[styles.circulo, (hecho || actual) && styles.circuloActivo, actual && !terminado && styles.circuloActual]}>
                  {hecho && <Text style={styles.checkPaso}>✓</Text>}
                </View>
                {i < pasos.length - 1 && <View style={[styles.linea, i < indice && styles.lineaActiva]} />}
              </View>
              <View style={styles.textoPaso}>
                <Text style={[styles.tituloPaso, !(hecho || actual) && styles.tituloPendiente, actual && styles.tituloActual]}>
                  {paso.titulo}
                </Text>
                {actual && <Text style={styles.detallePaso}>{paso.detalle}</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {/* Entrega */}
      <View style={styles.caja}>
        <Text style={styles.titulo}>Entrega</Text>
        {pedidoSeleccionado.conEnvio ? (
          <View>
            <Text>📍 {pedidoSeleccionado.destino || `${pedidoSeleccionado.direccion}, ${pedidoSeleccionado.localidad}`}</Text>
            {pedidoSeleccionado.distanciaKm !== null && (
              <Text style={styles.nota}>A {pedidoSeleccionado.distanciaKm.toFixed(1)} km del local</Text>
            )}
          </View>
        ) : (
          <Text>Retiro en el local</Text>
        )}
      </View>

      {/* Productos */}
      <View style={styles.caja}>
        <Text style={styles.titulo}>Tu pedido</Text>
        {pedidoSeleccionado.items.map((item) => (
          <View key={item.id} style={styles.filaMonto}>
            <Text style={styles.nombreItem} numberOfLines={1}>
              {item.cantidad} x {item.nombre}
            </Text>
            <Text>${item.precio * item.cantidad}</Text>
          </View>
        ))}
        <View style={[styles.filaMonto, styles.filaTotal]}>
          <Text style={styles.totalTexto}>Total</Text>
          <Text style={styles.totalTexto}>${pedidoSeleccionado.total}</Text>
        </View>
      </View>

      {/* Rapipago */}
      {pedidoSeleccionado.codigoRapipago && (
        <View style={styles.caja}>
          <Text style={styles.titulo}>Pago en Rapipago</Text>
          <Text style={styles.codigo}>{pedidoSeleccionado.codigoRapipago}</Text>
          <Text style={styles.nota}>Abonalo en cualquier sucursal con este código.</Text>
        </View>
      )}

      {/* Avisos */}
      <Text style={styles.avisos}>
        {pedidoSeleccionado.avisosActivados
          ? '🔔 Te avisamos con una notificación cuando cambie el estado de tu pedido.'
          : '🔕 Las notificaciones están desactivadas. Activalas en los ajustes del celular para recibir avisos; mientras tanto, mirá el estado acá.'}
      </Text>
      <Text style={styles.simulacion}>Seguimiento simulado: los tiempos y los avisos son de prueba.</Text>

      {terminado ? (
        <TouchableOpacity style={styles.botonPrincipal} onPress={finalizar}>
          <Text style={styles.botonPrincipalTexto}>Finalizar</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.botonSecundario} onPress={() => navigation.popToTop()}>
          <Text style={styles.botonSecundarioTexto}>Volver al inicio</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  vacio: { flex: 1, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', padding: 24 },
  vacioTexto: { color: '#555', marginBottom: 16 },

  estado: { margin: 10, padding: 20, borderRadius: 12, alignItems: 'center' },
  estadoNormal: { backgroundColor: '#e3f2fd' },
  estadoDestacado: { backgroundColor: '#ffe0b2' },
  estadoTerminado: { backgroundColor: '#c8e6c9' },
  estadoIcono: { fontSize: 44 },
  estadoTitulo: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 6 },
  estadoDetalle: { color: '#555', textAlign: 'center', marginTop: 4 },
  estadoPedido: { color: '#777', marginTop: 10, fontSize: 12 },

  caja: { backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 10, padding: 12, borderRadius: 10 },
  titulo: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  nota: { color: '#888', fontSize: 12, marginTop: 4 },

  filaPaso: { flexDirection: 'row' },
  columnaIndicador: { alignItems: 'center', width: 28 },
  circulo: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  circuloActivo: { borderColor: '#c77b00', backgroundColor: '#c77b00' },
  circuloActual: { backgroundColor: '#fff', borderWidth: 6 },
  checkPaso: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  linea: { width: 2, flex: 1, minHeight: 22, backgroundColor: '#ddd' },
  lineaActiva: { backgroundColor: '#c77b00' },
  textoPaso: { flex: 1, marginLeft: 10, paddingBottom: 14 },
  tituloPaso: { fontSize: 15 },
  tituloPendiente: { color: '#aaa' },
  tituloActual: { fontWeight: 'bold' },
  detallePaso: { color: '#666', marginTop: 2 },

  filaMonto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nombreItem: { flex: 1, marginRight: 10 },
  filaTotal: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 },
  totalTexto: { fontWeight: 'bold', fontSize: 16 },

  codigo: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },

  avisos: { marginHorizontal: 14, marginTop: 4, color: '#555' },
  simulacion: { marginHorizontal: 14, marginTop: 6, color: '#999', fontSize: 12 },

  botonPrincipal: { backgroundColor: '#007bff', margin: 10, marginTop: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  botonPrincipalTexto: { color: '#fff', fontWeight: 'bold' },
  botonSecundario: { borderWidth: 1, borderColor: '#c77b00', margin: 10, marginTop: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  botonSecundarioTexto: { color: '#c77b00', fontWeight: 'bold' },
});
