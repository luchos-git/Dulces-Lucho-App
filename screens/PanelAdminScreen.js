import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
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
import { api, subirImagenProducto } from '../services/api';

const FORMULARIO_VACIO = {
  nombre: '',
  categoria: '',
  descripcion: '',
  precio: '',
  imagenUrl: '',
  assets: [],
};

export default function PanelAdminScreen({ route, navigation }) {
  const { usuario, esAdmin } = useAuth();
  const { productos, agregarProducto, editarProducto, eliminarProducto, cargarProductos } = useProductos();
  const [formulario, setFormulario] = useState({ ...FORMULARIO_VACIO });
  const [idEditando, setIdEditando] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [modalCategorias, setModalCategorias] = useState(false);
  const [modalNuevaCategoria, setModalNuevaCategoria] = useState(false);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState('');
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const scrollRef = useRef(null);

  const cambiarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  };

  const limpiarFormulario = () => {
    setFormulario({ ...FORMULARIO_VACIO });
    setIdEditando(null);
    if (route?.params?.productoEditar) navigation?.setParams({ productoEditar: null });
  };

  const cargarCategorias = async () => {
    setCargandoCategorias(true);
    try {
      const lista = await api('/categorias');
      setCategorias(Array.isArray(lista) ? lista : []);
    } catch (error) {
      Alert.alert('No se pudieron cargar las categorías', error.message);
    } finally {
      setCargandoCategorias(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
    cargarProductos().catch((error) => Alert.alert('Error', error.message));
  }, []);

  const cargarEdicion = (producto) => {
    setIdEditando(producto.id);
    setFormulario({
      nombre: producto.nombre || '',
      categoria: producto.categoria || '',
      descripcion: producto.descripcion || '',
      precio: String(producto.precio ?? ''),
      imagenUrl: producto.imagenUrl || '',
      imagenes: producto.imagenes || (producto.imagenUrl ? [producto.imagenUrl] : []),
      assets: [],
    });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    if (route?.params?.productoEditar) cargarEdicion(route.params.productoEditar);
  }, [route?.params?.productoEditar]);

  const elegirFoto = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso necesario', 'Permití el acceso a las fotos para elegir una imagen del producto.');
        return;
      }
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 3,
        quality: 0.7,
        base64: true,
      });
      if (!resultado.canceled && resultado.assets?.length) {
        const fotos = resultado.assets.slice(0, 3);
        const pesada = fotos.find((foto) => foto.fileSize && foto.fileSize > 5 * 1024 * 1024);
        if (pesada) { Alert.alert('Imagen demasiado grande', 'Cada imagen debe pesar hasta 5 MB.'); return; }
        cambiarCampo('assets', fotos);
      }
    } catch (error) {
      Alert.alert('No se pudo abrir la galería', error.message);
    }
  };

  const guardarProducto = async () => {
    const nombre = formulario.nombre.trim();
    const precio = Number(String(formulario.precio).replace(',', '.'));

    if (!nombre || !formulario.categoria || !formulario.precio.trim()) {
      Alert.alert('Faltan datos', 'Completá el nombre, elegí una categoría y escribí el precio.');
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      Alert.alert('Precio inválido', 'Ingresá un precio mayor a cero.');
      return;
    }
    if (!categorias.some((categoria) => categoria.nombre === formulario.categoria)) {
      Alert.alert('Categoría inválida', 'Elegí una categoría de la lista. No escribas una nueva.');
      return;
    }

    setGuardando(true);
    try {
      let imagenes = formulario.imagenes || (formulario.imagenUrl ? [formulario.imagenUrl] : []);
      if (formulario.assets.length) {
        const subidas = await Promise.all(formulario.assets.map((foto) => subirImagenProducto(foto)));
        imagenes = subidas.map((subida) => subida.imagenUrl);
      }
      imagenes = imagenes.slice(0, 3);
      const imagenUrl = imagenes[0] || '';

      const datos = {
        nombre,
        categoria: formulario.categoria,
        descripcion: formulario.descripcion.trim(),
        precio,
        imagenUrl: imagenUrl || '',
        imagenes,
      };

      const actualizado = idEditando !== null
        ? await editarProducto(idEditando, datos)
        : await agregarProducto(datos);

      Alert.alert(
        idEditando !== null ? 'Producto actualizado' : 'Producto publicado',
        `“${actualizado.nombre}” quedó guardado correctamente.`
      );
      limpiarFormulario();
    } catch (error) {
      Alert.alert('No se pudo guardar el producto', error.message);
      console.error('Error al guardar producto:', error);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = (producto) => {
    Alert.alert(
      'Eliminar producto',
      `¿Querés eliminar “${producto.nombre}” del catálogo? Se conservará el historial de ventas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setEliminandoId(producto.id);
            try {
              await eliminarProducto(producto.id);
              if (String(idEditando) === String(producto.id)) limpiarFormulario();
              Alert.alert('Producto eliminado', 'Ya no aparece en el catálogo.');
            } catch (error) {
              Alert.alert('No se pudo eliminar', error.message);
            } finally {
              setEliminandoId(null);
            }
          },
        },
      ]
    );
  };

  if (!esAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Panel de administración</Text>
        <Text style={styles.helper}>Esta sección necesita una cuenta administradora verificada.</Text>
        <Text style={styles.helper}>Cuenta actual: {usuario?.email || 'sin sesión'} · Rol: {usuario?.rol || 'sin rol'}</Text>
      </View>
    );
  }

  return (
    <ScrollView ref={scrollRef} style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Panel de administración</Text>
      <Text style={styles.helper}>Sesión iniciada como {usuario?.nombre || 'administrador'}.</Text>

      {/* Formulario para publicar un producto nuevo o actualizar el seleccionado. */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{idEditando !== null ? 'Modificar producto' : 'Publicar un producto'}</Text>

        <Text style={styles.label}>Nombre del producto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej.: Bolsita Smacks 3 obleas + alfajor"
          value={formulario.nombre}
          onChangeText={(valor) => cambiarCampo('nombre', valor)}
        />

        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => setModalCategorias(true)}
          disabled={cargandoCategorias || categorias.length === 0}
        >
          <Text style={formulario.categoria ? styles.fieldText : styles.placeholderText}>
            {cargandoCategorias ? 'Cargando categorías…' : formulario.categoria || 'Seleccionar categoría'}
          </Text>
          <Text style={styles.arrow}>⌄</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describí el producto"
          value={formulario.descripcion}
          multiline
          onChangeText={(valor) => cambiarCampo('descripcion', valor)}
        />

        <Text style={styles.label}>Precio</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej.: 1500"
          value={formulario.precio}
          keyboardType="decimal-pad"
          onChangeText={(valor) => cambiarCampo('precio', valor.replace(',', '.'))}
        />

        <Text style={styles.label}>Imagen del producto</Text>
        <TouchableOpacity style={styles.photoButton} onPress={elegirFoto}>
          <Text style={styles.photoButtonText}>{formulario.assets.length || formulario.imagenes?.length ? 'Cambiar imágenes (máximo 3)' : 'Seleccionar hasta 3 imágenes'}</Text>
        </TouchableOpacity>
        <Text style={styles.helperSmall}>Podés elegir hasta 3 fotos. Cada una se sube a ImgBB al guardar y puede pesar hasta 5 MB.</Text>
        {(formulario.assets.length || formulario.imagenes?.length) ? (
          <View style={styles.previewContainer}>
            {(formulario.assets.length ? formulario.assets.map((foto) => foto.uri) : formulario.imagenes).slice(0, 3).map((uri, indice) => <Image key={`${uri}-${indice}`} source={{ uri }} style={styles.preview} resizeMode="cover" />)}
            <TouchableOpacity onPress={() => { cambiarCampo('assets', []); cambiarCampo('imagenes', []); cambiarCampo('imagenUrl', ''); }}>
              <Text style={styles.removePhoto}>Quitar imágenes</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.saveButton, guardando && styles.disabledButton]} onPress={guardarProducto} disabled={guardando}>
          <Text style={styles.saveButtonText}>
            {guardando ? 'Guardando producto…' : idEditando !== null ? 'Guardar cambios (PUT)' : 'Publicar producto (POST)'}
          </Text>
        </TouchableOpacity>

        {idEditando !== null ? (
          <TouchableOpacity style={styles.cancelButton} onPress={limpiarFormulario}>
            <Text style={styles.cancelButtonText}>Cancelar modificación</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={modalCategorias}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCategorias(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalCategorias(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.sectionTitle}>Elegí una categoría</Text>
            {categorias.map((categoria) => (
              <TouchableOpacity
                key={categoria.id}
                style={[styles.categoryOption, formulario.categoria === categoria.nombre && styles.selectedCategory]}
                onPress={() => {
                  cambiarCampo('categoria', categoria.nombre);
                  setModalCategorias(false);
                }}
              >
                <Text style={styles.fieldText}>{categoria.nombre}</Text>
                {formulario.categoria === categoria.nombre ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            ))}
            {categorias.length === 0 ? <Text style={styles.helper}>No hay categorías cargadas en MySQL.</Text> : null}
            <TouchableOpacity style={styles.addCategoryButton} onPress={() => { setModalCategorias(false); setModalNuevaCategoria(true); }}>
              <Text style={styles.addCategoryText}>+ Agregar nueva categoría</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalCategorias(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalNuevaCategoria} transparent animationType="fade" onRequestClose={() => setModalNuevaCategoria(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Nueva categoría</Text>
            <TextInput style={styles.input} placeholder="Ej.: Alfajores" value={nombreNuevaCategoria} onChangeText={setNombreNuevaCategoria} maxLength={60} autoCapitalize="words" />
            <TouchableOpacity style={styles.saveButton} onPress={async () => {
              const nombre = nombreNuevaCategoria.trim();
              if (!nombre) { Alert.alert('Falta el nombre', 'Escribí un nombre para la categoría.'); return; }
              try {
                const creada = await api('/categorias', { method: 'POST', body: JSON.stringify({ nombre }) });
                const lista = await api('/categorias');
                setCategorias(lista);
                cambiarCampo('categoria', creada.nombre);
                setNombreNuevaCategoria('');
                setModalNuevaCategoria(false);
                Alert.alert('Categoría agregada', `“${creada.nombre}” ya está disponible.`);
              } catch (error) { Alert.alert('No se pudo crear la categoría', error.message); }
            }}>
              <Text style={styles.saveButtonText}>Guardar categoría</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalNuevaCategoria(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.listHeading}>
        <Text style={styles.sectionTitle}>Productos publicados</Text>
        <Text style={styles.count}>{productos.length} productos</Text>
      </View>

      {productos.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay productos publicados.</Text>
      ) : productos.map((producto) => (
        <View key={producto.id} style={styles.productRow}>
          {producto.imagenUrl
            ? <Image source={{ uri: producto.imagenUrl }} style={styles.thumbnail} />
            : <View style={styles.thumbnail}><Text style={styles.placeholderText}>Sin foto</Text></View>}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{producto.nombre}</Text>
            <Text style={styles.productMeta}>{producto.categoria} · ${producto.precio}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editButton} onPress={() => cargarEdicion(producto)}>
                <Text style={styles.editText}>Modificar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                disabled={eliminandoId === producto.id}
                onPress={() => confirmarEliminar(producto)}
              >
                <Text style={styles.deleteText}>{eliminandoId === producto.id ? 'Eliminando…' : 'Eliminar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Mantiene los colores cálidos y las tarjetas sencillas del diseño original.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 6, color: '#33220D' },
  helper: { color: '#555', marginBottom: 8 },
  helperSmall: { color: '#666', fontSize: 12, marginTop: 6 },
  formCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#39280F' },
  label: { fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 11 },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  categoryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldText: { color: '#333' },
  placeholderText: { color: '#888' },
  arrow: { color: '#777', fontSize: 18 },
  photoButton: { backgroundColor: '#ffcc80', borderRadius: 8, padding: 12, alignItems: 'center' },
  photoButtonText: { color: '#3D2A0D', fontWeight: '600' },
  previewContainer: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' },
  preview: { width: '31%', height: 110, borderRadius: 8, backgroundColor: '#eee' },
  removePhoto: { color: '#b42318', marginTop: 8 },
  saveButton: { backgroundColor: '#007bff', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 12 },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { padding: 12, alignItems: 'center' },
  cancelButtonText: { color: '#8B4E00', fontWeight: '600' },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  count: { color: '#777', fontSize: 12 },
  empty: { color: '#777', textAlign: 'center', paddingVertical: 20 },
  productRow: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 62, height: 62, borderRadius: 6, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 10 },
  productName: { fontWeight: 'bold', color: '#33220D' },
  productMeta: { color: '#666', marginTop: 2, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  editButton: { backgroundColor: '#FFF0D8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginRight: 8 },
  deleteButton: { backgroundColor: '#FDE8E7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  editText: { color: '#89530D', fontWeight: '600' },
  deleteText: { color: '#B42318', fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  addCategoryButton: { marginTop: 12, padding: 12, backgroundColor: '#FFF0D8', borderRadius: 8, alignItems: 'center' },
  addCategoryText: { color: '#89530D', fontWeight: '700' },
  categoryOption: { paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  selectedCategory: { backgroundColor: '#FFF3E0' },
  check: { color: '#007bff', fontWeight: 'bold' },
  modalCancel: { paddingTop: 12, alignItems: 'center' },
});
