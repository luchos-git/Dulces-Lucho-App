import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text } from '../context/ThemeContext';
// Ayuda y soporte: guía de compra y contacto de la tienda configurado por administración.
import { createThemedStyles } from '../context/ThemeContext';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { api } from '../services/api';

export default function AyudaScreen() {
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    api('/configuracion-tienda')
      .then((datos) => { if (vigente) setTienda(datos); })
      .catch((error) => { if (vigente) Alert.alert('No se pudo cargar el contacto', error.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const abrir = async (url) => {
    try {
      const disponible = await Linking.canOpenURL(url);
      if (!disponible) throw new Error('No hay una aplicación disponible para abrir este contacto.');
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('No se pudo abrir el contacto', error.message);
    }
  };

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Ayuda y soporte</Text>
        <Text style={styles.descripcion}>Información para realizar y consultar tus compras.</Text>
      </View>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>¿Cómo comprar?</Text>
        <Paso numero="1" texto="Elegí un producto del catálogo y agregalo al carrito." />
        <Paso numero="2" texto="Revisá las cantidades y continuá con Preparar compra." />
        <Paso numero="3" texto="Elegí retiro o envío, completá los datos y seleccioná un medio de pago habilitado." />
        <Paso numero="4" texto="Confirmá el pedido. Lo vas a encontrar en Configuración > Mis pedidos." />
      </View>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>¿Cómo consultar un pedido?</Text>
        <Text style={styles.texto}>Entrá en Mis pedidos para ver los pedidos en curso y el historial. El estado se actualiza con los cambios que realiza la administración.</Text>
      </View>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Contacto de la tienda</Text>
        {cargando ? <ActivityIndicator color="#A86616" /> : (
          <>
            {!!tienda?.telefono && <TouchableOpacity style={styles.contacto} onPress={() => abrir(`tel:${String(tienda.telefono).replace(/[^+\d]/g, '')}`)}><Text style={styles.contactoTexto}>☎  Llamar al {tienda.telefono}</Text></TouchableOpacity>}
            {!!tienda?.email && <TouchableOpacity style={styles.contacto} onPress={() => abrir(`mailto:${tienda.email}?subject=Consulta%20sobre%20mi%20pedido`)}><Text style={styles.contactoTexto}>✉  Escribir a {tienda.email}</Text></TouchableOpacity>}
            {!tienda?.telefono && !tienda?.email && <Text style={styles.texto}>La tienda todavía no configuró un teléfono o correo de contacto.</Text>}
            {!!tienda?.horario && <Text style={styles.texto}>Horario de atención: {tienda.horario}</Text>}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Paso({ numero, texto }) {
  return <View style={styles.paso}><View style={styles.numero}><Text style={styles.numeroTexto}>{numero}</Text></View><Text style={styles.texto}>{texto}</Text></View>;
}

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 30 },
  encabezado: { backgroundColor: '#FFE0B2', borderRadius: 12, padding: 17, marginBottom: 12 },
  titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' }, descripcion: { color: '#765F43', marginTop: 5, lineHeight: 18 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12 }, subtitulo: { fontSize: 16, fontWeight: 'bold', color: '#493116', marginBottom: 9 },
  paso: { flexDirection: 'row', alignItems: 'center', marginTop: 8 }, numero: { height: 25, width: 25, borderRadius: 13, backgroundColor: '#FFE0B2', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, numeroTexto: { fontWeight: 'bold', color: '#80500F' },
  texto: { color: '#65533B', lineHeight: 19, flex: 1, fontSize: 13 }, contacto: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F3EBDD' }, contactoTexto: { color: '#A45F00', fontWeight: '600' },
});
