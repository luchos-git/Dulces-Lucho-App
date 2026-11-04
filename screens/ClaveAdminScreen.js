import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const MAX_INTENTOS = 3;

export default function ClaveAdminScreen({ navigation }) {
  const { adminPendiente, verificarClaveAdmin, cancelarClaveAdmin } = useAuth();
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [intentos, setIntentos] = useState(0);

  const volver = () => {
    cancelarClaveAdmin();
    navigation.goBack();
  };

  const verificar = () => {
    if (clave.length !== 6) {
      setError('La clave única tiene 6 números.');
      return;
    }

    const resultado = verificarClaveAdmin(clave);
    if (resultado.ok) {
      // App.js cambia de pantalla solo cuando la sesión queda iniciada
      return;
    }

    const nuevosIntentos = intentos + 1;
    setIntentos(nuevosIntentos);
    setClave('');

    if (nuevosIntentos >= MAX_INTENTOS) {
      Alert.alert('Demasiados intentos', 'Por seguridad, volvé a iniciar sesión.', [
        { text: 'Aceptar', onPress: volver },
      ]);
      return;
    }

    setError(`${resultado.error} Te quedan ${MAX_INTENTOS - nuevosIntentos} intentos.`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icono}>🔐</Text>
      <Text style={styles.titulo}>Verificación de administrador</Text>
      <Text style={styles.texto}>
        Hola{adminPendiente ? `, ${adminPendiente.nombre}` : ''}. Ingresá tu clave única de 6 números para continuar.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Clave única"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        value={clave}
        onChangeText={(texto) => {
          setClave(texto.replace(/\D/g, ''));
          setError('');
        }}
      />

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.botonPrincipal} onPress={verificar}>
        <Text style={styles.botonPrincipalTexto}>Verificar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonLink} onPress={volver}>
        <Text style={styles.linkTexto}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', justifyContent: 'center', padding: 24 },
  icono: { fontSize: 48, textAlign: 'center' },
  titulo: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 8 },
  texto: { textAlign: 'center', color: '#555', marginBottom: 18 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, textAlign: 'center', fontSize: 20, letterSpacing: 6 },
  error: { color: '#e57373', fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  botonPrincipal: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  botonPrincipalTexto: { color: '#fff', fontWeight: 'bold' },
  botonLink: { alignItems: 'center', marginTop: 18 },
  linkTexto: { color: '#c77b00', fontWeight: 'bold' },
});
