import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text, ThemedTextInput as TextInput } from '../context/ThemeContext';
// Perfil del cliente o administrador: datos personales, foto subida a ImgBB y cierre de sesión.
import { createThemedStyles } from '../context/ThemeContext';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { cancelarAvisos } from '../services/notificaciones';
import { subirImagenPerfil } from '../services/api';

function obtenerIniciales(nombre = '') {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte.charAt(0).toUpperCase()).join('') || 'U';
}

export default function PerfilScreen({ navigation }) {
  const { usuario, esAdmin, actualizarPerfil, actualizarFotoPerfil, cerrarSesion } = useAuth();
  const [nombreEditado, setNombreEditado] = useState(usuario?.nombre || '');
  const [telefonoEditado, setTelefonoEditado] = useState(usuario?.telefono || '');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState(false);

  useEffect(() => {
    setNombreEditado(usuario?.nombre || '');
    setTelefonoEditado(usuario?.telefono || '');
    setErrorFoto(false);
  }, [usuario?.id, usuario?.nombre, usuario?.telefono, usuario?.fotoPerfilUrl]);

  const guardarDatosPerfil = async () => {
    setGuardandoPerfil(true);
    const resultado = await actualizarPerfil({ nombre: nombreEditado, telefono: telefonoEditado });
    setGuardandoPerfil(false);
    if (!resultado.ok) {
      Alert.alert('No se pudo guardar el perfil', resultado.error);
      return;
    }
    Alert.alert('Perfil actualizado', 'Tus datos quedaron guardados en MySQL.');
  };

  // La foto se sube a ImgBB y su URL queda asociada al ID de usuario en MySQL.
  const cambiarFoto = async () => {
    if (subiendoFoto) return;
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso necesario', 'Permití el acceso a tus fotos para elegir una imagen de perfil.');
        return;
      }
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true,
        exif: false,
      });
      if (resultado.canceled || !resultado.assets?.[0]) return;

      const foto = resultado.assets[0];
      setSubiendoFoto(true);
      const subida = await subirImagenPerfil(foto, usuario.id);
      const guardado = await actualizarFotoPerfil(subida);
      if (!guardado.ok) throw new Error(guardado.error);
      setErrorFoto(false);
      Alert.alert('Foto actualizada', 'La imagen quedó guardada en tu cuenta y se verá al iniciar sesión desde otro dispositivo.');
    } catch (error) {
      Alert.alert('No se pudo cambiar la foto', error.message || 'Revisá tu conexión e intentá nuevamente.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const salir = () => {
    Alert.alert('Cerrar sesión', '¿Querés salir de tu cuenta? Tu carrito quedará guardado para cuando vuelvas a iniciar sesión.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          cancelarAvisos();
          cerrarSesion();
        },
      },
    ]);
  };

  if (!usuario) {
    return <View style={styles.contenedorVacio}><Text>No hay una cuenta iniciada.</Text></View>;
  }

  const fotoPerfil = !errorFoto ? usuario.fotoPerfilUrl : '';

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={styles.tarjetaPerfil}>
        <TouchableOpacity style={[styles.avatar, esAdmin && styles.avatarAdmin]} onPress={cambiarFoto} activeOpacity={0.8} disabled={subiendoFoto}>
          {fotoPerfil ? (
            <Image key={fotoPerfil} source={{ uri: fotoPerfil }} style={styles.fotoPerfil} resizeMode="cover" onError={() => setErrorFoto(true)} />
          ) : (
            <Text style={styles.iniciales}>{obtenerIniciales(usuario.nombre)}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={cambiarFoto} disabled={subiendoFoto}>
          <Text style={styles.cambiarFoto}>{subiendoFoto ? 'Subiendo foto a ImgBB…' : 'Cambiar foto de perfil'}</Text>
        </TouchableOpacity>
        {esAdmin && <Text style={styles.etiquetaAdmin}>♛ ADMINISTRADOR</Text>}
        <Text style={styles.nombre}>{usuario.nombre}</Text>
        <Text style={styles.correo}>{usuario.email}</Text>
        <Text style={styles.rol}>{esAdmin ? 'Cuenta administradora' : 'Cuenta de cliente'}</Text>
      </View>

      <View style={styles.tarjetaDatos}>
        <Text style={styles.tituloSeccion}>Información de la cuenta</Text>
        <View style={styles.filaDato}>
          <Text style={styles.etiqueta}>nombre</Text>
          <TextInput style={styles.inputPerfil} value={nombreEditado} onChangeText={setNombreEditado} placeholder="Tu nombre" maxLength={100} />
        </View>
        <View style={styles.filaDato}>
          <Text style={styles.etiqueta}>correo electrónico</Text>
          <Text style={styles.valor}>{usuario.email || 'Sin correo'}</Text>
          <TouchableOpacity style={styles.botonAcceso} onPress={() => navigation.navigate('ProteccionCuenta', { tipoCambio: 'email' })}>
            <Text style={styles.botonAccesoTexto}>Cambiar Gmail</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filaDato}>
          <Text style={styles.etiqueta}>número de teléfono</Text>
          <TextInput style={styles.inputPerfil} value={telefonoEditado} onChangeText={setTelefonoEditado} placeholder="Ej.: 11 1234-5678" keyboardType="phone-pad" maxLength={30} />
        </View>
        <View style={styles.filaDato}>
          <Text style={styles.etiqueta}>tipo de cuenta</Text>
          <Text style={styles.valor}>{esAdmin ? 'Administrador' : 'Cliente'}</Text>
        </View>
        <View style={[styles.filaDato, styles.ultimaFila]}>
          <Text style={styles.etiqueta}>número de usuario</Text>
          <Text style={styles.valor}>#{usuario.id}</Text>
        </View>
      </View>

      <Text style={styles.aviso}>Podés modificar tu nombre, teléfono y foto. Para cambiar el Gmail o la contraseña, primero tenés que verificar tu identidad.</Text>
      <TouchableOpacity style={styles.botonSecundario} onPress={() => navigation.navigate('ProteccionCuenta', { tipoCambio: 'password' })}>
        <Text style={styles.botonTextoSecundario}>Cambiar contraseña</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.boton, guardandoPerfil && styles.botonDeshabilitado]} onPress={guardarDatosPerfil} disabled={guardandoPerfil}>
        <Text style={styles.botonTexto}>{guardandoPerfil ? 'Guardando…' : 'Guardar datos del perfil'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.botonSecundario} onPress={() => navigation.navigate('Configuracion')}>
        <Text style={styles.botonTextoSecundario}>Ir a configuración</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.botonSalir} onPress={salir}>
        <Text style={styles.botonSalirTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 18, paddingBottom: 30 },
  contenedorVacio: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E1' },
  tarjetaPerfil: { backgroundColor: '#fff', borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#FFE0B2', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFCC80', overflow: 'hidden' },
  avatarAdmin: { backgroundColor: '#FFE7A8', borderColor: '#D69A24' },
  iniciales: { fontSize: 34, fontWeight: 'bold', color: '#8D4B00' },
  fotoPerfil: { width: '100%', height: '100%', borderRadius: 52 },
  cambiarFoto: { color: '#A66A12', fontSize: 12, fontWeight: '600', marginTop: 8 },
  etiquetaAdmin: { marginTop: 12, backgroundColor: '#FFF0C2', color: '#875400', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: 'bold' },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#35230E', marginTop: 12, textAlign: 'center' },
  correo: { color: '#777', marginTop: 4 },
  rol: { color: '#A66A12', marginTop: 8, fontWeight: '600' },
  tarjetaDatos: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  tituloSeccion: { fontSize: 17, fontWeight: 'bold', color: '#35230E', marginBottom: 8 },
  filaDato: { borderBottomWidth: 1, borderBottomColor: '#F1E7D8', paddingVertical: 12 },
  ultimaFila: { borderBottomWidth: 0 },
  etiqueta: { color: '#888', fontSize: 12, textTransform: 'uppercase', marginBottom: 3 },
  valor: { color: '#35230E', fontSize: 15, fontWeight: '500' },
  botonAcceso: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FFF0D8' },
  botonAccesoTexto: { color: '#89530D', fontSize: 12, fontWeight: '700' },
  inputPerfil: { backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#EEDCC2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, color: '#35230E', fontSize: 15 },
  aviso: { color: '#806B4E', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  boton: { backgroundColor: '#E69A26', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  botonSecundario: { backgroundColor: '#FFF0D8', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  botonSalir: { backgroundColor: '#FDE8E7', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 18, borderWidth: 1, borderColor: '#F2C7C4' },
  botonSalirTexto: { color: '#B42318', fontWeight: 'bold' },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
  botonTextoSecundario: { color: '#89530D', fontWeight: 'bold' },
});
