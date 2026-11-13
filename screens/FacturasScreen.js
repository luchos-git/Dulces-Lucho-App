// explicación del archivo: muestra los resúmenes de los pedidos guardados en el celular y aclara que todavía no son facturas fiscales
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePedido } from '../context/PedidoContext';

export default function FacturasScreen() {
  const { pedidos } = usePedido();

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Facturas y comprobantes</Text>
      <Text style={styles.descripcion}>
        Acá se muestran resúmenes de las compras realizadas desde este dispositivo. No son facturas fiscales ni comprobantes emitidos por un servicio externo.
      </Text>

      {pedidos.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.icono}>🧾</Text>
          <Text style={styles.tituloVacio}>Todavía no hay compras</Text>
          <Text style={styles.textoVacio}>Cuando realices un pedido, su resumen aparecerá en esta sección.</Text>
        </View>
      ) : (
        pedidos.map((pedido) => (
          <View key={pedido.id} style={styles.tarjeta}>
            <View style={styles.encabezadoTarjeta}>
              <Text style={styles.numero}>Pedido #{pedido.numero}</Text>
              <Text style={styles.estado}>{pedido.estado === 'entregado' ? 'Entregado' : 'En curso'}</Text>
            </View>
            <Text style={styles.fecha}>
              {pedido.inicio ? new Date(pedido.inicio).toLocaleDateString() : 'Fecha no disponible'}
            </Text>
            {(pedido.items || []).map((item, indice) => (
              <Text key={`${pedido.id}-${indice}`} style={styles.item}>
                {item.cantidad} x {item.nombre} — ${Number(item.precio || 0) * Number(item.cantidad || 0)}
              </Text>
            ))}
            <View style={styles.totalFila}>
              <Text style={styles.totalEtiqueta}>Total del pedido</Text>
              <Text style={styles.total}>${pedido.total || 0}</Text>
            </View>
            <Text style={styles.aclaracion}>resumen interno · no válido como factura fiscal</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 16, paddingBottom: 30 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#35230E' },
  descripcion: { color: '#806B4E', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 16 },
  vacio: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 12 },
  icono: { fontSize: 38, marginBottom: 10 },
  tituloVacio: { fontSize: 16, fontWeight: 'bold', color: '#35230E' },
  textoVacio: { color: '#888', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  encabezadoTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numero: { fontWeight: 'bold', color: '#35230E', fontSize: 15 },
  estado: { color: '#A66A12', fontSize: 12, fontWeight: '600' },
  fecha: { color: '#888', fontSize: 11, marginTop: 4, marginBottom: 10 },
  item: { color: '#55432B', fontSize: 13, marginBottom: 5 },
  totalFila: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1E7D8', marginTop: 10, paddingTop: 10 },
  totalEtiqueta: { fontWeight: '600', color: '#55432B' },
  total: { fontWeight: 'bold', color: '#A45F00', fontSize: 16 },
  aclaracion: { color: '#999', fontSize: 10, marginTop: 10, textAlign: 'right' },
});
