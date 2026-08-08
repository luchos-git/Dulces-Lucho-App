import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';

const productos = [
  { id: '1', nombre: 'Alfajor de maicena', categoria: 'Alfajores' },
  { id: '2', nombre: 'Alfajor de chocolate', categoria: 'Alfajores' },
  { id: '3', nombre: 'Alfajor triple', categoria: 'Alfajores' },
  { id: '4', nombre: 'Chocolate con almendras', categoria: 'Chocolates' },
  { id: '5', nombre: 'Chocolate blanco', categoria: 'Chocolates' },
  { id: '6', nombre: 'Chocolate amargo 70%', categoria: 'Chocolates' },
  { id: '7', nombre: 'Caramelos de miel', categoria: 'Caramelos' },
  { id: '8', nombre: 'Caramelos surtidos', categoria: 'Caramelos' },
  { id: '9', nombre: 'Bombones surtidos', categoria: 'Bombones' },
  { id: '10', nombre: 'Bombones de licor', categoria: 'Bombones' },
];

// Agrupa los productos por categoría automáticamente
const categorias = productos.reduce((acc, prod) => {
  if (!acc[prod.categoria]) acc[prod.categoria] = [];
  acc[prod.categoria].push(prod);
  return acc;
}, {});

export default function HomeScreen() {
  const alertaProceso = () => Alert.alert("En proceso", "Esta sección estará lista pronto.");

  return (
    <ScrollView style={styles.container}>
      <View style={styles.banner}><Text>Banner de Promo/Evento</Text></View>

      <Text style={styles.tituloSeccion}>Ofertas del día</Text>
      <View style={styles.fila}>
        <View style={styles.card}>
          <Text>Foto</Text>
          <Text>[Nombre Prod]</Text>
          <TouchableOpacity style={styles.boton} onPress={alertaProceso}><Text>Agregar</Text></TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text>Foto</Text>
          <Text>[Nombre Prod]</Text>
          <TouchableOpacity style={styles.boton} onPress={alertaProceso}><Text>Agregar</Text></TouchableOpacity>
        </View>
      </View>

      {Object.keys(categorias).map((nombreCategoria) => (
        <View key={nombreCategoria}>
          <Text style={styles.tituloSeccion}>{nombreCategoria}</Text>
          <View style={styles.grid}>
            {categorias[nombreCategoria].map((prod) => (
              <View key={prod.id} style={styles.cardGrid}>
                <View style={styles.fotoPlaceholder}><Text>Foto</Text></View>
                <Text style={styles.nombreProd} numberOfLines={2}>{prod.nombre}</Text>
                <TouchableOpacity style={styles.boton} onPress={alertaProceso}>
                  <Text>Agregar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  banner: { height: 150, backgroundColor: '#ddd', margin: 10 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, marginTop: 14, marginBottom: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  card: { width: 150, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10 },
  boton: { backgroundColor: '#ffcc80', padding: 5, marginTop: 5, borderRadius: 5 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  cardGrid: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 10,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 12,
  },
  fotoPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 6,
  },
  nombreProd: { textAlign: 'center', marginBottom: 4 },
});