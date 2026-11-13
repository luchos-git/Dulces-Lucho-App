// explicación del archivo: muestra el perfil de la cuenta que inició sesión, diferenciando clientes y administradores
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

// toma la primera letra de cada una de las primeras dos palabras para armar el avatar
function obtenerIniciales(nombre = '') {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('') || 'U';
}

export default function PerfilScreen({ navigation }) {
  const { usuario, esAdmin } = useAuth();
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const claveFoto = `foto_perfil_${usuario?.id || usuario?.email || 'cuenta'}`;

  useEffect(() => {
    AsyncStorage.getItem(claveFoto).then(setFotoPerfil).catch(() => setFotoPerfil(null));
  }, [claveFoto]);

  // permite elegir una foto personal y guardarla en este dispositivo
  const cambiarFoto = async () => {
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
        quality: 0.8,
      });

      if (!resultado.canceled && resultado.assets?.[0]?.uri) {
        const uri = resultado.assets[0].uri;
        await AsyncStorage.setItem(claveFoto, uri);
        setFotoPerfil(uri);
      }
    } catch {
      Alert.alert('No se pudo cambiar la foto', 'Revisá los permisos de la galería e intentá nuevamente.');
    }
  };

  if (!usuario) {
    return (
      <View style={styles.contenedorVacio}>
        <Text>No hay una cuenta iniciada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <View style={styles.tarjetaPerfil}>
        <TouchableOpacity style={[styles.avatar, esAdmin && styles.avatarAdmin]} onPress={cambiarFoto} activeOpacity={0.8}>
          {fotoPerfil ? (
            <Image source={{ uri: fotoPerfil }} style={styles.fotoPerfil} />
          ) : (
            <Text style={styles.iniciales}>{obtenerIniciales(usuario.nombre)}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={cambiarFoto}>
          <Text style={styles.cambiarFoto}>Cambiar foto de perfil</Text>
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
          <Text style={styles.valor}>{usuario.nombre || 'Sin nombre'}</Text>
        </View>
        <View style={styles.filaDato}>
          <Text style={styles.etiqueta}>correo electrónico</Text>
          <Text style={styles.valor}>{usuario.email || 'Sin correo'}</Text>
        </View>
        <View style={styles.filaDato}>
          <Text style={styles.etiqueta}>tipo de cuenta</Text>
          <Text style={styles.valor}>{esAdmin ? 'Administrador' : 'Cliente'}</Text>
        </View>
        {usuario.id != null && (
          <View style={[styles.filaDato, styles.ultimaFila]}>
            <Text style={styles.etiqueta}>número de usuario</Text>
            <Text style={styles.valor}>#{usuario.id}</Text>
          </View>
        )}
      </View>

      <Text style={styles.aviso}>
        En esta versión el perfil permite consultar los datos de la cuenta. La edición del correo y la contraseña todavía no está conectada al servidor.
      </Text>

      <TouchableOpacity style={styles.boton} onPress={() => navigation.navigate('Configuracion')}>
        <Text style={styles.botonTexto}>Ir a configuración</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 18, paddingBottom: 30 },
  contenedorVacio: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E1' },
  tarjetaPerfil: { backgroundColor: '#fff', borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#FFE0B2', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFCC80' },
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
  aviso: { color: '#806B4E', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  boton: { backgroundColor: '#E69A26', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
});
