// Administración de ventas: lista compras guardadas en MySQL y permite actualizar su estado logístico.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const SIGUIENTES = {
  confirmado: 'preparando', preparando: 'en_camino', en_camino: 'entregado',
  listo_para_retirar: 'entregado', entregado: 'entregado', cancelado: 'cancelado',
};
const ETIQUETAS = { confirmado: 'Confirmado', preparando: 'Preparando', en_camino: 'En camino', listo_para_retirar: 'Listo para retirar', entregado: 'Entregado', cancelado: 'Cancelado' };

export default function AdminVentasScreen() {
  const { usuario } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const cargar = useCallback(async () => {
    try { setVentas(await api(`/admin/ventas?adminId=${usuario.id}`)); }
    catch (e) { Alert.alert('No se pudieron cargar las ventas', e.message); }
    finally { setCargando(false); setActualizando(false); }
  }, [usuario?.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (venta, estadoPedido) => {
    try {
      await api(`/admin/ventas/${venta.id}/estado`, { method: 'PATCH', body: JSON.stringify({ adminId: usuario.id, estadoPedido }) });
      setVentas((lista) => lista.map((v) => v.id === venta.id ? { ...v, estadoPedido } : v));
    } catch (e) { Alert.alert('No se pudo actualizar el pedido', e.message); }
  };

  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text>Cargando pedidos...</Text></View>;
  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido} refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { setActualizando(true); cargar(); }} />}>
      <Text style={styles.titulo}>Pedidos y ventas</Text>
      <Text style={styles.descripcion}>Compras registradas en MySQL. Deslizá hacia abajo para actualizar.</Text>
      {ventas.length === 0 ? <View style={styles.vacio}><Text>No hay compras registradas todavía.</Text></View> : ventas.map((v) => {
        const estado = v.estadoPedido || 'confirmado';
        let siguiente = SIGUIENTES[estado] || 'confirmado';
        if (estado === 'preparando' && !v.conEnvio) siguiente = 'listo_para_retirar';
        return (
          <View key={v.id} style={styles.tarjeta}>
            <View style={styles.fila}><Text style={styles.numero}>Pedido #{v.numero || v.id}</Text><Text style={styles.total}>${Number(v.total).toFixed(2)}</Text></View>
            <Text style={styles.cliente}>{v.nombreUsuario} · {v.email}</Text>
            <Text style={styles.detalle}>Pago: {v.metodoPago} ({v.estadoPago})</Text>
            <Text style={styles.detalle}>Estado: {ETIQUETAS[estado] || estado}</Text>
            <Text style={styles.detalle}>{v.conEnvio ? `Envío: ${v.direccion}, ${v.localidad}` : 'Retiro en el local'}</Text>
            {(v.items || []).map((it, i) => <Text key={`${v.id}-${i}`} style={styles.item}>{it.cantidad} × {it.nombre}</Text>)}
            {estado !== 'entregado' && estado !== 'cancelado' && (
              <View style={styles.botones}>
                <TouchableOpacity style={styles.boton} onPress={() => cambiarEstado(v, siguiente)}><Text style={styles.botonTexto}>Avanzar a: {ETIQUETAS[siguiente]}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.botonCancelar} onPress={() => Alert.alert('Cancelar pedido', '¿Confirmás cancelar este pedido?', [{ text: 'No', style: 'cancel' }, { text: 'Sí, cancelar', style: 'destructive', onPress: () => cambiarEstado(v, 'cancelado') }])}><Text style={styles.cancelarTexto}>Cancelar</Text></TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
const styles = StyleSheet.create({ contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 30 }, centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1' }, titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' }, descripcion: { color: '#765F43', marginTop: 5, marginBottom: 12 }, vacio: { backgroundColor: '#fff', borderRadius: 10, padding: 18 }, tarjeta: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 11 }, fila: { flexDirection: 'row', justifyContent: 'space-between' }, numero: { color: '#35230E', fontWeight: 'bold', fontSize: 15 }, total: { color: '#A45F00', fontWeight: 'bold' }, cliente: { color: '#6B4B27', marginTop: 5, fontWeight: '600' }, detalle: { color: '#79664D', fontSize: 12, marginTop: 4 }, item: { color: '#51402C', fontSize: 12, marginTop: 3 }, botones: { marginTop: 10 }, boton: { backgroundColor: '#E8A23A', padding: 10, borderRadius: 8, alignItems: 'center' }, botonTexto: { color: '#38240D', fontWeight: 'bold', fontSize: 12 }, botonCancelar: { padding: 9, alignItems: 'center' }, cancelarTexto: { color: '#B64D3B', fontWeight: '600' } });
