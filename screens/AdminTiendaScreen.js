import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text, ThemedTextInput as TextInput } from '../context/ThemeContext';
import { createThemedStyles } from '../context/ThemeContext';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Switch, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const MEDIOS = [
  { id: 'credito', nombre: 'Tarjeta de crédito' },
  { id: 'debito', nombre: 'Tarjeta de débito' },
  { id: 'mercado_pago', nombre: 'Mercado Pago' },
  { id: 'cuenta_dni', nombre: 'Cuenta DNI' },
  { id: 'modo', nombre: 'MODO' },
  { id: 'naranja_x', nombre: 'Naranja X' },
  { id: 'uala', nombre: 'Ualá' },
  { id: 'transferencia', nombre: 'Transferencia bancaria' },
  { id: 'rapipago', nombre: 'Rapipago (efectivo)' },
];

const VACIO = {
  nombre: 'Dulces Lucho', telefono: '', email: '', direccion: '', localidad: '', descripcion: '', horario: '',
  condicionesVenta: '', envioHabilitado: true, costoEnvioBase: 0,
  metodosPago: Object.fromEntries(MEDIOS.map((m) => [m.id, true])),
};

export default function AdminTiendaScreen() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api('/configuracion-tienda');
      setDatos({ ...VACIO, ...r, metodosPago: { ...VACIO.metodosPago, ...(r.metodosPago || {}) } });
    } catch (e) {
      Alert.alert('No se pudo cargar', e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { cargar(); }, [cargar]));

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));
  const cambiarMetodo = (campo, valor) => setDatos((d) => ({ ...d, metodosPago: { ...d.metodosPago, [campo]: valor } }));

  const guardar = async () => {
    if (!datos.nombre.trim()) return Alert.alert('Falta el nombre', 'La tienda debe tener un nombre.');
    if (!Object.values(datos.metodosPago).some(Boolean)) return Alert.alert('Falta un medio de pago', 'Dejá habilitado al menos un método.');
    setGuardando(true);
    try {
      const r = await api('/admin/configuracion-tienda', {
        method: 'PUT',
        body: JSON.stringify({ ...datos, adminId: usuario.id, costoEnvioBase: Number(datos.costoEnvioBase || 0) }),
      });
      setDatos({ ...VACIO, ...r.configuracion, metodosPago: { ...VACIO.metodosPago, ...(r.configuracion?.metodosPago || {}) } });
      Alert.alert('Tienda actualizada', 'Los datos quedaron guardados en MySQL y se mostrarán en el inicio y en Acerca de Dulces Lucho para los clientes.');
    } catch (e) { Alert.alert('No se pudo guardar', e.message); }
    finally { setGuardando(false); }
  };

  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text>Cargando tienda...</Text></View>;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={[styles.contenido, { paddingBottom: 140 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <Text style={styles.titulo}>Configuración de la tienda</Text>
      <Text style={styles.descripcion}>Estos datos se guardan en MySQL y se comparten con todos los clientes.</Text>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Datos generales</Text>
        <Campo label="Nombre de la tienda" value={datos.nombre} onChangeText={(v) => cambiar('nombre', v)} />
        <Campo label="Teléfono de contacto" value={datos.telefono} onChangeText={(v) => cambiar('telefono', v)} keyboardType="phone-pad" />
        <Campo label="Correo de contacto" value={datos.email} onChangeText={(v) => cambiar('email', v)} keyboardType="email-address" />
        <Campo label="Dirección del local" value={datos.direccion} onChangeText={(v) => cambiar('direccion', v)} />
        <Campo label="Localidad" value={datos.localidad} onChangeText={(v) => cambiar('localidad', v)} />
        <Campo label="Descripción" value={datos.descripcion} onChangeText={(v) => cambiar('descripcion', v)} multiline />
        <Campo label="Horarios" value={datos.horario} onChangeText={(v) => cambiar('horario', v)} />
        <Campo label="Condiciones de venta" value={datos.condicionesVenta} onChangeText={(v) => cambiar('condicionesVenta', v)} multiline />
      </View>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Envíos</Text>
        <FilaSwitch titulo="Habilitar envío a domicilio" valor={datos.envioHabilitado} onChange={(v) => cambiar('envioHabilitado', v)} />
        <Campo label="Costo base de envío ($)" value={String(datos.costoEnvioBase ?? 0)} onChangeText={(v) => cambiar('costoEnvioBase', v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
        <Text style={styles.ayuda}>Este importe se suma al costo calculado según la distancia cuando el cliente prepara un envío.</Text>
      </View>
      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Medios de pago disponibles</Text>
        <Text style={styles.ayuda}>Los clientes solamente verán los medios que actives acá.</Text>
        {MEDIOS.map((medio) => <FilaSwitch key={medio.id} titulo={medio.nombre} valor={datos.metodosPago[medio.id]} onChange={(v) => cambiarMetodo(medio.id, v)} />)}
        <Text style={styles.ayuda}>Importante: esta versión guarda la elección del medio de pago y simula el registro del pedido. Para cobrar tarjetas o billeteras realmente hay que integrar una pasarela de pago; nunca guardamos CVV ni números completos de tarjeta.</Text>
      </View>
      <TouchableOpacity style={[styles.boton, guardando && { opacity: 0.6 }]} onPress={guardar} disabled={guardando}><Text style={styles.botonTexto}>{guardando ? 'Guardando...' : 'Guardar configuración de la tienda'}</Text></TouchableOpacity>
    </ScrollView>
  );
}

function Campo({ label, multiline, ...props }) { return <View style={styles.campo}><Text style={styles.etiqueta}>{label}</Text><TextInput style={[styles.input, multiline && styles.multiline]} multiline={multiline} {...props} /></View>; }
function FilaSwitch({ titulo, valor, onChange }) { return <View style={styles.filaSwitch}><Text style={styles.textoSwitch}>{titulo}</Text><Switch value={Boolean(valor)} onValueChange={onChange} trackColor={{ true: '#E5A33A' }} /></View>; }

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 32 }, centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1' },
  titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' }, descripcion: { color: '#765F43', marginTop: 5, marginBottom: 12, lineHeight: 18 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12 }, subtitulo: { fontSize: 16, fontWeight: 'bold', color: '#493116', marginBottom: 6 },
  campo: { marginTop: 9 }, etiqueta: { color: '#80500F', fontSize: 12, fontWeight: '600', marginBottom: 4 }, input: { borderWidth: 1, borderColor: '#E8D8C2', backgroundColor: '#FFFCF5', borderRadius: 8, padding: 10, color: '#35230E' }, multiline: { minHeight: 72, textAlignVertical: 'top' },
  filaSwitch: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3EBDD' }, textoSwitch: { color: '#35230E', fontSize: 13, flex: 1 }, ayuda: { color: '#8A785D', fontSize: 11, lineHeight: 16, marginTop: 8 },
  boton: { backgroundColor: '#E8A23A', padding: 14, borderRadius: 9, alignItems: 'center', marginBottom: 15 }, botonTexto: { color: '#38240D', fontWeight: 'bold' },
});
