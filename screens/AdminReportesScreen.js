import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text } from '../context/ThemeContext';
// Reportes generales calculados desde las ventas y productos guardados en MySQL.
import { createThemedStyles } from '../context/ThemeContext';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const ETIQUETAS = { confirmado: 'Confirmados', preparando: 'Preparando', en_camino: 'En camino', listo_para_retirar: 'Listos para retirar', entregado: 'Entregados', cancelado: 'Cancelados' };
export default function AdminReportesScreen() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const cargar = useCallback(async () => {
    try { setDatos(await api(`/admin/reportes?adminId=${usuario.id}`)); }
    catch (e) { Alert.alert('No se pudieron cargar los reportes', e.message); }
    finally { setCargando(false); setActualizando(false); }
  }, [usuario?.id]);
  useEffect(() => { cargar(); }, [cargar]);
  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text>Calculando reportes...</Text></View>;
  if (!datos) return <View style={styles.centrado}><Text>No se pudieron cargar los indicadores.</Text></View>;
  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]} refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { setActualizando(true); cargar(); }} />} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <Text style={styles.titulo}>Reportes y estadísticas</Text>
      <Text style={styles.descripcion}>Indicadores calculados con las compras guardadas en MySQL.</Text>
      <View style={styles.grilla}>
        <Indicador titulo="Ventas registradas" valor={datos.cantidadPedidos} />
        <Indicador titulo="Total vendido" valor={`$${Number(datos.totalVendido).toFixed(2)}`} />
        <Indicador titulo="Pedidos abiertos" valor={datos.pedidosAbiertos} />
        <Indicador titulo="Clientes compradores" valor={datos.clientes} />
        <Indicador titulo="Productos activos" valor={datos.productosActivos} />
      </View>
      <View style={styles.tarjeta}><Text style={styles.subtitulo}>Pedidos por estado</Text>{(datos.estados || []).map((e) => <View key={e.estado} style={styles.fila}><Text style={styles.texto}>{ETIQUETAS[e.estado] || e.estado}</Text><Text style={styles.valor}>{e.cantidad}</Text></View>)}</View>
      <View style={styles.tarjeta}><Text style={styles.subtitulo}>Productos más vendidos</Text>{(datos.masVendidos || []).length ? datos.masVendidos.map((p, i) => <View key={`${p.nombre}-${i}`} style={styles.filaProducto}><View style={{ flex: 1 }}><Text style={styles.texto}>{i + 1}. {p.nombre}</Text><Text style={styles.ayuda}>{p.unidades} unidades</Text></View><Text style={styles.valor}>${Number(p.importe).toFixed(2)}</Text></View>) : <Text style={styles.ayuda}>Todavía no hay ventas.</Text>}</View>
    </ScrollView>
  );
}
function Indicador({ titulo, valor }) { return <View style={styles.indicador}><Text style={styles.indicadorValor}>{valor}</Text><Text style={styles.indicadorTitulo}>{titulo}</Text></View>; }
const styles = createThemedStyles({ contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 30 }, centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1' }, titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' }, descripcion: { color: '#765F43', marginTop: 5, marginBottom: 12 }, grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, indicador: { width: '48%', backgroundColor: '#FFE0B2', padding: 14, borderRadius: 10, marginBottom: 10 }, indicadorValor: { fontSize: 21, color: '#6B3F0E', fontWeight: 'bold' }, indicadorTitulo: { color: '#805F35', fontSize: 11, marginTop: 4 }, tarjeta: { backgroundColor: '#fff', borderRadius: 11, padding: 14, marginTop: 6, marginBottom: 8 }, subtitulo: { color: '#493116', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }, fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F3EBDD' }, filaProducto: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F3EBDD' }, texto: { color: '#51402C', fontSize: 13, flex: 1 }, valor: { color: '#A45F00', fontWeight: 'bold' }, ayuda: { color: '#8A785D', fontSize: 11, marginTop: 3 } });
