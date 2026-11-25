import { ThemedText as Text } from '../context/ThemeContext';
import { createThemedStyles } from '../context/ThemeContext';
import React from 'react';
import { ScrollView, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import SliderImagenes from './SliderImagenes';

function imagenesDe(producto) {
  let lista = producto?.imagenes ?? producto?.imagenesJson ?? producto?.imagenes_json ?? [];
  if (typeof lista === 'string') {
    try { lista = JSON.parse(lista); } catch { lista = /^https?:\/\//i.test(lista) ? [lista] : []; }
  }
  if (!Array.isArray(lista)) lista = lista ? [lista] : [];
  const urls = lista.map((item) => typeof item === 'string' ? item : (item?.url || item?.display_url || item?.displayUrl || item?.data?.url || ''));
  const principal = producto?.miniaturaUrl || producto?.imagenUrl || producto?.imagen_url || '';
  return [...new Set([...urls, principal].filter((url) => /^https?:\/\//i.test(String(url || ''))))].slice(0, 3);
}

export default function CarruselProductos({ titulo, productos = [], onPress, onAgregar, textoAccion = 'Ver producto' }) {
  if (!productos.length) return null;
  return (
    <View style={styles.seccion}>
      {!!titulo && <Text style={styles.titulo}>{titulo}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lista} decelerationRate="normal" snapToInterval={194} snapToAlignment="start" disableIntervalMomentum scrollEventThrottle={16}>
        {productos.map((producto) => {
          const agotado = Number(producto.stockDisponible ?? producto.stock_disponible ?? 0) <= 0;
          const imagenes = imagenesDe(producto);
          return (
            <View key={producto.id} style={styles.tarjeta}>
              <TouchableOpacity activeOpacity={0.88} onPress={() => onPress?.(producto)}>
                <View style={styles.marcoFoto}>
                  {imagenes.length ? <SliderImagenes imagenes={imagenes} style={styles.foto} resizeMode="contain" /> : <View style={styles.fotoVacia}><Text style={styles.emoji}>🍬</Text></View>}
                  {agotado && <View pointerEvents="none" style={styles.capaAgotado}><Text style={styles.textoAgotado}>AGOTADO</Text></View>}
                </View>
                <Text style={styles.nombre} numberOfLines={2}>{producto.nombre}</Text>
                <Text style={styles.precio}>${Number(producto.precio || 0).toFixed(0)}</Text>
                {!agotado && <Text style={styles.stock}>Disponibles: {Number(producto.stockDisponible ?? 0)}</Text>}
              </TouchableOpacity>
              {onAgregar && !agotado && (
                <TouchableOpacity style={styles.boton} onPress={() => onAgregar(producto)}>
                  <Text style={styles.botonTexto}>Agregar</Text>
                </TouchableOpacity>
              )}
              {!onAgregar && <Text style={[styles.pie, agotado && styles.pieAgotado]}>{agotado ? 'Podés realizar un pedido' : textoAccion}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles({
  seccion: { marginTop: 12, marginBottom: 4 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#493116', marginHorizontal: 10, marginBottom: 8 },
  lista: { paddingHorizontal: 10, paddingBottom: 8 },
  tarjeta: { width: 184, height: 290, marginRight: 10, backgroundColor: '#fff', borderRadius: 12, padding: 10, justifyContent: 'space-between' },
  marcoFoto: { height: 138, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFE8C5', marginBottom: 7 },
  foto: { width: '100%', height: '100%' },
  fotoVacia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 38 },
  capaAgotado: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(45, 33, 24, 0.58)', justifyContent: 'center', alignItems: 'center' },
  textoAgotado: { color: '#fff', fontWeight: '900', fontSize: 19, letterSpacing: 1 },
  nombre: { color: '#38240D', fontWeight: '600', minHeight: 40, lineHeight: 19 },
  precio: { color: '#A86616', fontWeight: 'bold', marginTop: 3, minHeight: 22 },
  stock: { color: '#777', fontSize: 11, marginTop: 2, minHeight: 16 },
  pie: { color: '#8A6B45', fontSize: 11, marginTop: 6, minHeight: 16 },
  pieAgotado: { color: '#B42318', fontWeight: 'bold' },
  boton: { backgroundColor: '#ffcc80', borderRadius: 7, paddingVertical: 8, minHeight: 34, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  botonTexto: { color: '#493116', fontWeight: 'bold' },
});
