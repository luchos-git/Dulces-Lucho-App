import { ThemedText as Text } from '../context/ThemeContext';
// Muestra el avance real de los pedidos guardados en MySQL.
import { createThemedStyles } from '../context/ThemeContext';
// Los pedidos locales antiguos conservan el seguimiento simulado para no perder compatibilidad.
import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import ScrollView from '../components/GlobalRefreshScrollView';
import { useFocusEffect } from '@react-navigation/native';
import { usePedido } from '../context/PedidoContext';
import { useAuth } from '../context/AuthContext';
import { pasosDe, indicePaso } from '../data/seguimiento';
import { cancelarAvisos, notificarEstadoPedido } from '../services/notificaciones';
import { api } from '../services/api';

const INDICES_ESTADO = {
  confirmado: 0,
  preparando: 1,
  en_camino: 2,
  listo_para_retirar: 2,
  entregado: 'final',
  cancelado: 'cancelado',
};

export default function SeguimientoPedido({ navigation, route }) {
  const { pedidoActual, pedidos, limpiarPedido, sincronizarPedidos } = usePedido();
  const { usuario } = useAuth();
  const sincronizarRef = useRef(sincronizarPedidos);
  const ultimoEstadoRef = useRef(null);
  sincronizarRef.current = sincronizarPedidos;
  const pedidoId = route.params?.pedidoId;
  const idPedidoActual = pedidoId != null ? pedidoId : pedidoActual?.id;
  const pedidoSeleccionado = idPedidoActual != null
    ? pedidos.find((p) => String(p.id) === String(idPedidoActual))
    : pedidoActual;
  const [ahora, setAhora] = useState(Date.now());
  const [actualizando, setActualizando] = useState(false);
  const actualizarRef = useRef(null);

  useEffect(() => { ultimoEstadoRef.current = null; }, [pedidoId]);

  // Consulta MySQL al entrar, cada 5 segundos y también cuando el usuario desliza hacia abajo.
  // Así el avance que marca administración aparece rápidamente sin tener que salir de la pantalla.
  useFocusEffect(React.useCallback(() => {
    let vigente = true;
    let consultando = false;
    const cargarEstado = async (manual = false) => {
      if (!usuario?.id || consultando) return;
      consultando = true;
      if (manual) setActualizando(true);
      try {
        const remotos = await api(`/usuarios/${usuario.id}/pedidos`);
        if (!vigente) return;
        const pedidoRemoto = idPedidoActual != null
          ? remotos.find((p) => String(p.id) === String(idPedidoActual))
          : remotos.find((p) => !['entregado', 'cancelado'].includes(p.estadoPedido));
        const estadoNuevo = pedidoRemoto?.estadoPedido;
        const estadoAnterior = ultimoEstadoRef.current;
        if (estadoNuevo && estadoAnterior && estadoNuevo !== estadoAnterior && pedidoRemoto.notificacionesActivas) {
          await notificarEstadoPedido(pedidoRemoto.numero || pedidoRemoto.id, estadoNuevo);
        }
        if (estadoNuevo) ultimoEstadoRef.current = estadoNuevo;
        sincronizarRef.current(remotos);
      } catch (error) {
        console.warn('No se pudo actualizar el seguimiento:', error.message);
      } finally {
        consultando = false;
        if (manual && vigente) setActualizando(false);
      }
    };
    actualizarRef.current = () => cargarEstado(true);
    cargarEstado();
    const intervalo = setInterval(cargarEstado, 5000);
    return () => {
      vigente = false;
      actualizarRef.current = null;
      clearInterval(intervalo);
    };
  }, [usuario?.id, idPedidoActual]));

  // El reloj solo se utiliza con pedidos locales antiguos, no con ventas guardadas en MySQL.
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
  const estadoGuardado = pedidoSeleccionado.estadoPedido || (
    String(pedidoSeleccionado.id).startsWith('local-') ? null : pedidoSeleccionado.estado
  );
  const indiceGuardado = estadoGuardado ? INDICES_ESTADO[estadoGuardado] : null;
  const cancelado = indiceGuardado === 'cancelado';
  const entregado = estadoGuardado === 'entregado';
  const terminado = indiceGuardado === 'final' || cancelado || (
    indiceGuardado == null && indicePaso(pasos, (ahora - pedidoSeleccionado.inicio) / 1000) === pasos.length - 1
  );
  const indice = cancelado ? 0 : indiceGuardado === 'final'
    ? pasos.length - 1
    : typeof indiceGuardado === 'number'
      ? Math.min(indiceGuardado, pasos.length - 1)
      : indicePaso(pasos, (ahora - pedidoSeleccionado.inicio) / 1000);
  const pasoActual = cancelado
    ? { icono: '🚫', titulo: 'Pedido cancelado', detalle: 'Este pedido fue cancelado por la administración.' }
    : entregado
      ? { icono: '✅', titulo: 'Pedido entregado', detalle: 'La administración marcó este pedido como entregado.' }
      : pasos[indice];
  const colorEstado = cancelado ? styles.estadoCancelado : terminado ? styles.estadoTerminado : pasoActual.destacado ? styles.estadoDestacado : styles.estadoNormal;
  const seguimientoSimulado = !estadoGuardado;

  const finalizar = () => {
    navigation.popToTop();
    // Solo se marca localmente como finalizado cuando era un pedido simulado antiguo.
    // Los pedidos de MySQL conservan el estado que actualizó administración.
    if (!estadoGuardado) limpiarPedido(pedidoSeleccionado.id);
    cancelarAvisos();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 128 }} refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => actualizarRef.current?.()} colors={["#A86616"]} tintColor="#A86616" />} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={[styles.estado, colorEstado]}>
        <Text style={styles.estadoIcono}>{pasoActual.icono}</Text>
        <Text style={styles.estadoTitulo}>{pasoActual.titulo}</Text>
        <Text style={styles.estadoDetalle}>{pasoActual.detalle}</Text>
        <Text style={styles.estadoPedido}>Pedido #{pedidoSeleccionado.numero}</Text>
      </View>

      {!cancelado && (
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
                  <Text style={[styles.tituloPaso, !(hecho || actual) && styles.tituloPendiente, actual && styles.tituloActual]}>{paso.titulo}</Text>
                  {actual && <Text style={styles.detallePaso}>{paso.detalle}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.caja}>
        <Text style={styles.titulo}>Entrega</Text>
        {pedidoSeleccionado.conEnvio ? (
          <View>
            <Text>📍 {pedidoSeleccionado.destino || `${pedidoSeleccionado.direccion || ''}, ${pedidoSeleccionado.localidad || ''}`}</Text>
            {pedidoSeleccionado.distanciaKm != null && <Text style={styles.nota}>A {Number(pedidoSeleccionado.distanciaKm).toFixed(1)} km del local</Text>}
          </View>
        ) : <Text>Retiro en el local</Text>}
      </View>

      <View style={styles.caja}>
        <Text style={styles.titulo}>Tu pedido</Text>
        {(pedidoSeleccionado.items || []).map((item, i) => (
          <View key={`${item.id}-${i}`} style={styles.filaMonto}>
            <Text style={styles.nombreItem} numberOfLines={1}>{item.cantidad} x {item.nombre}</Text>
            <Text>${Number(item.precio || 0) * Number(item.cantidad || 0)}</Text>
          </View>
        ))}
        <View style={[styles.filaMonto, styles.filaTotal]}>
          <Text style={styles.totalTexto}>Total</Text>
          <Text style={styles.totalTexto}>${pedidoSeleccionado.total}</Text>
        </View>
      </View>

      {pedidoSeleccionado.codigoRapipago && (
        <View style={styles.caja}>
          <Text style={styles.titulo}>Pago en Rapipago</Text>
          <Text style={styles.codigo}>{pedidoSeleccionado.codigoRapipago}</Text>
          <Text style={styles.nota}>Abonalo en cualquier sucursal con este código.</Text>
        </View>
      )}

      <Text style={styles.avisos}>{pedidoSeleccionado.avisosActivados
        ? '🔔 Tenés activadas las notificaciones para este pedido.'
        : '🔕 Las notificaciones están desactivadas. Podés activarlas desde Configuración.'}</Text>
      <Text style={styles.simulacion}>{seguimientoSimulado ? 'Seguimiento simulado para un pedido local anterior.' : 'Estado actualizado desde la administración de Dulces Lucho.'}</Text>

      {terminado ? (
        <TouchableOpacity style={styles.botonPrincipal} onPress={finalizar}>
          <Text style={styles.botonPrincipalTexto}>{cancelado ? 'Volver al inicio' : 'Finalizar'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.botonSecundario} onPress={() => navigation.popToTop()}>
          <Text style={styles.botonSecundarioTexto}>Volver al inicio</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = createThemedStyles({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  vacio: { flex: 1, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', padding: 24 },
  vacioTexto: { color: '#555', marginBottom: 16, fontSize: 15, lineHeight: 22 },

  estado: { margin: 10, padding: 20, borderRadius: 12, alignItems: 'center' },
  estadoNormal: { backgroundColor: '#e3f2fd' },
  estadoDestacado: { backgroundColor: '#ffe0b2' },
  estadoTerminado: { backgroundColor: '#c8e6c9' },
  estadoCancelado: { backgroundColor: '#f8d7da' },
  estadoIcono: { fontSize: 44 },
  estadoTitulo: { fontSize: 23, fontWeight: 'bold', textAlign: 'center', marginTop: 6 },
  estadoDetalle: { color: '#555', textAlign: 'center', marginTop: 5, fontSize: 15, lineHeight: 22 },
  estadoPedido: { color: '#777', marginTop: 10, fontSize: 14 },

  caja: { backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 10, padding: 12, borderRadius: 10 },
  titulo: { fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  nota: { color: '#888', fontSize: 14, marginTop: 4 },

  filaPaso: { flexDirection: 'row' },
  columnaIndicador: { alignItems: 'center', width: 28 },
  circulo: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  circuloActivo: { borderColor: '#c77b00', backgroundColor: '#c77b00' },
  circuloActual: { backgroundColor: '#fff', borderWidth: 6 },
  checkPaso: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  linea: { width: 2, flex: 1, minHeight: 22, backgroundColor: '#ddd' },
  lineaActiva: { backgroundColor: '#c77b00' },
  textoPaso: { flex: 1, marginLeft: 10, paddingBottom: 14 },
  tituloPaso: { fontSize: 17 },
  tituloPendiente: { color: '#aaa' },
  tituloActual: { fontWeight: 'bold' },
  detallePaso: { color: '#666', marginTop: 3, fontSize: 14, lineHeight: 20 },

  filaMonto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nombreItem: { flex: 1, marginRight: 10, fontSize: 14 },
  filaTotal: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 },
  totalTexto: { fontWeight: 'bold', fontSize: 18 },

  codigo: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },

  avisos: { marginHorizontal: 14, marginTop: 4, color: '#555', fontSize: 14, lineHeight: 21 },
  simulacion: { marginHorizontal: 14, marginTop: 6, color: '#999', fontSize: 14, lineHeight: 20 },

  botonPrincipal: { backgroundColor: '#007bff', margin: 10, marginTop: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  botonPrincipalTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  botonSecundario: { borderWidth: 1, borderColor: '#c77b00', margin: 10, marginTop: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  botonSecundarioTexto: { color: '#c77b00', fontWeight: 'bold', fontSize: 15 },
});
