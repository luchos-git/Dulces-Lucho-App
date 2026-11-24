// Pantalla obligatoria de verificación antes de modificar el correo o la contraseña.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import CampoPassword from '../components/CampoPassword';

export default function ProteccionCuentaScreen({ navigation, route }) {
  const { usuario, esAdmin, verificarProteccionCuenta } = useAuth();
  const [passwordActual, setPasswordActual] = useState('');
  const [codigoAdmin, setCodigoAdmin] = useState('');
  const [claveUnica, setClaveUnica] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [error, setError] = useState('');

  const verificar = async () => {
    if (verificando) return;
    if (!passwordActual) {
      setError('Ingresá tu contraseña actual.');
      return;
    }
    if (esAdmin && (!codigoAdmin.trim() || !/^\d{6}$/.test(claveUnica))) {
      setError('La cuenta administradora necesita el código general y su clave personal de 6 números.');
      return;
    }

    setVerificando(true);
    setError('');
    const resultado = await verificarProteccionCuenta({
      passwordActual,
      ...(esAdmin ? { codigoAdmin: codigoAdmin.trim(), claveUnica } : {}),
    });
    setVerificando(false);

    if (!resultado.ok) {
      const nuevosIntentos = intentos + 1;
      setIntentos(nuevosIntentos);
      setPasswordActual('');
      setClaveUnica('');
      setError(resultado.error || 'No se pudo verificar la cuenta.');
      if (nuevosIntentos >= 5) {
        Alert.alert('Verificación bloqueada', 'Se alcanzó el máximo de intentos. Por seguridad, cerrá esta pantalla y esperá antes de volver a intentarlo.');
      }
      return;
    }

    navigation.replace('CambiarCredenciales', { token: resultado.token, tipoCambio: route.params?.tipoCambio || 'ambos' });
  };

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.tarjeta}>
        <Text style={styles.icono}>🔐</Text>
        <Text style={styles.titulo}>Protección de cuenta</Text>
        <Text style={styles.descripcion}>
          Antes de modificar tu Gmail o contraseña necesitamos confirmar que sos titular de esta cuenta.
        </Text>
        <View style={styles.datoCuenta}>
          <Text style={styles.etiqueta}>Cuenta</Text>
          <Text style={styles.valor}>{usuario?.email || 'Sin correo'}</Text>
          <Text style={styles.rol}>{esAdmin ? 'Administrador' : 'Cliente'} · ID #{usuario?.id}</Text>
        </View>

        <Text style={styles.etiqueta}>Contraseña actual</Text>
        <CampoPassword
          style={styles.input}
          value={passwordActual}
          onChangeText={(v) => { setPasswordActual(v); setError(''); }}
          placeholder="Escribí tu contraseña actual"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
        />

        {esAdmin && (
          <>
            <View style={styles.separador} />
            <Text style={styles.subtitulo}>Verificación adicional de administrador</Text>
            <Text style={styles.descripcionAdmin}>Además de tu contraseña, necesitás el código de autorización general y tu clave personal de seis números.</Text>
            <Text style={styles.etiqueta}>Código de administrador</Text>
            <CampoPassword
              style={styles.input}
              value={codigoAdmin}
              onChangeText={(v) => { setCodigoAdmin(v); setError(''); }}
              placeholder="Código general de administración"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
            <Text style={styles.etiqueta}>Tu clave personal de 6 números</Text>
            <CampoPassword
              style={styles.input}
              value={claveUnica}
              onChangeText={(v) => { setClaveUnica(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
            />
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={[styles.boton, verificando && styles.botonDeshabilitado]} onPress={verificar} disabled={verificando || intentos >= 5}>
          <Text style={styles.textoBoton}>{verificando ? 'Verificando…' : 'Verificar identidad'}</Text>
        </TouchableOpacity>
        <Text style={styles.pie}>La autorización dura 5 minutos y se utiliza una sola vez. No compartas estos códigos.</Text>
        <TouchableOpacity style={styles.cancelar} onPress={() => navigation.goBack()}>
          <Text style={styles.textoCancelar}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  tarjeta: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  icono: { fontSize: 42, textAlign: 'center', marginBottom: 8 },
  titulo: { color: '#38240D', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  descripcion: { color: '#765F43', lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  datoCuenta: { backgroundColor: '#FFF4DF', borderRadius: 10, padding: 12, marginBottom: 14 },
  etiqueta: { color: '#80500F', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  valor: { color: '#35230E', fontSize: 15, fontWeight: '600' },
  rol: { color: '#98764D', fontSize: 12, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#E8D8C2', borderRadius: 8, padding: 12, color: '#35230E', backgroundColor: '#FFFCF5' },
  separador: { height: 1, backgroundColor: '#F1E7D8', marginVertical: 16 },
  subtitulo: { color: '#493116', fontSize: 16, fontWeight: 'bold' },
  descripcionAdmin: { color: '#806B4E', fontSize: 12, lineHeight: 18, marginTop: 5 },
  error: { color: '#B42318', fontSize: 13, marginTop: 12, lineHeight: 18 },
  boton: { backgroundColor: '#E8A23A', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 18 },
  botonDeshabilitado: { opacity: 0.55 },
  textoBoton: { color: '#38240D', fontWeight: 'bold' },
  pie: { color: '#8A785D', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12 },
  cancelar: { alignItems: 'center', padding: 12, marginTop: 4 },
  textoCancelar: { color: '#A66A12', fontWeight: '600' },
});
