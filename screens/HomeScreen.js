import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useProductos } from '../context/ProductosContext';

export default function HomeScreen({ navigation }) {
  const { productos, cargando } = useProductos();

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <Text>Cargando productos...</Text>
      </View>
    );
  }

  const categorias = productos.reduce((acc, prod) => {
    if (!acc[prod.categoria]) acc[prod.categoria] = [];
    acc[prod.categoria].push(prod);
    return acc;
  }, {});

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

      <View style={styles.bannerPromo}>
        <Text style={styles.bannerPromoTexto}>Cupón por jugar un juego (tiempo limitado)</Text>
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
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { height: 150, backgroundColor: '#ddd', margin: 10, justifyContent: 'center', alignItems: 'center' },
  bannerPromo: { backgroundColor: '#e57373', margin: 10, padding: 14, borderRadius: 10 },
  bannerPromoTexto: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, marginTop: 14, marginBottom: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  card: { width: 150, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 10 },
  cardGrid: { width: '48%', backgroundColor: '#fff', padding: 10, alignItems: 'center', borderRadius: 10, marginBottom: 12 },
  fotoPlaceholder: { width: '100%', height: 100, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 6 },
  nombreProd: { textAlign: 'center', marginBottom: 2 },
  precio: { fontWeight: 'bold', color: '#c77b00', marginTop: 2 },
});