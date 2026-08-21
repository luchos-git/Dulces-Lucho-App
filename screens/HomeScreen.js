import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const productos = [
  { id: 1, nombre: 'Alfajor de maicena', categoria: 'Alfajores', precio: 1500 },
  { id: 2, nombre: 'Alfajor de chocolate', categoria: 'Alfajores', precio: 1600 },
  { id: 3, nombre: 'Alfajor triple', categoria: 'Alfajores', precio: 2000 },
  { id: 4, nombre: 'Chocolate con almendras', categoria: 'Chocolates', precio: 2500 },
  { id: 5, nombre: 'Chocolate blanco', categoria: 'Chocolates', precio: 2300 },
  { id: 6, nombre: 'Chocolate amargo 70%', categoria: 'Chocolates', precio: 2400 },
  { id: 7, nombre: 'Caramelos de miel', categoria: 'Caramelos', precio: 900 },
  { id: 8, nombre: 'Caramelos surtidos', categoria: 'Caramelos', precio: 950 },
  { id: 9, nombre: 'Bombones surtidos', categoria: 'Bombones', precio: 3000 },
  { id: 10, nombre: 'Bombones de licor', categoria: 'Bombones', precio: 3500 },
];

const categorias = productos.reduce((acc, prod) => {
  if (!acc[prod.categoria]) acc[prod.categoria] = [];
  acc[prod.categoria].push(prod);
  return acc;
}, {});

export default function HomeScreen({ navigation }) {
  const irADetalle = (producto) => navigation.navigate('DetalleProducto', { producto });

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

      {Object.keys(categorias).map((nombreCategoria) => (
        <View key={nombreCategoria}>
          <Text style={styles.tituloSeccion}>{nombreCategoria}</Text>
          <View style={styles.grid}>
            {categorias[nombreCategoria].map((prod) => (
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 10 },
  cardGrid: { width: '48%', backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10, marginBottom: 12 },
  fotoPlaceholder: { width: '100%', height: 100, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 6 },
  nombreProd: { textAlign: 'center', marginBottom: 2 },
  precio: { fontWeight: 'bold', color: '#c77b00', marginTop: 2 },
});