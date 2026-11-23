// explicación del archivo: presenta el formulario para crear una cuenta de cliente o solicitar el alta de administrador con autorización
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegistroScreen({ navigation }) {
  // usa la función que valida y envía los datos de registro al backend
  const { registrar } = useAuth();

  const [rol, setRol] = useState('cliente');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repetirPassword, setRepetirPassword] = useState('');
  const [codigoAutorizacion, setCodigoAutorizacion] = useState('');
  const [claveUnica, setClaveUnica] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // reúne los datos ingresados y muestra el resultado que devuelve la api
  const crearCuenta = async () => {
    if (cargando) return;
    setError('');
    setCargando(true);
    try {
      const resultado = await registrar({
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

      Alert.alert('Cuenta creada', 'La cuenta se guardó en la base de datos. Ya podés iniciar sesión.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setCargando(false);
    }
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

      {/* estos campos aparecen solamente cuando se elige crear una cuenta administradora */}
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

      <TouchableOpacity style={[styles.botonPrincipal, cargando && styles.botonDeshabilitado]} onPress={crearCuenta} disabled={cargando}>
        <Text style={styles.botonPrincipalTexto}>{cargando ? 'Creando cuenta...' : 'Crear cuenta'}</Text>
      </TouchableOpacity>

      <Text style={styles.aviso}>
        Tu cuenta se guarda en la base de datos de la tienda.
      </Text>
    </ScrollView>
  );
}

// estilos del formulario y de los campos de autorización del administrador
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
  botonDeshabilitado: { opacity: 0.6 },
  aviso: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
