import React, { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

// Cada registro de la tabla banners representa una imagen dentro del carrusel del inicio.
export default function SliderBanners({ banners = [] }) {
  const lista = (Array.isArray(banners) ? banners : [])
    .filter((banner) => banner?.imagenUrl || banner?.imagen_url)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
  const claveLista = lista.map((banner) => `${banner.id}:${banner.imagenUrl || banner.imagen_url}`).join('|');
  const [indice, setIndice] = useState(0);
  const [errorImagen, setErrorImagen] = useState(false);

  useEffect(() => {
    setIndice(0);
    setErrorImagen(false);
  }, [claveLista]);

  useEffect(() => {
    if (lista.length < 2) return undefined;
    const intervalo = setInterval(() => {
      setIndice((actual) => (actual + 1) % lista.length);
      setErrorImagen(false);
    }, 3500);
    return () => clearInterval(intervalo);
  }, [lista.length, claveLista]);

  if (!lista.length) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.textoVacio}>Promociones y novedades</Text>
      </View>
    );
  }

  const banner = lista[indice];
  const uri = banner.imagenUrl || banner.imagen_url;

  return (
    <View style={styles.contenedor}>
      {!errorImagen ? (
        <ImageBackground
          key={uri}
          source={{ uri }}
          resizeMode="cover"
          style={styles.imagen}
          onError={(evento) => {
            console.warn('No se pudo cargar el banner:', uri, evento?.nativeEvent?.error || 'Error de red');
            setErrorImagen(true);
          }}
        >
          {!!banner.titulo && (
            <View style={styles.cajaTitulo}>
              <Text style={styles.titulo} numberOfLines={2}>{banner.titulo}</Text>
            </View>
          )}
        </ImageBackground>
      ) : (
        <View style={styles.errorImagen}>
          <Text style={styles.textoVacio}>No se pudo cargar esta imagen</Text>
        </View>
      )}
      {lista.length > 1 ? (
        <View style={styles.puntos}>
          {lista.map((item, i) => (
            <View key={item.id || i} style={[styles.punto, i === indice && styles.puntoActivo]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { height: 150, margin: 10, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFE0B2' },
  imagen: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  cajaTitulo: { backgroundColor: 'rgba(45, 29, 10, 0.48)', paddingHorizontal: 12, paddingVertical: 8 },
  titulo: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  vacio: { height: 150, margin: 10, borderRadius: 12, backgroundColor: '#FFE0B2', justifyContent: 'center', alignItems: 'center' },
  errorImagen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFE0B2' },
  textoVacio: { color: '#80500F', fontWeight: '600' },
  puntos: { position: 'absolute', bottom: 7, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.75)' },
  puntoActivo: { width: 16, backgroundColor: '#fff' },
});
