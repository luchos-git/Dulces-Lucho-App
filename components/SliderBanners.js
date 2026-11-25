import { ThemedText as Text } from '../context/ThemeContext';
import React, { useEffect, useRef, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { createThemedStyles } from '../context/ThemeContext';

export default function SliderBanners({ banners = [] }) {
  const lista = (Array.isArray(banners) ? banners : [])
    .filter((banner) => banner?.imagenUrl || banner?.imagen_url)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
  const [ancho, setAncho] = useState(0);
  const [indice, setIndice] = useState(0);
  const ref = useRef(null);
  const indiceRef = useRef(0);
  const claveLista = lista.map((banner) => `${banner.id}:${banner.imagenUrl || banner.imagen_url}`).join('|');

  useEffect(() => {
    indiceRef.current = 0;
    setIndice(0);
    ref.current?.scrollTo({ x: 0, animated: false });
  }, [claveLista]);

  useEffect(() => {
    if (lista.length < 2 || ancho <= 0) return undefined;
    const intervalo = setInterval(() => {
      const siguiente = (indiceRef.current + 1) % lista.length;
      indiceRef.current = siguiente;
      setIndice(siguiente);
      ref.current?.scrollTo({ x: siguiente * ancho, animated: true });
    }, 5600);
    return () => clearInterval(intervalo);
  }, [lista.length, ancho, claveLista]);

  if (!lista.length) {
    return <View style={styles.vacio}><Text style={styles.textoVacio}>Promociones y novedades</Text></View>;
  }

  return (
    <View style={styles.contenedor} onLayout={(evento) => setAncho(evento.nativeEvent.layout.width)}>
      {ancho > 0 && (
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          onMomentumScrollEnd={(evento) => {
            const nuevo = Math.max(0, Math.min(lista.length - 1, Math.round(evento.nativeEvent.contentOffset.x / ancho)));
            indiceRef.current = nuevo;
            setIndice(nuevo);
          }}
        >
          {lista.map((banner, index) => {
            const uri = banner.imagenUrl || banner.imagen_url;
            return (
              <ImageBackground key={banner.id || uri || index} source={{ uri }} resizeMode="cover" style={[styles.imagen, { width: ancho }]} onError={() => console.warn('No se pudo cargar el banner:', uri)}>
                {!!banner.titulo && <View style={styles.cajaTitulo}><Text style={styles.titulo} numberOfLines={2}>{banner.titulo}</Text></View>}
              </ImageBackground>
            );
          })}
        </ScrollView>
      )}
      {lista.length > 1 && <View pointerEvents="none" style={styles.puntos}>{lista.map((item, i) => <View key={item.id || i} style={[styles.punto, i === indice && styles.puntoActivo]} />)}</View>}
    </View>
  );
}

const styles = createThemedStyles({
  contenedor: { height: 150, margin: 10, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFE0B2' },
  imagen: { height: 150, justifyContent: 'flex-end' },
  cajaTitulo: { backgroundColor: 'rgba(45, 29, 10, 0.48)', paddingHorizontal: 12, paddingVertical: 8 },
  titulo: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  vacio: { height: 150, margin: 10, borderRadius: 12, backgroundColor: '#FFE0B2', justifyContent: 'center', alignItems: 'center' },
  textoVacio: { color: '#80500F', fontWeight: '600' },
  puntos: { position: 'absolute', bottom: 7, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.75)' },
  puntoActivo: { width: 16, backgroundColor: '#fff' },
});
