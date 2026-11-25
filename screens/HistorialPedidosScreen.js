import { ThemedText as Text } from '../context/ThemeContext';
// Historial de pedidos sincronizado con MySQL y filtrado por la cuenta activa.
import { createThemedStyles } from '../context/ThemeContext';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, RefreshControl, TouchableOpacity, View } from 'react-native';
import ScrollView from '../components/GlobalRefreshScrollView';
import { usePedido } from '../context/PedidoContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const ETIQUETAS = {
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  en_camino: 'En camino',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const NOMBRES_PAGO = {
  credito: 'Tarjeta de crédito',
  debito: 'Tarjeta de débito',
  mercado_pago: 'Mercado Pago',
  cuenta_dni: 'Cuenta DNI',
  modo: 'MODO',
  naranja_x: 'Naranja X',
  uala: 'Ualá',
  transferencia: 'Transferencia bancaria',
  rapipago: 'Rapipago',
};

const ESTADOS_ANTICIPADOS = {
  pendiente_reposicion: {
    titulo: 'Solicitud registrada · esperando reposición',
    detalle: 'La tienda está esperando que llegue el producto. Todavía no se reservó stock ni se realizó un cobro.',
    paso: 0,
  },
  producto_disponible: {
    titulo: 'Producto repuesto · pendiente de confirmación',
    detalle: 'El producto volvió a tener unidades. La tienda debe confirmar tu pedido y reservarlas.',
    paso: 1,
  },
  confirmado: {
    titulo: 'Pedido confirmado · pendiente de entrega',
    detalle: 'La tienda confirmó tu pedido y reservó las unidades. Ahora falta prepararlo y entregarlo.',
    paso: 2,
  },
  preparando: {
    titulo: 'Preparando tu pedido',
    detalle: 'La tienda está preparando los productos para el envío o el retiro.',
    paso: 3,
  },
  en_camino: {
    titulo: 'Tu pedido está en camino',
    detalle: 'El pedido salió del local y está en camino a la dirección indicada.',
    paso: 4,
  },
  listo_para_retirar: {
    titulo: 'Tu pedido está listo para retirar',
    detalle: 'Ya podés acercarte al local para retirar el pedido.',
    paso: 4,
  },
  entregado: {
    titulo: 'Pedido entregado',
    detalle: 'La tienda registró que recibiste el pedido.',
    paso: 5,
  },
  cancelado: {
    titulo: 'Pedido cancelado',
    detalle: 'La solicitud fue cancelada por la tienda.',
    paso: -1,
  },
};

export default function HistorialPedidosScreen({ navigation }) {
  const { pedidos, sincronizarPedidos } = usePedido();
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [pedidosAnticipados, setPedidosAnticipados] = useState([]);

  const cargar = useCallback(async () => {
    if (!usuario?.id) {
      setCargando(false);
      return;
    }

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

  // Actualiza los pedidos mientras la pantalla está abierta y permite refrescarlos manualmente.
  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);

    const actualizar = async () => {
      if (!vigente) return;
      await cargar();
    };

    actualizar();
    const intervalo = setInterval(actualizar, 5000);
    return () => {
      vigente = false;
      clearInterval(intervalo);
    };
  }, [cargar]));

  const pedidosUsuario = pedidos.filter((pedido) =>
    String(pedido.usuarioId ?? pedido.usuario_id ?? '') === String(usuario?.id ?? '')
  );
  const activos = pedidosUsuario.filter((pedido) =>
    !['entregado', 'cancelado'].includes(pedido.estadoPedido || pedido.estado)
  );
  const historial = pedidosUsuario.filter((pedido) =>
    ['entregado', 'cancelado'].includes(pedido.estadoPedido || pedido.estado)
  );

  const lista = (titulo, elementos) => (
    <>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {elementos.length ? elementos.map((pedido) => (
        <View key={`${usuario?.id}-${pedido.id}`} style={styles.tarjeta}>
          <Text style={styles.numero}>Pedido #{pedido.numero || pedido.id}</Text>
          <Text style={styles.identificador}>ID de pedido: #{pedido.pedidoId || pedido.id}</Text>
          <Text style={styles.estadoVenta}>
            {ETIQUETAS[pedido.estadoPedido || pedido.estado] || pedido.estadoPedido || pedido.estado}
            {' · '}${Number(pedido.total || 0).toFixed(2)}
          </Text>
          <Text style={styles.detalle}>Medio de pago: {NOMBRES_PAGO[pedido.metodoPago] || pedido.metodoPago || 'No indicado'}</Text>
          {pedido.conEnvio && <>
            <Text style={styles.detalle}>Entrega: {pedido.direccionAlias || 'Dirección'} · {pedido.direccion || ''}, {pedido.localidad || ''}</Text>
            {!!pedido.direccionDestinatario && <Text style={styles.detalle}>Recibe: {pedido.direccionDestinatario}</Text>}
            {!!pedido.instruccionesEntrega && <Text style={styles.detalle}>Notas: {pedido.instruccionesEntrega}</Text>}
          </>}
          <Text style={styles.detalle}>
            {(pedido.items || []).map((item) => `${item.cantidad} x ${item.nombre}`).join(', ')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Seguimiento', { pedidoId: pedido.id })}>
            <Text style={styles.abrirSeguimiento}>Ver seguimiento del pedido</Text>
          </TouchableOpacity>
        </View>
      )) : <Text style={styles.vacio}>Todavía no hay pedidos en esta sección.</Text>}
    </>
  );

  const renderPedidoAnticipado = (pedido) => {
    const estado = pedido.estado || 'pendiente_reposicion';
    const infoEstado = ESTADOS_ANTICIPADOS[estado] || {
      titulo: estado,
      detalle: 'La tienda actualizará el estado de este pedido.',
      paso: 0,
    };
    const etapas = [
      'Solicitud registrada',
      'Producto repuesto',
      'Pedido confirmado',
      'Preparación',
      pedido.modalidadEntrega === 'envio' ? 'En camino' : 'Listo para retirar',
      'Entregado',
    ];

    return (
      <View key={`reposicion-${usuario?.id}-${pedido.id}`} style={styles.tarjetaAnticipado}>
        <Text style={styles.tipoPedido}>PEDIDO POR FALTA DE STOCK</Text>
        <Text style={styles.numero}>Pedido {pedido.numero}</Text>
        <Text style={styles.productoPedido}>{pedido.producto}</Text>
        <Text style={styles.detallePedido}>{pedido.cantidad} unidad(es) solicitada(s)</Text>

        <View style={[
          styles.estadoAnticipado,
          estado === 'cancelado' ? styles.estadoCancelado :
            estado === 'entregado' ? styles.estadoEntregado : styles.estadoEnCurso,
        ]}>
          <Text style={styles.estadoAnticipadoTitulo}>{infoEstado.titulo}</Text>
          <Text style={styles.estadoAnticipadoDetalle}>{infoEstado.detalle}</Text>
        </View>

        {estado !== 'cancelado' && (
          <View style={styles.progresoPedido}>
            <Text style={styles.subtituloProgreso}>Avance del pedido</Text>
            {etapas.map((etapa, indice) => {
              const completada = indice <= infoEstado.paso;
              const actual = indice === infoEstado.paso;
              return (
                <View key={etapa} style={styles.filaEtapa}>
                  <Text style={[styles.iconoEtapa, completada && styles.iconoEtapaActivo]}>
                    {completada ? '✓' : '○'}
                  </Text>
                  <Text style={[
                    styles.textoEtapa,
                    completada && styles.textoEtapaActivo,
                    actual && styles.textoEtapaActual,
                  ]}>
                    {etapa}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.detalle}>Fecha que lo necesitás: {pedido.fechaDeseada ? String(pedido.fechaDeseada).slice(0, 10) : 'A confirmar'}</Text>
        <Text style={styles.detalle}>Llegada estimada: {pedido.fechaEstimada ? String(pedido.fechaEstimada).slice(0, 10) : 'A confirmar'}</Text>
        <Text style={styles.detalle}>
          {pedido.modalidadEntrega === 'envio'
            ? `Envío a ${pedido.direccion || ''}, ${pedido.localidad || ''}`
            : 'Retiro en el local'}
        </Text>
        <Text style={styles.detalle}>Medio de pago elegido: {NOMBRES_PAGO[pedido.metodoPago] || pedido.metodoPago || 'A confirmar'}</Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]}
      refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { setActualizando(true); cargar(); }} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.titulo}>Mis pedidos</Text>
      <Text style={styles.identificacion}>Pedidos pertenecientes a tu cuenta</Text>

      {cargando && (
        <View style={styles.cargando}>
          <ActivityIndicator color="#A86616" />
          <Text style={styles.vacio}>Actualizando tus pedidos...</Text>
        </View>
      )}

      {lista('Pedidos en curso', activos)}

      <Text style={styles.tituloSeccion}>Pedidos por falta de stock</Text>
      <Text style={styles.introduccionAnticipados}>
        Acá podés seguir las solicitudes que hiciste cuando un producto estaba agotado. Cuando la tienda lo confirme, vas a ver el avance hasta la entrega.
      </Text>
      {pedidosAnticipados.length
        ? pedidosAnticipados.map(renderPedidoAnticipado)
        : <Text style={styles.vacio}>Todavía no hiciste pedidos por falta de stock.</Text>}

      {lista('Historial de pedidos', historial)}
    </ScrollView>
  );
}

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 14, paddingBottom: 34 },
  titulo: { fontSize: 24, color: '#35230E', fontWeight: 'bold' },
  identificacion: { color: '#89530D', backgroundColor: '#FFF0D8', padding: 10, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8, fontSize: 14 },
  tituloSeccion: { fontSize: 19, fontWeight: 'bold', marginTop: 18, marginBottom: 9, color: '#80500F' },
  tarjeta: { backgroundColor: '#fff', borderRadius: 11, padding: 14, marginBottom: 10 },
  tarjetaAnticipado: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E9D7B7' },
  tipoPedido: { color: '#98600F', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 5 },
  numero: { fontWeight: 'bold', color: '#35230E', fontSize: 17 },
  productoPedido: { color: '#493116', fontSize: 17, fontWeight: 'bold', marginTop: 5 },
  detallePedido: { color: '#493116', fontSize: 15, marginTop: 3 },
  estadoAnticipado: { borderRadius: 9, padding: 12, marginTop: 12, marginBottom: 8 },
  estadoEnCurso: { backgroundColor: '#FFF1D7', borderColor: '#E6C17F', borderWidth: 1 },
  estadoEntregado: { backgroundColor: '#E8F5E9', borderColor: '#B7D8BC', borderWidth: 1 },
  estadoCancelado: { backgroundColor: '#FCE8E6', borderColor: '#E8B6B2', borderWidth: 1 },
  estadoAnticipadoTitulo: { color: '#493116', fontSize: 16, fontWeight: 'bold' },
  estadoAnticipadoDetalle: { color: '#66533D', fontSize: 14, lineHeight: 20, marginTop: 4 },
  progresoPedido: { backgroundColor: '#FFFCF7', borderRadius: 9, padding: 11, marginVertical: 6 },
  subtituloProgreso: { color: '#80500F', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  filaEtapa: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  iconoEtapa: { width: 25, color: '#A99B87', fontSize: 16, fontWeight: 'bold' },
  iconoEtapaActivo: { color: '#287345' },
  textoEtapa: { color: '#9B9285', fontSize: 14 },
  textoEtapaActivo: { color: '#42634A' },
  textoEtapaActual: { color: '#80500F', fontWeight: 'bold' },
  introduccionAnticipados: { color: '#6F5B43', fontSize: 14, lineHeight: 21, marginBottom: 9 },
  identificador: { color: '#806B4E', marginTop: 4, marginBottom: 5, fontSize: 13 },
  estadoVenta: { color: '#493116', fontWeight: '600', fontSize: 15, marginTop: 2 },
  detalle: { color: '#665F55', marginTop: 5, fontSize: 14, lineHeight: 20 },
  abrirSeguimiento: { color: '#A86616', fontSize: 14, fontWeight: 'bold', marginTop: 9 },
  vacio: { color: '#777', marginBottom: 12, marginTop: 5, fontSize: 14 },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 },
});
