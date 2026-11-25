import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text, ThemedTextInput as TextInput } from '../context/ThemeContext';
import { createThemedStyles } from '../context/ThemeContext';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api, subirImagenProducto } from '../services/api';

export default function BannersAdminScreen() {
  const { esAdmin } = useAuth();
  const [banners, setBanners] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [orden, setOrden] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [imagenElegida, setImagenElegida] = useState(null);
  const [idEditando, setIdEditando] = useState(null);
  const [activo, setActivo] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarBanners = async () => {
    setCargando(true);
    try {
      const lista = await api('/banners/admin');
      setBanners(Array.isArray(lista) ? lista : []);
    } catch (error) {
      Alert.alert('No se pudieron cargar los banners', error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBanners();
  }, []);

  const limpiarFormulario = () => {
    setTitulo('');
    setOrden('');
    setImagenUrl('');
    setImagenElegida(null);
    setIdEditando(null);
    setActivo(true);
  };

  const elegirImagen = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso necesario', 'Permití el acceso a tus fotos para elegir un banner.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 6],
        quality: 0.8,
        base64: true,
      });

      if (!resultado.canceled && resultado.assets?.[0]) {
        const foto = resultado.assets[0];
        if (foto.fileSize && foto.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Imagen demasiado grande', 'El banner debe pesar hasta 5 MB.');
          return;
        }
        setImagenElegida(foto);
      }
    } catch (error) {
      Alert.alert('No se pudo abrir la galería', error.message);
    }
  };

  const editarBanner = (banner) => {
    setIdEditando(banner.id);
    setTitulo(banner.titulo || '');
    setOrden(String(banner.orden ?? 0));
    setImagenUrl(banner.imagenUrl || '');
    setImagenElegida(null);
    setActivo(Number(banner.activo) === 1);
  };

  const guardarBanner = async () => {
    const estabaEditando = idEditando !== null;
    if (!imagenElegida && !imagenUrl) {
      Alert.alert('Falta la imagen', 'Elegí una imagen para el banner.');
      return;
    }
    if (titulo.trim().length > 120) {
      Alert.alert('Título demasiado largo', 'El título puede tener hasta 120 caracteres.');
      return;
    }
    if (orden.trim() !== '' && !Number.isInteger(Number(orden))) {
      Alert.alert('Orden inválido', 'Ingresá un número entero o dejá el campo vacío.');
      return;
    }

    setGuardando(true);
    try {
      let urlFinal = imagenUrl;
      if (imagenElegida) {
        const subida = await subirImagenProducto(imagenElegida);
        urlFinal = subida.imagenUrl;
      }

      const datos = {
        titulo: titulo.trim(),
        imagenUrl: urlFinal,
        ...(orden.trim() !== '' ? { orden: Number(orden) } : {}),
        activo,
      };

      if (idEditando !== null) {
        // El backend espera el orden en las modificaciones; conserva el valor actual si queda vacío.
        datos.orden = orden.trim() === '' ? 0 : Number(orden);
        await api(`/banners/${idEditando}`, { method: 'PUT', body: JSON.stringify(datos) });
      } else {
        await api('/banners', { method: 'POST', body: JSON.stringify(datos) });
      }

      limpiarFormulario();
      await cargarBanners();
      Alert.alert(estabaEditando ? 'Banner actualizado' : 'Banner agregado', 'La imagen quedó guardada en el carrusel.');
    } catch (error) {
      Alert.alert('No se pudo guardar el banner', error.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (banner) => {
    try {
      await api(`/banners/${banner.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: banner.titulo || '',
          imagenUrl: banner.imagenUrl,
          orden: Number(banner.orden || 0),
          activo: Number(banner.activo) !== 1,
        }),
      });
      await cargarBanners();
    } catch (error) {
      Alert.alert('No se pudo cambiar el estado', error.message);
    }
  };

  const eliminarBanner = (banner) => {
    Alert.alert('Quitar banner', `¿Querés quitar ${banner.titulo ? `“${banner.titulo}”` : 'esta imagen'} del carrusel?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/banners/${banner.id}`, { method: 'DELETE' });
            if (String(idEditando) === String(banner.id)) limpiarFormulario();
            await cargarBanners();
          } catch (error) {
            Alert.alert('No se pudo quitar el banner', error.message);
          }
        },
      },
    ]);
  };

  if (!esAdmin) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Banners del inicio</Text>
        <Text style={styles.ayuda}>Esta sección está disponible únicamente para administradores.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <Text style={styles.titulo}>Banners del inicio</Text>
      <Text style={styles.ayuda}>Cada banner es una imagen distinta. El inicio las muestra automáticamente como una calesita.</Text>

      <View style={styles.formulario}>
        <Text style={styles.seccion}>{idEditando !== null ? 'Modificar banner' : 'Agregar banner'}</Text>

        <Text style={styles.etiqueta}>Título (opcional)</Text>
        <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej.: Promoción de la semana" maxLength={120} />

        <Text style={styles.etiqueta}>Orden de aparición</Text>
        <TextInput style={styles.input} value={orden} onChangeText={setOrden} placeholder="Automático si queda vacío" keyboardType="number-pad" />
        <Text style={styles.ayudaChica}>Los números menores aparecen primero. Podés usar 1, 2, 3…</Text>

        <TouchableOpacity style={styles.botonImagen} onPress={elegirImagen}>
          <Text style={styles.botonImagenTexto}>{imagenElegida || imagenUrl ? 'Cambiar imagen del banner' : 'Elegir imagen del banner'}</Text>
        </TouchableOpacity>

        {(imagenElegida?.uri || imagenUrl) ? (
          <Image source={{ uri: imagenElegida?.uri || imagenUrl }} style={styles.preview} resizeMode="cover" />
        ) : null}

        {idEditando !== null ? (
          <TouchableOpacity style={styles.botonEstado} onPress={() => setActivo((valor) => !valor)}>
            <Text style={styles.botonEstadoTexto}>{activo ? '✓ Se mostrará en el inicio' : '○ Oculto del inicio'}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={[styles.botonGuardar, guardando && styles.deshabilitado]} onPress={guardarBanner} disabled={guardando}>
          <Text style={styles.botonGuardarTexto}>{guardando ? 'Subiendo y guardando…' : idEditando !== null ? 'Guardar cambios' : 'Publicar banner'}</Text>
        </TouchableOpacity>
        {idEditando !== null ? (
          <TouchableOpacity style={styles.botonCancelar} onPress={limpiarFormulario}>
            <Text style={styles.botonCancelarTexto}>Cancelar modificación</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.encabezadoLista}>
        <Text style={styles.seccion}>Banners cargados</Text>
        <TouchableOpacity onPress={cargarBanners}><Text style={styles.actualizar}>Actualizar</Text></TouchableOpacity>
      </View>
      {cargando ? <Text style={styles.ayuda}>Cargando banners…</Text> : null}
      {!cargando && banners.length === 0 ? <Text style={styles.ayuda}>Todavía no hay banners. Agregá el primero desde el formulario.</Text> : null}

      {banners.map((banner) => (
        <View key={banner.id} style={styles.tarjetaBanner}>
          <Image source={{ uri: banner.imagenUrl }} style={styles.miniatura} resizeMode="cover" />
          <View style={styles.infoBanner}>
            <Text style={styles.nombreBanner}>{banner.titulo || `Banner #${banner.id}`}</Text>
            <Text style={styles.metaBanner}>Orden: {banner.orden} · {Number(banner.activo) === 1 ? 'Visible' : 'Oculto'}</Text>
            <View style={styles.acciones}>
              <TouchableOpacity onPress={() => editarBanner(banner)} style={styles.botonAccion}><Text style={styles.textoAccion}>Editar</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => cambiarEstado(banner)} style={styles.botonAccion}><Text style={styles.textoAccion}>{Number(banner.activo) === 1 ? 'Ocultar' : 'Mostrar'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => eliminarBanner(banner)} style={styles.botonQuitar}><Text style={styles.textoQuitar}>Quitar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 18, paddingBottom: 32 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#38240D', marginBottom: 6 },
  ayuda: { color: '#765F43', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  ayudaChica: { color: '#888', fontSize: 11, marginTop: -5, marginBottom: 10 },
  formulario: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginVertical: 12 },
  seccion: { fontSize: 17, fontWeight: 'bold', color: '#80500F' },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 5 },
  input: { backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#EEDCC2', borderRadius: 8, padding: 11, color: '#35230E' },
  botonImagen: { backgroundColor: '#FFE0B2', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 14 },
  botonImagenTexto: { color: '#80500F', fontWeight: 'bold' },
  preview: { width: '100%', height: 130, borderRadius: 8, marginTop: 10, backgroundColor: '#FFE8C5' },
  botonEstado: { backgroundColor: '#FFF3DF', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  botonEstadoTexto: { color: '#80500F', fontWeight: '600' },
  botonGuardar: { backgroundColor: '#E69A26', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 14 },
  botonGuardarTexto: { color: '#fff', fontWeight: 'bold' },
  botonCancelar: { padding: 12, alignItems: 'center' },
  botonCancelarTexto: { color: '#8B4E00', fontWeight: '600' },
  deshabilitado: { opacity: 0.6 },
  encabezadoLista: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  actualizar: { color: '#A66A12', fontWeight: 'bold' },
  tarjetaBanner: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  miniatura: { width: 100, height: 70, borderRadius: 7, backgroundColor: '#FFE8C5' },
  infoBanner: { flex: 1, marginLeft: 10 },
  nombreBanner: { color: '#35230E', fontWeight: 'bold' },
  metaBanner: { color: '#888', fontSize: 11, marginTop: 3 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 5 },
  botonAccion: { backgroundColor: '#FFF0D8', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 6 },
  textoAccion: { color: '#89530D', fontWeight: '600', fontSize: 11 },
  botonQuitar: { backgroundColor: '#FDE8E7', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 6 },
  textoQuitar: { color: '#B42318', fontWeight: '600', fontSize: 11 },
});
