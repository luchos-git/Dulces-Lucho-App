// explicación del archivo: permite al administrador cargar fotos, crear, editar y ocultar productos del catálogo
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useProductos } from '../context/ProductosContext';
import { subirImagenProducto } from '../services/api';

// valores vacíos que se usan al empezar o al limpiar el formulario
const formularioVacio = {
  nombre: '',
  categoria: '',
  descripcion: '',
  precio: '',
  imagenUrl: '',
  asset: null,
};

export default function PanelAdminScreen({ route, navigation }) {
  const { usuario, esAdmin } = useAuth();
  const { productos, agregarProducto, editarProducto, eliminarProducto } = useProductos();
  const [formulario, setFormulario] = useState(formularioVacio);
  const [idEditando, setIdEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // actualiza un solo campo del formulario sin borrar los demás valores
  const cambiarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  };

  // solicita permiso para acceder a la galería y guarda la foto seleccionada
  const elegirFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      return Alert.alert('Permiso necesario', 'Permití fotos para cargar la imagen.');
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled) cambiarCampo('asset', resultado.assets[0]);
  };

  // valida los datos, sube la foto si existe y llama al alta o a la edición del producto
  const guardarProducto = async () => {
    if (!formulario.nombre.trim() || !formulario.categoria.trim() || !formulario.precio.trim()) {
      return Alert.alert('Faltan datos', 'Completá nombre, categoría y precio.');
    }

    setGuardando(true);
    try {
      let imagenUrl = formulario.imagenUrl;
      if (formulario.asset) {
        ({ imagenUrl } = await subirImagenProducto(formulario.asset));
      }

      const datos = { ...formulario, imagenUrl, precio: Number(formulario.precio) };
      const producto = idEditando
        ? await editarProducto(idEditando, datos)
        : await agregarProducto(datos);

      Alert.alert(
        idEditando ? 'Producto actualizado' : 'Producto agregado',
        `“${producto.nombre}” ya está en el catálogo.`
      );
      setFormulario({ ...formularioVacio });
      setIdEditando(null);
      if (route?.params?.productoEditar) navigation?.setParams({ productoEditar: null });
    } catch (error) {
      Alert.alert('No se pudo guardar', error.message);
    } finally {
      setGuardando(false);
    }
  };

  // coloca los datos del producto elegido dentro del formulario para poder modificarlos
  const cargarEdicion = (producto) => {
    setIdEditando(producto.id);
    setFormulario({
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.descripcion || '',
      precio: String(producto.precio),
      imagenUrl: producto.imagenUrl || '',
      asset: null,
    });
  };

  // permite abrir este panel desde la ficha de un producto con sus datos ya cargados
  useEffect(() => {
    if (route?.params?.productoEditar) {
      cargarEdicion(route.params.productoEditar);
    }
  }, [route?.params?.productoEditar]);

  // aunque el menú ya oculta este acceso, se comprueba el rol antes de mostrar el panel
  if (!esAdmin) {
    return <View style={styles.contenedor}><Text>Esta sección es solo para administradores.</Text></View>;
  }

  // dibuja el formulario y después muestra todos los productos publicados
  return (
    <ScrollView style={styles.contenedor}>
      <Text style={styles.titulo}>Panel de administración</Text>
      <Text style={styles.texto}>Sesión iniciada como {usuario.nombre}.</Text>

      <View style={styles.caja}>
        <Text style={styles.subtitulo}>{idEditando ? 'Editar producto' : 'Nuevo producto'}</Text>
        {[
          ['nombre', 'Nombre'],
          ['categoria', 'Categoría'],
          ['descripcion', 'Descripción'],
          ['precio', 'Precio'],
        ].map(([campo, etiqueta]) => (
          <TextInput
            key={campo}
            style={styles.input}
            placeholder={etiqueta}
            value={formulario[campo]}
            multiline={campo === 'descripcion'}
            keyboardType={campo === 'precio' ? 'numeric' : 'default'}
            onChangeText={(valor) => cambiarCampo(campo, valor)}
          />
        ))}

        <TouchableOpacity style={styles.botonFoto} onPress={elegirFoto}>
          <Text>{formulario.asset || formulario.imagenUrl ? 'Cambiar foto' : 'Elegir foto'}</Text>
        </TouchableOpacity>

        {(formulario.asset || formulario.imagenUrl) && (
          <Image
            style={styles.previsualizacion}
            source={{ uri: formulario.asset?.uri || formulario.imagenUrl }}
          />
        )}

        <TouchableOpacity style={styles.boton} disabled={guardando} onPress={guardarProducto}>
          <Text style={styles.textoBlanco}>
            {guardando ? 'Guardando…' : idEditando ? 'Guardar cambios' : 'Agregar producto'}
          </Text>
        </TouchableOpacity>

        {idEditando && (
          <TouchableOpacity onPress={() => { setFormulario({ ...formularioVacio }); setIdEditando(null); if (route?.params?.productoEditar) navigation?.setParams({ productoEditar: null }); }}>
            <Text style={styles.centrado}>Cancelar edición</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitulo}>Productos publicados</Text>
      {productos.map((producto) => (
        <View key={producto.id} style={styles.item}>
          {producto.imagenUrl
            ? <Image style={styles.miniatura} source={{ uri: producto.imagenUrl }} />
            : <View style={styles.miniatura}><Text>Foto</Text></View>}
          <View style={styles.datosProducto}>
            <Text style={styles.nombreProducto}>{producto.nombre}</Text>
            <Text>{producto.categoria} · ${producto.precio}</Text>
          </View>
          <TouchableOpacity onPress={() => cargarEdicion(producto)}>
            <Text style={styles.editar}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Ocultar producto', `¿Ocultar “${producto.nombre}”?`, [
              { text: 'Cancelar' },
              {
                text: 'Ocultar',
                style: 'destructive',
                onPress: () => eliminarProducto(producto.id).catch((error) => Alert.alert('Error', error.message)),
              },
            ])}
          >
            <Text style={styles.eliminar}>Ocultar</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// estilos del formulario y de la lista de productos administrables
const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1', padding: 20 },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  texto: { color: '#555' },
  caja: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginVertical: 16 },
  subtitulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  botonFoto: { backgroundColor: '#ffcc80', borderRadius: 8, padding: 11, alignItems: 'center' },
  previsualizacion: { height: 160, borderRadius: 8, marginTop: 10 },
  boton: { backgroundColor: '#007bff', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 10 },
  textoBlanco: { color: '#fff', fontWeight: 'bold' },
  centrado: { textAlign: 'center', marginTop: 12 },
  item: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  miniatura: { width: 52, height: 52, borderRadius: 6, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  datosProducto: { flex: 1, marginLeft: 10 },
  nombreProducto: { fontWeight: 'bold' },
  editar: { color: '#007bff', marginLeft: 8 },
  eliminar: { color: '#e57373', marginLeft: 8 },
});
