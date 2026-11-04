import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegistroScreen({ navigation }) {
  const { registrar } = useAuth();

  const [rol, setRol] = useState('cliente');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repetirPassword, setRepetirPassword] = useState('');
  const [codigoAutorizacion, setCodigoAutorizacion] = useState('');
  const [claveUnica, setClaveUnica] = useState('');
  const [error, setError] = useState('');

  const crearCuenta = () => {
    const resultado = registrar({
      nombre,
      email,
      password,
      repetirPassword,
      rol,
      codigoAutorizacion,
      claveUnica,
    });

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setError('');
    Alert.alert('Cuenta creada', 'Ya podés iniciar sesión con tu correo y contraseña.', [
      { text: 'Aceptar', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Tipo de cuenta</Text>
      <View style={styles.filaTipos}>
        <TouchableOpacity
          style={[styles.tipo, rol === 'cliente' && styles.tipoActivo]}
          onPress={() => setRol('cliente')}
        >
          <Text style={[styles.tipoTexto, rol === 'cliente' && styles.tipoTextoActivo]}>Cliente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tipo, rol === 'admin' && styles.tipoActivo]}
          onPress={() => setRol('admin')}
        >
          <Text style={[styles.tipoTexto, rol === 'admin' && styles.tipoTextoActivo]}>Administrador</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña (mínimo 6 caracteres)"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Repetir contraseña"
        secureTextEntry
        autoCapitalize="none"
        value={repetirPassword}
        onChangeText={setRepetirPassword}
      />

      {rol === 'admin' && (
        <View style={styles.cajaAdmin}>
          <Text style={styles.tituloAdmin}>Datos de administrador</Text>
          <Text style={styles.ayuda}>
            El código de autorización te lo da el dueño de la tienda. La clave única es personal: son 6 números que
            vas a tener que ingresar cada vez que entres como administrador.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Código de autorización de la tienda"
            autoCapitalize="characters"
            autoCorrect={false}
            value={codigoAutorizacion}
            onChangeText={setCodigoAutorizacion}
          />
          <TextInput
            style={styles.input}
            placeholder="Clave única (6 números)"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            value={claveUnica}
            onChangeText={(texto) => setClaveUnica(texto.replace(/\D/g, ''))}
          />
        </View>
      )}

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.botonPrincipal} onPress={crearCuenta}>
        <Text style={styles.botonPrincipalTexto}>Crear cuenta</Text>
      </TouchableOpacity>

      <Text style={styles.aviso}>
        Prototipo: las cuentas se guardan solo mientras la app está abierta.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 24 },
  titulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  filaTipos: { flexDirection: 'row', marginBottom: 16 },
  tipo: { flex: 1, borderWidth: 1, borderColor: '#ffcc80', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginRight: 8 },
  tipoActivo: { backgroundColor: '#ffcc80' },
  tipoTexto: { color: '#c77b00' },
  tipoTextoActivo: { color: '#000', fontWeight: 'bold' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10 },
  cajaAdmin: { backgroundColor: '#fff3e0', borderRadius: 10, padding: 12, marginBottom: 6 },
  tituloAdmin: { fontWeight: 'bold', marginBottom: 4 },
  ayuda: { color: '#555', fontSize: 12, marginBottom: 10 },
  error: { color: '#e57373', fontWeight: 'bold', marginBottom: 8 },
  botonPrincipal: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  botonPrincipalTexto: { color: '#fff', fontWeight: 'bold' },
  aviso: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
