import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const ingresar = () => {
    if (!email.trim() || !password) {
      setError('Completá el correo y la contraseña.');
      return;
    }

    const resultado = iniciarSesion(email, password);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setError('');
    setPassword('');

    // Administrador: falta la clave única. Cliente: App.js cambia de pantalla solo.
    if (resultado.requiereClave) {
      navigation.navigate('ClaveAdmin');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>🍬</Text>
      <Text style={styles.marca}>Dulces Lucho</Text>
      <Text style={styles.titulo}>Iniciar sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(texto) => {
          setEmail(texto);
          setError('');
        }}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={(texto) => {
          setPassword(texto);
          setError('');
        }}
      />

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.botonPrincipal} onPress={ingresar}>
        <Text style={styles.botonPrincipalTexto}>Ingresar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonLink} onPress={() => navigation.navigate('Registro')}>
        <Text style={styles.linkTexto}>¿No tenés cuenta? Crear cuenta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, textAlign: 'center' },
  marca: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#c77b00', marginBottom: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10 },
  error: { color: '#e57373', fontWeight: 'bold', marginBottom: 8 },
  botonPrincipal: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  botonPrincipalTexto: { color: '#fff', fontWeight: 'bold' },
  botonLink: { alignItems: 'center', marginTop: 18 },
  linkTexto: { color: '#c77b00', fontWeight: 'bold' },
});
