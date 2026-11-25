import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text } from '../context/ThemeContext';
// Muestra los comprobantes internos asociados exclusivamente a la cuenta que inició sesión.
import { createThemedStyles } from '../context/ThemeContext';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { usePedido } from '../context/PedidoContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const ETIQUETAS = {
  confirmado: 'Confirmado', preparando: 'Preparando', en_camino: 'En camino',
  listo_para_retirar: 'Listo para retirar', entregado: 'Entregado', cancelado: 'Cancelado',
};
const NOMBRES_PAGO = {
  credito: 'Tarjeta de crédito', debito: 'Tarjeta de débito', mercado_pago: 'Mercado Pago',
  cuenta_dni: 'Cuenta DNI', modo: 'MODO', naranja_x: 'Naranja X', uala: 'Ualá',
  transferencia: 'Transferencia bancaria', rapipago: 'Rapipago',
};

export default function FacturasScreen() {
  const { pedidos, sincronizarPedidos } = usePedido();
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario?.id) {
      setCargando(false);
      return;
    }
    try {
      const remotos = await api(`/usuarios/${usuario.id}/pedidos`);
      sincronizarPedidos(remotos);
    } catch (error) {
      console.warn('No se pudieron actualizar los comprobantes:', error.message);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [usuario?.id, sincronizarPedidos]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  // Doble control: el contexto ya está separado por cuenta y la pantalla vuelve a filtrar por ID.
  const pedidosUsuario = pedidos.filter((pedido) =>
    String(pedido.usuarioId ?? pedido.usuario_id ?? '') === String(usuario?.id ?? '')
  );

  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]}
      refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { setActualizando(true); cargar(); }} />}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.titulo}>Facturas y comprobantes</Text>
      <Text style={styles.descripcion}>
        Estos comprobantes corresponden únicamente a tus compras. Son resúmenes internos y no facturas fiscales.
      </Text>
      <View style={styles.identificacion}>
        <Text style={styles.identificacionTexto}>Cuenta: #{usuario?.id ?? '—'}</Text>
      </View>

      {cargando && pedidosUsuario.length === 0 ? (
        <View style={styles.vacio}><ActivityIndicator color="#A66A12" /><Text style={styles.textoVacio}>Buscando tus comprobantes…</Text></View>
      ) : pedidosUsuario.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.icono}>🧾</Text>
          <Text style={styles.tituloVacio}>Todavía no hay compras</Text>
          <Text style={styles.textoVacio}>Cuando realices un pedido desde esta cuenta, su comprobante aparecerá acá.</Text>
        </View>
      ) : (
        pedidosUsuario.map((pedido) => (
          <View key={`${usuario?.id}-${pedido.id}`} style={styles.tarjeta}>
            <View style={styles.encabezadoTarjeta}>
              <Text style={styles.numero}>Pedido #{pedido.numero || pedido.id}</Text>
              <Text style={styles.estado}>{ETIQUETAS[pedido.estadoPedido || pedido.estado] || pedido.estadoPedido || pedido.estado}</Text>
            </View>
            <Text style={styles.identificador}>ID de usuario: #{usuario.id} · ID de pedido: #{pedido.pedidoId || pedido.id}</Text>
            <Text style={styles.fecha}>
              {pedido.inicio ? new Date(pedido.inicio).toLocaleDateString() : 'Fecha no disponible'}
            </Text>
            <Text style={styles.detallePedido}>Medio de pago: {NOMBRES_PAGO[pedido.metodoPago] || pedido.metodoPago || 'No indicado'}</Text>
            {pedido.conEnvio && <>
              <Text style={styles.detallePedido}>Entrega: {pedido.direccionAlias || 'Dirección'} · {pedido.direccion || ''}, {pedido.localidad || ''}</Text>
              {!!pedido.direccionDestinatario && <Text style={styles.detallePedido}>Recibe: {pedido.direccionDestinatario}</Text>}
              {!!pedido.instruccionesEntrega && <Text style={styles.detallePedido}>Notas: {pedido.instruccionesEntrega}</Text>}
            </>}
            {(pedido.items || []).map((item, indice) => (
              <Text key={`${pedido.id}-${indice}`} style={styles.item}>
                {item.cantidad} x {item.nombre} — ${Number(item.precio || 0) * Number(item.cantidad || 0)}
              </Text>
            ))}
            <View style={styles.totalFila}>
              <Text style={styles.totalEtiqueta}>Total del pedido</Text>
              <Text style={styles.total}>${Number(pedido.total || 0).toFixed(2)}</Text>
            </View>
            <Text style={styles.aclaracion}>Cuenta #{usuario.id} · resumen interno · no válido como factura fiscal</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 16, paddingBottom: 30 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#35230E' },
  descripcion: { color: '#806B4E', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 12 },
  identificacion: { alignSelf: 'flex-start', backgroundColor: '#FFF0D8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 },
  identificacionTexto: { color: '#89530D', fontWeight: '600', fontSize: 12 },
  vacio: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 12, gap: 8 },
  icono: { fontSize: 38, marginBottom: 4 },
  tituloVacio: { fontSize: 16, fontWeight: 'bold', color: '#35230E' },
  textoVacio: { color: '#888', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  encabezadoTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  numero: { fontWeight: 'bold', color: '#35230E', fontSize: 15 },
  estado: { color: '#A66A12', fontSize: 12, fontWeight: '600' },
  identificador: { color: '#806B4E', fontSize: 11, marginTop: 4 },
  fecha: { color: '#888', fontSize: 11, marginTop: 4, marginBottom: 10 },
  detallePedido: { color: '#806B4E', fontSize: 11, lineHeight: 16, marginTop: 3 },
  item: { color: '#55432B', fontSize: 13, marginBottom: 5 },
  totalFila: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1E7D8', marginTop: 10, paddingTop: 10 },
  totalEtiqueta: { fontWeight: '600', color: '#55432B' },
  total: { fontWeight: 'bold', color: '#A45F00', fontSize: 16 },
  aclaracion: { color: '#999', fontSize: 10, marginTop: 10, textAlign: 'right' },
});
