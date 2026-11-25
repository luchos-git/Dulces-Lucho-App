import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text, ThemedTextInput as TextInput } from '../context/ThemeContext';
// explicación del archivo: muestra el catálogo de productos y permite filtrarlo por categoría y rango de precios
import { createThemedStyles } from '../context/ThemeContext';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useProductos } from '../context/ProductosContext';
import { api } from '../services/api';
import SliderImagenes from '../components/SliderImagenes';
import SliderBanners from '../components/SliderBanners';
import CarruselProductos from '../components/CarruselProductos';

// Recupera las fotos de los distintos formatos que pudieron quedar guardados en la base anterior.
function obtenerImagenesProducto(producto) {
  let lista = producto?.imagenes ?? producto?.imagenesJson ?? producto?.imagenes_json ?? producto?.galeria ?? [];
  for (let intento = 0; intento < 2 && typeof lista === 'string' && lista.trim(); intento += 1) {
    try { lista = JSON.parse(lista); }
    catch { lista = /^https?:\/\//i.test(lista.trim()) ? [lista.trim()] : []; break; }
  }
  if (!Array.isArray(lista)) lista = lista ? [lista] : [];
  const urls = lista.map((item) => {
    if (typeof item === 'string') return item;
    return item?.url || item?.imagenUrl || item?.imageUrl || item?.src || item?.displayUrl || item?.display_url || item?.data?.url || item?.data?.display_url || '';
  });
  const principal = producto?.miniaturaUrl || producto?.miniatura_url || producto?.imagenUrl || producto?.imagen_url || producto?.portada || producto?.imagen || '';
  const validas = [...new Set(urls.map((url) => String(url || '').trim()).filter((url) => /^https?:\/\//i.test(url)))];
  if (!validas.length && principal && /^https?:\/\//i.test(principal)) validas.push(principal);
  return validas.slice(0, 3);
}

function iconoCategoria(categoria) {
  if (categoria === 'Jugos') return '🧃';
  if (categoria === 'Combos') return '🍬';
  return '🍫';
}

export default function HomeScreen({ navigation }) {
  // obtiene el catálogo compartido y guarda los valores de los filtros
  const { productos, cargarProductos } = useProductos();
  const [banners, setBanners] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');

  const irADetalle = (producto) => navigation.navigate('DetalleProducto', { producto });

  useEffect(() => {
    const cargarPantalla = async () => {
      // Actualiza también el catálogo al volver al inicio, para no depender de una copia local vieja.
      try {
        await cargarProductos();
      } catch (error) {
        console.warn('No se pudo actualizar el catálogo:', error.message);
      }
      try {
        const lista = await api('/banners');
        setBanners(Array.isArray(lista) ? lista : []);
      } catch (error) {
        console.warn('No se pudieron cargar los banners del inicio:', error.message);
        setBanners([]);
      }
    };
    cargarPantalla();
    const quitarListener = navigation.addListener('focus', cargarPantalla);
    return quitarListener;
  }, [navigation]);

  // Chequeo del rango antes de filtrar: mín no puede ser mayor que máx
  const rangoInvalido =
    precioMin !== '' && precioMax !== '' && Number(precioMin) > Number(precioMax);

  const listaCategorias = ['Todas', ...new Set(productos.map((p) => p.categoria))];
  // combina el filtro de categoría con los límites de precio seleccionados
  const productosFiltrados = rangoInvalido
    ? []
    : productos.filter((p) => {
        const coincideCategoria = categoriaSeleccionada === 'Todas' || p.categoria === categoriaSeleccionada;
        const min = precioMin !== '' ? Number(precioMin) : 0;
        const max = precioMax !== '' ? Number(precioMax) : Infinity;
        const coincidePrecio = p.precio >= min && p.precio <= max;
        return coincideCategoria && coincidePrecio;
      });

  const categoriasAgrupadas = productosFiltrados.reduce((acc, prod) => {
    if (!acc[prod.categoria]) acc[prod.categoria] = [];
    acc[prod.categoria].push(prod);
    return acc;
  }, {});

  // muestra los filtros y los productos agrupados por categoría
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contenidoScroll, { paddingBottom: 128 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <SliderBanners banners={banners} />

      <CarruselProductos
        titulo="Productos del día"
        productos={productos
          .filter((p) => Boolean(p.destacadoDia))
          .sort((a, b) => Number(a.destacadoOrden || 0) - Number(b.destacadoOrden || 0) || String(a.nombre).localeCompare(String(b.nombre)))}
        onPress={irADetalle}
        textoAccion="Ver producto"
      />

      <Text style={styles.tituloSeccion}>Filtrar</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filaCategorias}>
        {listaCategorias.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, categoriaSeleccionada === cat && styles.chipActivo]}
            onPress={() => setCategoriaSeleccionada(cat)}
          >
            <Text style={[styles.chipTexto, categoriaSeleccionada === cat && styles.chipTextoActivo]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filaPrecio}>
        <TextInput
          style={[styles.inputPrecio, rangoInvalido && styles.inputPrecioError]}
          placeholder="Precio mín."
          keyboardType="numeric"
          value={precioMin}
          onChangeText={setPrecioMin}
        />
        <Text style={styles.guion}>—</Text>
        <TextInput
          style={[styles.inputPrecio, rangoInvalido && styles.inputPrecioError]}
          placeholder="Precio máx."
          keyboardType="numeric"
          value={precioMax}
          onChangeText={setPrecioMax}
        />
      </View>

      {rangoInvalido && (
        <Text style={styles.mensajeError}>
          El precio mínimo no puede ser mayor al precio máximo.
        </Text>
      )}

      {!rangoInvalido && Object.keys(categoriasAgrupadas).length === 0 && (
        <Text style={styles.sinResultados}>No hay productos que coincidan con el filtro.</Text>
      )}

      {Object.keys(categoriasAgrupadas).map((nombreCategoria) => (
        <View key={nombreCategoria}>
          <Text style={styles.tituloSeccion}>{nombreCategoria}</Text>
          <View style={styles.grid}>
            {categoriasAgrupadas[nombreCategoria].map((prod) => (
              <View key={prod.id} style={styles.cardGrid}>
                <TouchableOpacity style={styles.contenidoProducto} activeOpacity={0.85} onPress={() => irADetalle(prod)}>
                  <View style={styles.marcoImagen}>
                    {obtenerImagenesProducto(prod).length ? <SliderImagenes imagenes={obtenerImagenesProducto(prod)} style={styles.fotoPlaceholder} resizeMode="contain" /> : <View style={styles.fotoPlaceholder}><Text style={styles.emojiFoto}>{iconoCategoria(prod.categoria)}</Text></View>}
                    {Number(prod.stockDisponible ?? prod.stock_disponible ?? 0) <= 0 && <View pointerEvents="none" style={styles.capaAgotado}><Text style={styles.textoAgotado}>AGOTADO</Text></View>}
                  </View>
                  <Text style={styles.nombreProd} numberOfLines={2}>{prod.nombre}</Text>
                </TouchableOpacity>
                <View pointerEvents="none" style={styles.precioNoInteractivo}>
              <Text style={styles.precio}>${prod.precio}</Text>
            </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// estilos del catálogo, filtros y tarjetas de productos
const styles = createThemedStyles({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  contenidoScroll: { paddingBottom: 120 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, marginTop: 14, marginBottom: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  card: { width: 150, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10 },
  contenidoProducto: { width: '100%', alignItems: 'center', flexGrow: 1 },

  filaCategorias: { paddingLeft: 10, marginBottom: 10 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffcc80', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipActivo: { backgroundColor: '#ffcc80' },
  chipTexto: { color: '#c77b00' },
  chipTextoActivo: { color: '#000', fontWeight: 'bold' },

  filaPrecio: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 6 },
  inputPrecio: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  inputPrecioError: { borderColor: '#e57373', borderWidth: 1.5 },
  guion: { marginHorizontal: 8, color: '#888' },

  mensajeError: { color: '#e57373', fontWeight: 'bold', textAlign: 'center', marginTop: 4, marginBottom: 10, paddingHorizontal: 10 },
  sinResultados: { textAlign: 'center', color: '#888', marginTop: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 10 },
  cardGrid: { width: '48.5%', height: 258, backgroundColor: '#fff', padding: 11, alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, marginBottom: 13 },
  marcoImagen: { width: '100%', height: 148, borderRadius: 8, overflow: 'hidden', marginBottom: 7, position: 'relative' },
  fotoPlaceholder: { width: '100%', height: '100%', backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  capaAgotado: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(45,33,24,0.58)', alignItems: 'center', justifyContent: 'center' },
  textoAgotado: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 1 },
  emojiFoto: { fontSize: 42 },
  nombreProd: { textAlign: 'center', marginBottom: 2, minHeight: 40, lineHeight: 19 },
  precioNoInteractivo: { alignSelf: 'center', minHeight: 28, justifyContent: 'center' },
  precio: { fontWeight: 'bold', color: '#c77b00', marginTop: 2 },
});
