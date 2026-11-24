// Permite modificar el Gmail, la contraseña o ambos después de pasar la protección de cuenta.
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import CampoPassword from '../components/CampoPassword';

export default function CambiarCredencialesScreen({ navigation, route }) {
  const { usuario, actualizarCredenciales } = useAuth();
  const token = route.params?.token;
  const tipoCambio = route.params?.tipoCambio || 'ambos';
  const cambiarEmail = tipoCambio !== 'password';
  const cambiarPassword = tipoCambio !== 'email';

  // Esta pantalla no se puede usar directamente: necesita el permiso emitido por la protección.
  useEffect(() => {
    if (!token) navigation.replace('ProteccionCuenta');
  }, [token, navigation]);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [repetirPassword, setRepetirPassword] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    if (guardando) return;
    const email = nuevoEmail.trim().toLowerCase();
    if ((cambiarEmail && !email) || (cambiarPassword && !nuevaPassword)) {
      setError(cambiarEmail && cambiarPassword ? 'Ingresá un Gmail o una contraseña nueva.' : cambiarEmail ? 'Ingresá el nuevo Gmail.' : 'Ingresá la nueva contraseña.');
      return;
    }
    if (cambiarEmail && email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Ingresá una dirección de correo válida.');
      return;
    }
    if (cambiarPassword && nuevaPassword && nuevaPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (cambiarPassword && nuevaPassword !== repetirPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (!token) {
      setError('No se encontró la autorización temporal. Volvé a verificar tu identidad.');
      return;
    }

    setGuardando(true);
    setError('');
    const resultado = await actualizarCredenciales({
      token,
      nuevoEmail: cambiarEmail ? email : '',
      nuevaPassword: cambiarPassword ? nuevaPassword : '',
    });
    setGuardando(false);

    if (!resultado.ok) {
      setError(resultado.error || 'No se pudieron guardar los cambios.');
      return;
    }

    setNuevoEmail('');
    setNuevaPassword('');
    setRepetirPassword('');
    Alert.alert('Datos actualizados', 'Los cambios se guardaron en tu cuenta.', [
      { text: 'Aceptar', onPress: () => navigation.navigate('Perfil') },
    ]);
  };

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>{tipoCambio === 'email' ? 'Cambiar Gmail' : tipoCambio === 'password' ? 'Cambiar contraseña' : 'Cambiar datos de acceso'}</Text>
        <Text style={styles.descripcion}>{tipoCambio === 'email' ? 'Actualizá el correo asociado a tu cuenta.' : tipoCambio === 'password' ? 'Elegí una contraseña nueva para proteger tu cuenta.' : 'Podés cambiar el Gmail, la contraseña o ambos.'}</Text>

        {cambiarEmail && <>
          <Text style={styles.etiqueta}>Gmail actual</Text>
          <View style={styles.emailActual}><Text style={styles.valor}>{usuario?.email || 'Sin correo'}</Text></View>
        </>}

        {cambiarEmail && <>
          <Text style={styles.etiqueta}>Nuevo Gmail</Text>
          <TextInput
            style={styles.input}
            value={nuevoEmail}
            onChangeText={(v) => { setNuevoEmail(v); setError(''); }}
            placeholder="nuevo.correo@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={150}
          />
        </>}

        {cambiarPassword && <>
        {cambiarEmail && <View style={styles.separador} />}
        <Text style={styles.subtitulo}>Nueva contraseña</Text>
        <Text style={styles.etiqueta}>Contraseña nueva</Text>
        <CampoPassword
          style={styles.input}
          value={nuevaPassword}
          onChangeText={(v) => { setNuevaPassword(v); setError(''); }}
          placeholder="Mínimo 6 caracteres"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
        />
        <Text style={styles.etiqueta}>Repetir contraseña nueva</Text>
        <CampoPassword
          style={styles.input}
          value={repetirPassword}
          onChangeText={(v) => { setRepetirPassword(v); setError(''); }}
          placeholder="Volvé a escribir la contraseña"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
        />
        <Text style={styles.ayuda}>La contraseña se guarda cifrada en el servidor.</Text>
        </>}

        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={[styles.boton, guardando && styles.deshabilitado]} onPress={guardar} disabled={guardando}>
          <Text style={styles.textoBoton}>{guardando ? 'Guardando…' : tipoCambio === 'email' ? 'Actualizar Gmail' : tipoCambio === 'password' ? 'Actualizar contraseña' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelar} onPress={() => navigation.goBack()}>
          <Text style={styles.textoCancelar}>Volver</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
  titulo: { fontSize: 21, fontWeight: 'bold', color: '#38240D' },
  descripcion: { color: '#765F43', lineHeight: 19, marginTop: 6, marginBottom: 12 },
  etiqueta: { color: '#80500F', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  emailActual: { backgroundColor: '#F7F0E5', borderRadius: 8, padding: 12 },
  valor: { color: '#493116', fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#E8D8C2', borderRadius: 8, padding: 12, color: '#35230E', backgroundColor: '#FFFCF5' },
  ayuda: { color: '#8A785D', fontSize: 11, lineHeight: 16, marginTop: 5 },
  separador: { height: 1, backgroundColor: '#F1E7D8', marginVertical: 17 },
  subtitulo: { color: '#493116', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#B42318', fontSize: 13, marginTop: 12 },
  boton: { backgroundColor: '#E8A23A', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 20 },
  deshabilitado: { opacity: 0.55 },
  textoBoton: { color: '#38240D', fontWeight: 'bold' },
  cancelar: { padding: 12, alignItems: 'center' },
  textoCancelar: { color: '#A66A12', fontWeight: '600' },
});
