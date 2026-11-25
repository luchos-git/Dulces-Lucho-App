import { ThemedText as Text } from '../context/ThemeContext';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, TouchableOpacity, View } from 'react-native';
import { createThemedStyles } from '../context/ThemeContext';

export default function SliderImagenes({ imagenes = [], style, resizeMode = 'cover', onPressImage }) {
  const lista = useMemo(() => (Array.isArray(imagenes) ? imagenes : [])
    .map((imagen) => typeof imagen === 'string' ? imagen : (imagen?.url || imagen?.imagenUrl || imagen?.imageUrl || imagen?.src || imagen?.displayUrl || imagen?.display_url || imagen?.data?.url || ''))
    .map((url) => String(url || '').trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 3), [imagenes]);
  const [indice, setIndice] = useState(0);
  const [imagenFallida, setImagenFallida] = useState('');
  const opacidad = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIndice(0);
    setImagenFallida('');
    opacidad.setValue(1);
  }, [lista.join('|'), opacidad]);

  const cambiarImagen = useCallback((direccion) => {
    if (lista.length < 2) return;
    Animated.timing(opacidad, { toValue: 0.25, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setIndice((actual) => (actual + direccion + lista.length) % lista.length);
      setImagenFallida('');
      Animated.timing(opacidad, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    });
  }, [lista.length, opacidad]);

  useEffect(() => {
    if (lista.length < 2) return undefined;
    const intervalo = setInterval(() => cambiarImagen(1), 4800);
    return () => clearInterval(intervalo);
  }, [lista.length, cambiarImagen]);

  const actual = lista[indice];
  if (!actual) return <View style={[styles.vacio, style]}><Text style={styles.textoVacio}>Sin foto</Text></View>;
  if (imagenFallida === actual) return <View style={[styles.vacio, style]}><Text style={styles.textoVacio}>Imagen no disponible</Text></View>;

  return (
    <View style={[styles.contenedor, style]}>
      {onPressImage ? (
        <TouchableOpacity activeOpacity={0.96} style={styles.imagenTocable} onPress={() => onPressImage(actual, indice)} accessibilityRole="button" accessibilityLabel="Ampliar imagen del producto">
          <Animated.Image key={actual} source={{ uri: actual }} style={[styles.imagen, { opacity: opacidad }]} resizeMode={resizeMode} onError={() => setImagenFallida(actual)} />
        </TouchableOpacity>
      ) : (
        <Animated.Image key={actual} source={{ uri: actual }} style={[styles.imagen, { opacity: opacidad }]} resizeMode={resizeMode} onError={() => setImagenFallida(actual)} />
      )}
      {lista.length > 1 ? (
        <>
          <TouchableOpacity accessibilityLabel="Foto anterior" style={[styles.flecha, styles.flechaIzquierda]} onPress={() => cambiarImagen(-1)}><Text style={styles.flechaTexto}>‹</Text></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Foto siguiente" style={[styles.flecha, styles.flechaDerecha]} onPress={() => cambiarImagen(1)}><Text style={styles.flechaTexto}>›</Text></TouchableOpacity>
          <View style={styles.puntos}>{lista.map((_, i) => <View key={i} style={[styles.punto, i === indice && styles.puntoActivo]} />)}</View>
        </>
      ) : null}
    </View>
  );
}

const styles = createThemedStyles({
  contenedor: { overflow: 'hidden', backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center' },
  imagen: { width: '100%', height: '100%' },
  imagenTocable: { width: '100%', height: '100%' },
  vacio: { backgroundColor: '#FFE8C5', justifyContent: 'center', alignItems: 'center' },
  textoVacio: { color: '#A66A12', fontSize: 12 },
  puntos: { position: 'absolute', bottom: 7, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.65)' },
  puntoActivo: { width: 14, backgroundColor: '#fff' },
  flecha: { position: 'absolute', top: '42%', width: 26, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' },
  flechaIzquierda: { left: 5 },
  flechaDerecha: { right: 5 },
  flechaTexto: { color: '#fff', fontSize: 24, lineHeight: 27, fontWeight: '600' },
});
