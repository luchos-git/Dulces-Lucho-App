// Configuración de la cuenta: métodos de pago, dirección, notificaciones y contraseña.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { cancelarAvisos, pedirPermisoNotificaciones } from '../services/notificaciones';

const METODOS = [
  { id: 'credito', nombre: 'Tarjeta de crédito' },
  { id: 'debito', nombre: 'Tarjeta de débito' },
  { id: 'rapipago', nombre: 'Rapipago (efectivo)' },
];

export default function ConfiguracionCuentaScreen({ route, navigation }) {
  const { usuario } = useAuth();
  const seccion = route.params?.seccion || 'pago';
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [preferencias, setPreferencias] = useState({ direccion: '', localidad: '', metodoPagoPreferido: '', notificacionesActivas: true });
  const [configTienda, setConfigTienda] = useState({ metodosPago: { credito: true, debito: true, rapipago: true } });

  useEffect(() => {
    let activo = true;
    Promise.all([
      api(`/usuarios/${usuario.id}/preferencias`),
      api('/configuracion-tienda'),
    ]).then(([prefs, tienda]) => {
      if (!activo) return;
      setPreferencias({
        direccion: prefs.direccion || '',
        localidad: prefs.localidad || '',
        metodoPagoPreferido: prefs.metodoPagoPreferido || '',
        notificacionesActivas: Boolean(prefs.notificacionesActivas),
      });
      setConfigTienda(tienda);
    }).catch((error) => {
      if (activo) Alert.alert('No se pudo cargar la configuración', error.message);
    }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [usuario?.id]);

  const actualizar = (campo, valor) => setPreferencias((actual) => ({ ...actual, [campo]: valor }));

  const guardarPreferencias = async (datos = preferencias) => {
    setGuardando(true);
    try {
      await api(`/usuarios/${usuario.id}/preferencias`, {
        method: 'PUT',
        body: JSON.stringify(datos),
      });
      Alert.alert('Configuración guardada', 'Los cambios quedaron registrados en tu cuenta.');
    } catch (error) {
      Alert.alert('No se pudo guardar', error.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarNotificaciones = async (valor) => {
    if (valor) {
      const permiso = await pedirPermisoNotificaciones();
      if (!permiso) {
        Alert.alert('Permiso no concedido', 'Activá las notificaciones para este dispositivo desde los ajustes del teléfono.');
        return;
      }
    } else {
      await cancelarAvisos();
    }
    const nuevas = { ...preferencias, notificacionesActivas: valor };
    actualizar('notificacionesActivas', valor);
    await guardarPreferencias(nuevas);
  };


  const titulo = {
    pago: 'Métodos de pago', direccion: 'Dirección de entrega',
    notificaciones: 'Notificaciones', seguridad: 'Privacidad y seguridad',
  }[seccion] || 'Configuración de cuenta';

  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text style={styles.ayuda}>Cargando preferencias...</Text></View>;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.descripcion}>Estos cambios se guardan en tu cuenta de Dulces Lucho.</Text>

      {seccion === 'pago' && (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Medio de pago preferido</Text>
          <Text style={styles.ayuda}>Se seleccionará automáticamente al preparar una compra. No guardamos números de tarjeta ni códigos de seguridad.</Text>
          {METODOS.filter((m) => configTienda.metodosPago?.[m.id]).map((m) => (
            <TouchableOpacity key={m.id} style={styles.opcion} onPress={() => actualizar('metodoPagoPreferido', m.id)}>
              <View style={[styles.radio, preferencias.metodoPagoPreferido === m.id && styles.radioActivo]} />
              <Text style={styles.textoOpcion}>{m.nombre}</Text>
            </TouchableOpacity>
          ))}
          {!METODOS.some((m) => configTienda.metodosPago?.[m.id]) && <Text style={styles.ayuda}>La tienda todavía no habilitó medios de pago.</Text>}
          <Boton texto="Guardar método preferido" onPress={() => guardarPreferencias()} cargando={guardando} />
        </View>
      )}

      {seccion === 'direccion' && (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Dirección habitual</Text>
          <Text style={styles.etiqueta}>Calle y número</Text>
          <TextInput style={styles.input} placeholder="Ej.: Av. Mitre 200" value={preferencias.direccion} onChangeText={(v) => actualizar('direccion', v)} maxLength={200} />
          <Text style={styles.etiqueta}>Localidad</Text>
          <TextInput style={styles.input} placeholder="Ej.: Lanús" value={preferencias.localidad} onChangeText={(v) => actualizar('localidad', v)} maxLength={100} />
          <Text style={styles.ayuda}>La dirección se podrá usar como punto de partida al preparar un envío. Podés modificarla antes de confirmar cada compra.</Text>
          <Boton texto="Guardar dirección" onPress={() => guardarPreferencias()} cargando={guardando} />
        </View>
      )}

      {seccion === 'notificaciones' && (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Avisos de pedidos</Text>
          <View style={styles.filaSwitch}>
            <View style={styles.switchTexto}><Text style={styles.textoOpcion}>Notificaciones en este dispositivo</Text><Text style={styles.ayuda}>Avisos locales sobre las etapas del pedido.</Text></View>
            <Switch value={preferencias.notificacionesActivas} onValueChange={cambiarNotificaciones} trackColor={{ true: '#E5A33A' }} />
          </View>
          <Text style={styles.ayuda}>La opción se guarda en tu cuenta. El permiso también debe estar habilitado en los ajustes del teléfono.</Text>
        </View>
      )}

      {seccion === 'seguridad' && (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Protección de la cuenta</Text>
          <Text style={styles.ayuda}>Para cambiar el Gmail o la contraseña primero vas a verificar tu identidad. Las cuentas de administrador necesitan además el código general y su clave personal de seis números.</Text>
          <Boton texto="Continuar con la verificación" onPress={() => navigation.navigate('ProteccionCuenta')} cargando={false} />
        </View>
      )}
    </ScrollView>
  );
}

function Boton({ texto, onPress, cargando }) {
  return <TouchableOpacity style={[styles.boton, cargando && { opacity: 0.6 }]} onPress={onPress} disabled={cargando}><Text style={styles.botonTexto}>{cargando ? 'Guardando...' : texto}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 32 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1' },
  titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' },
  descripcion: { color: '#765F43', marginTop: 5, marginBottom: 15, lineHeight: 19 },
  tarjeta: { backgroundColor: '#fff', padding: 16, borderRadius: 12 }, subtitulo: { fontSize: 17, fontWeight: 'bold', color: '#493116', marginBottom: 8 },
  ayuda: { color: '#8A785D', fontSize: 12, lineHeight: 18, marginBottom: 10 }, etiqueta: { color: '#80500F', fontWeight: '600', fontSize: 13, marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#FFFCF5', borderWidth: 1, borderColor: '#E8D8C2', borderRadius: 8, padding: 11, color: '#35230E' },
  opcion: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1E7D8' },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#C48B39', marginRight: 12 }, radioActivo: { backgroundColor: '#C48B39' }, textoOpcion: { color: '#35230E', fontSize: 14, flex: 1 },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }, switchTexto: { flex: 1, paddingRight: 10 },
  boton: { backgroundColor: '#E8A23A', padding: 13, borderRadius: 9, alignItems: 'center', marginTop: 18 }, botonTexto: { color: '#38240D', fontWeight: 'bold' },
});
