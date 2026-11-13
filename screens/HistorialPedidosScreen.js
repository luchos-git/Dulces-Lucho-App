// explicación del archivo: separa los pedidos que todavía están en camino de los pedidos que ya fueron entregados
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { usePedido } from '../context/PedidoContext';

export default function HistorialPedidosScreen({ navigation }) {
  const { pedidos } = usePedido();

  // separa el historial en pedidos activos y pedidos que ya finalizaron
  const activos = pedidos.filter((pedido) => pedido.estado !== 'entregado');
  const historial = pedidos.filter((pedido) => pedido.estado === 'entregado');

  // arma una sección reutilizable para no repetir el diseño de cada lista
  const lista = (titulo, elementos) => (
    <>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {elementos.length ? elementos.map((pedido) => (
        <TouchableOpacity
          key={pedido.id}
          style={styles.tarjeta}
          onPress={() => navigation.navigate('Seguimiento', { pedidoId: pedido.id })}
        >
          <Text style={styles.numero}>Pedido #{pedido.numero}</Text>
          <Text>{pedido.estado === 'entregado' ? 'Entregado' : 'En camino'} · ${pedido.total}</Text>
          <Text style={styles.detalle}>
            {pedido.items.map((item) => `${item.cantidad} x ${item.nombre}`).join(', ')}
          </Text>
        </TouchableOpacity>
      )) : <Text style={styles.vacio}>Todavía no hay pedidos.</Text>}
    </>
  );

  // muestra primero los pedidos activos y después los que ya se entregaron
  return (
    <ScrollView style={styles.contenedor}>
      {lista('Pedidos en camino', activos)}
      {lista('Historial de pedidos', historial)}
    </ScrollView>
  );
}

// estilos de las secciones y de cada tarjeta del historial
const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1', padding: 10 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', marginTop: 8, marginBottom: 6 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  numero: { fontWeight: 'bold' },
  detalle: { color: '#777', marginTop: 4 },
  vacio: { color: '#777', marginBottom: 12 },
});
