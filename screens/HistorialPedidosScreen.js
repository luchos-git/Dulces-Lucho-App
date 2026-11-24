// Historial de pedidos sincronizado con MySQL y filtrado por el ID de la cuenta activa.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePedido } from '../context/PedidoContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const ETIQUETAS = { confirmado: 'Confirmado', preparando: 'Preparando', en_camino: 'En camino', listo_para_retirar: 'Listo para retirar', entregado: 'Entregado', cancelado: 'Cancelado' };

export default function HistorialPedidosScreen({ navigation }) {
  const { pedidos, sincronizarPedidos } = usePedido();
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [pedidosAnticipados, setPedidosAnticipados] = useState([]);

  const cargar = useCallback(async () => {
    if (!usuario?.id) { setCargando(false); return; }
    try {
      const [remotos, anticipados] = await Promise.all([
        api(`/usuarios/${usuario.id}/pedidos`),
        api(`/usuarios/${usuario.id}/pedidos-anticipados`),
      ]);
      sincronizarPedidos(remotos);
      setPedidosAnticipados(Array.isArray(anticipados) ? anticipados : []);
    } catch (error) {
      Alert.alert('No se pudo actualizar el historial', error.message);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [usuario?.id, sincronizarPedidos]);

  useEffect(() => {
    setCargando(true);
    cargar();
    const quitarListener = navigation.addListener('focus', cargar);
    return quitarListener;
  }, [navigation, cargar]);

  const pedidosUsuario = pedidos.filter((pedido) =>
    String(pedido.usuarioId ?? pedido.usuario_id ?? '') === String(usuario?.id ?? '')
  );
  const activos = pedidosUsuario.filter((p) => !['entregado', 'cancelado'].includes(p.estadoPedido || p.estado));
  const historial = pedidosUsuario.filter((p) => ['entregado', 'cancelado'].includes(p.estadoPedido || p.estado));
  const estadoAnticipado = { pendiente_reposicion: 'Esperando reposición', producto_disponible: 'Producto disponible', confirmado: 'Confirmado por la tienda', cancelado: 'Cancelado' };

  const lista = (titulo, elementos) => (
    <>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {elementos.length ? elementos.map((pedido) => (
        <TouchableOpacity key={`${usuario?.id}-${pedido.id}`} style={styles.tarjeta} onPress={() => navigation.navigate('Seguimiento', { pedidoId: pedido.id })}>
          <Text style={styles.numero}>Pedido #{pedido.numero || pedido.id}</Text>
          <Text style={styles.identificador}>ID de pedido: #{pedido.pedidoId || pedido.id} · Cuenta: #{usuario?.id}</Text>
          <Text>{ETIQUETAS[pedido.estadoPedido || pedido.estado] || pedido.estadoPedido || pedido.estado} · ${Number(pedido.total || 0).toFixed(2)}</Text>
          <Text style={styles.detalle}>{(pedido.items || []).map((item) => `${item.cantidad} x ${item.nombre}`).join(', ')}</Text>
        </TouchableOpacity>
      )) : <Text style={styles.vacio}>Todavía no hay pedidos en esta sección.</Text>}
    </>
  );

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido} refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { setActualizando(true); cargar(); }} />}>
      <Text style={styles.titulo}>Mis pedidos</Text>
      <Text style={styles.identificacion}>Pedidos pertenecientes a la cuenta #{usuario?.id ?? '—'}</Text>
      {cargando && <View style={styles.cargando}><ActivityIndicator color="#A86616" /><Text style={styles.vacio}>Actualizando desde MySQL...</Text></View>}
      {lista('Pedidos en curso', activos)}
      {lista('Historial de pedidos', historial)}
      <Text style={styles.tituloSeccion}>Pedidos por reposición</Text>
      {pedidosAnticipados.length ? pedidosAnticipados.map((pedido) => (
        <View key={`reposicion-${usuario?.id}-${pedido.id}`} style={styles.tarjeta}>
          <Text style={styles.numero}>Solicitud {pedido.numero} · Producto: {pedido.producto}</Text>
          <Text style={styles.identificador}>ID de solicitud: #{pedido.id} · Cuenta: #{pedido.usuarioId}</Text>
          <Text>{pedido.cantidad} unidad(es) · {estadoAnticipado[pedido.estado] || pedido.estado}</Text>
          <Text style={styles.detalle}>Fecha solicitada: {String(pedido.fechaDeseada).slice(0, 10)} · Llegada estimada: {pedido.fechaEstimada ? String(pedido.fechaEstimada).slice(0, 10) : 'A confirmar'}</Text>
          <Text style={styles.detalle}>{pedido.modalidadEntrega === 'envio' ? `Envío a ${pedido.direccion}, ${pedido.localidad}` : 'Retiro en el local'} · Pago preferido: {pedido.metodoPago}</Text>
          <Text style={styles.detalle}>{pedido.estado === 'confirmado' ? 'La tienda confirmó la solicitud y reservó las unidades.' : 'La solicitud no se cobra ni reserva stock hasta que la tienda confirme la disponibilidad.'}</Text>
        </View>
      )) : <Text style={styles.vacio}>Todavía no hiciste solicitudes de productos agotados.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 12, paddingBottom: 30 },
  titulo: { fontSize: 22, color: '#35230E', fontWeight: 'bold' },
  identificacion: { color: '#89530D', backgroundColor: '#FFF0D8', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  tituloSeccion: { fontSize: 17, fontWeight: 'bold', marginTop: 14, marginBottom: 7, color: '#80500F' },
  tarjeta: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  numero: { fontWeight: 'bold', color: '#35230E' },
  detalle: { color: '#777', marginTop: 4, fontSize: 12 },
  identificador: { color: '#806B4E', marginTop: 3, marginBottom: 4, fontSize: 11 },
  vacio: { color: '#777', marginBottom: 12, marginTop: 5 },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
