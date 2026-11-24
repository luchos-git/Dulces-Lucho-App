// Información pública de contacto y condiciones de Dulces Lucho, administrada desde Configuración de la tienda.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../services/api';

export default function DatosTiendaScreen() {
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    api('/configuracion-tienda').then(setTienda).catch((e) => Alert.alert('No se pudo cargar la información', e.message)).finally(() => setCargando(false));
  }, []);
  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text>Cargando información...</Text></View>;
  if (!tienda) return <View style={styles.centrado}><Text>No se pudo obtener la información de la tienda.</Text></View>;
  const contactar = async (url) => { try { await Linking.openURL(url); } catch { Alert.alert('No se pudo abrir', 'Revisá los datos de contacto.'); } };
  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <View style={styles.encabezado}><Text style={styles.nombre}>{tienda.nombre}</Text><Text style={styles.descripcion}>{tienda.descripcion || 'Catálogo y pedidos de Dulces Lucho.'}</Text></View>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Contacto</Text>
        {!!tienda.telefono && <TouchableOpacity onPress={() => contactar(`tel:${tienda.telefono.replace(/[^+\d]/g, '')}`)}><Dato etiqueta="Teléfono" valor={tienda.telefono} /></TouchableOpacity>}
        {!!tienda.email && <TouchableOpacity onPress={() => contactar(`mailto:${tienda.email}`)}><Dato etiqueta="Correo" valor={tienda.email} /></TouchableOpacity>}
        {!!tienda.direccion && <Dato etiqueta="Dirección" valor={`${tienda.direccion}${tienda.localidad ? `, ${tienda.localidad}` : ''}`} />}
        {!!tienda.horario && <Dato etiqueta="Horarios" valor={tienda.horario} />}
        {!tienda.telefono && !tienda.email && !tienda.direccion && !tienda.horario && <Text style={styles.ayuda}>La tienda todavía no cargó sus datos de contacto.</Text>}
      </View>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Compras y entregas</Text>
        <Dato etiqueta="Envíos a domicilio" valor={tienda.envioHabilitado ? `Disponibles · tarifa base $${Number(tienda.costoEnvioBase || 0)}` : 'No disponibles por el momento'} />
        <Dato etiqueta="Medios de pago" valor={[
          tienda.metodosPago?.credito && 'Crédito', tienda.metodosPago?.debito && 'Débito', tienda.metodosPago?.rapipago && 'Rapipago',
        ].filter(Boolean).join(', ') || 'Consultar disponibilidad'} />
        {!!tienda.condicionesVenta && <Dato etiqueta="Condiciones de venta" valor={tienda.condicionesVenta} />}
      </View>
    </ScrollView>
  );
}
function Dato({ etiqueta, valor }) { return <View style={styles.dato}><Text style={styles.etiqueta}>{etiqueta}</Text><Text style={styles.valor}>{valor}</Text></View>; }
const styles = StyleSheet.create({ contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 30 }, centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1' }, encabezado: { backgroundColor: '#FFE0B2', padding: 18, borderRadius: 12, marginBottom: 12 }, nombre: { fontSize: 22, fontWeight: 'bold', color: '#38240D' }, descripcion: { color: '#765F43', marginTop: 5, lineHeight: 19 }, tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12 }, subtitulo: { color: '#493116', fontSize: 16, fontWeight: 'bold', marginBottom: 7 }, dato: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3EBDD' }, etiqueta: { color: '#8A785D', fontSize: 11, marginBottom: 3 }, valor: { color: '#35230E', fontSize: 14 }, ayuda: { color: '#8A785D', fontSize: 12 } });
