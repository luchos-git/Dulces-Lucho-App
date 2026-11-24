import React, { useEffect, useMemo, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

// Muestra hasta tres imágenes y avanza automáticamente cada 1.5 segundos.
export default function SliderImagenes({ imagenes = [], style, resizeMode = 'cover' }) {
  const lista = useMemo(() => (Array.isArray(imagenes) ? imagenes : [])
    .map((imagen) => typeof imagen === 'string' ? imagen : (imagen?.url || imagen?.imagenUrl || imagen?.imageUrl || imagen?.src || imagen?.displayUrl || imagen?.display_url || imagen?.data?.url || ''))
    .map((url) => String(url || '').trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 3), [imagenes]);
  const [indice, setIndice] = useState(0);
  const [imagenFallida, setImagenFallida] = useState('');

  useEffect(() => {
    setIndice(0);
    setImagenFallida('');
  }, [lista.join('|')]);

  useEffect(() => {
    if (lista.length < 2) return undefined;
    const intervalo = setInterval(() => {
      setIndice((actual) => (actual + 1) % lista.length);
      setImagenFallida('');
    }, 1500);
    return () => clearInterval(intervalo);
  }, [lista.length]);

  const actual = lista[indice];
  if (!actual) return <View style={[styles.vacio, style]}><Text style={styles.textoVacio}>Sin foto</Text></View>;
  if (imagenFallida === actual) {
    return <View style={[styles.vacio, style]}><Text style={styles.textoVacio}>Imagen no disponible</Text></View>;
  }

  return (
    <View style={[styles.contenedor, style]}>
      <Image
        key={actual}
        source={{ uri: actual }}
        style={styles.imagen}
        resizeMode={resizeMode}
        onError={() => setImagenFallida(actual)}
      />
      {lista.length > 1 ? (
        <View style={styles.puntos}>
          {lista.map((_, i) => <View key={i} style={[styles.punto, i === indice && styles.puntoActivo]} />)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { overflow: 'hidden', backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center' },
  imagen: { width: '100%', height: '100%' },
  vacio: { backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center' },
  textoVacio: { color: '#A66A12', fontSize: 12 },
  puntos: { position: 'absolute', bottom: 7, flexDirection: 'row', gap: 5 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.65)' },
  puntoActivo: { width: 14, backgroundColor: '#fff' },
});
