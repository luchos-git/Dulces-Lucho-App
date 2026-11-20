import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

// Muestra hasta tres imágenes y avanza automáticamente cada 1.5 segundos.
export default function SliderImagenes({ imagenes = [], style, resizeMode = 'cover' }) {
  const lista = (Array.isArray(imagenes) ? imagenes : []).filter(Boolean).slice(0, 3);
  const [indice, setIndice] = useState(0);
  useEffect(() => {
    setIndice(0);
  }, [lista.join('|')]);
  useEffect(() => {
    if (lista.length < 2) return undefined;
    const intervalo = setInterval(() => setIndice((actual) => (actual + 1) % lista.length), 1500);
    return () => clearInterval(intervalo);
  }, [lista.length]);
  if (!lista.length) return <View style={[styles.vacio, style]}><Text>Sin foto</Text></View>;
  return (
    <View style={[styles.contenedor, style]}>
      <Image source={{ uri: lista[indice] }} style={styles.imagen} resizeMode={resizeMode} />
      {lista.length > 1 ? <View style={styles.puntos}>{lista.map((_, i) => <View key={i} style={[styles.punto, i === indice && styles.puntoActivo]} />)}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { overflow: 'hidden', backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center' },
  imagen: { width: '100%', height: '100%' },
  vacio: { backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center' },
  puntos: { position: 'absolute', bottom: 7, flexDirection: 'row', gap: 5 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.65)' },
  puntoActivo: { width: 14, backgroundColor: '#fff' },
});
