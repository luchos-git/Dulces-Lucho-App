import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';

import {productos} from '../data/productos';

const listaCategorias = ['Todas', ...new Set(productos.map((p) => p.categoria))];

export default function HomeScreen({ navigation }) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');

  const irADetalle = (producto) => navigation.navigate('DetalleProducto', { producto });

  // Chequeo del rango antes de filtrar: mín no puede ser mayor que máx
  const rangoInvalido =
    precioMin !== '' && precioMax !== '' && Number(precioMin) > Number(precioMax);

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.banner}><Text>Banner de Promo/Evento</Text></View>

      <Text style={styles.tituloSeccion}>Ofertas del día</Text>
      <View style={styles.fila}>
        {productos.slice(0, 2).map((prod) => (
          <TouchableOpacity key={prod.id} style={styles.card} onPress={() => irADetalle(prod)}>
            <View style={styles.fotoPlaceholder}><Text>Foto</Text></View>
            <Text numberOfLines={1}>{prod.nombre}</Text>
            <Text style={styles.precio}>${prod.precio}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
              <TouchableOpacity key={prod.id} style={styles.cardGrid} onPress={() => irADetalle(prod)}>
                <View style={styles.fotoPlaceholder}><Text>Foto</Text></View>
                <Text style={styles.nombreProd} numberOfLines={2}>{prod.nombre}</Text>
                <Text style={styles.precio}>${prod.precio}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  banner: { height: 150, backgroundColor: '#ddd', margin: 10, justifyContent: 'center', alignItems: 'center' },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, marginTop: 14, marginBottom: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  card: { width: 150, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10 },

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
  cardGrid: { width: '48%', backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10, marginBottom: 12 },
  fotoPlaceholder: { width: '100%', height: 100, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 6 },
  nombreProd: { textAlign: 'center', marginBottom: 2 },
  precio: { fontWeight: 'bold', color: '#c77b00', marginTop: 2 },
});