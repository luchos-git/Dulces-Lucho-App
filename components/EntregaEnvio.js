import { ThemedText as Text, ThemedTextInput as TextInput } from '../context/ThemeContext';
// explicación del archivo: muestra las opciones de retiro o envío y reúne los datos necesarios para calcular el costo de entrega
import { createThemedStyles } from '../context/ThemeContext';
import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { calcularEnvio, UMBRAL_GRATIS_KM } from '../services/envio';
import { api } from '../services/api';

// Guarda todo el estado de la entrega (retiro o envío) y el cálculo del costo.
// "inicial" sirve para arrancar con lo que ya se eligió en otra pantalla.
export function useEntrega(inicial = {}, tarifaBase = 0) {
  const [conEnvio, setConEnvio] = useState(inicial.conEnvio || false);
  const [direccion, setDireccion] = useState(inicial.direccion || '');
  const [localidad, setLocalidad] = useState(inicial.localidad || '');
  const [envio, setEnvio] = useState(inicial.envio || null);
  const [calculando, setCalculando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [datosTienda, setDatosTienda] = useState(null);
  const [cargandoTienda, setCargandoTienda] = useState(false);

  const cargarConfiguracionTienda = useCallback(async () => {
    setCargandoTienda(true);
    try {
      const datos = await api('/configuracion-tienda');
      setDatosTienda(datos || null);
      return datos || null;
    } catch (error) {
      setDatosTienda(null);
      console.warn('No se pudo cargar la dirección del local:', error?.message || error);
      return null;
    } finally {
      setCargandoTienda(false);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracionTienda();
  }, [cargarConfiguracionTienda]);

  const calcular = useCallback(async () => {
    if (!direccion.trim()) {
      setErrorEnvio('Escribí la calle y el número.');
      return;
    }
    if (!localidad.trim()) {
      setErrorEnvio('Escribí la localidad (ej: Lanús), así no se confunde con otra calle igual.');
      return;
    }
    setCalculando(true);
    setErrorEnvio('');
    setEnvio(null);
    try {
      // El backend consulta el local guardado en MySQL, coordina las APIs y devuelve el precio final.
      const resultado = await calcularEnvio(direccion.trim(), localidad.trim());
      setEnvio(resultado);
    } catch (e) {
      setErrorEnvio(e.message || 'No pudimos calcular el envío. Probá de nuevo.');
    } finally {
      setCalculando(false);
    }
  }, [direccion, localidad]);

  // Si el cliente cambia la dirección, el cálculo anterior ya no vale.
  const cambiarDireccion = useCallback((texto) => {
    setDireccion(texto);
    setEnvio(null);
  }, []);
  const cambiarLocalidad = useCallback((texto) => {
    setLocalidad(texto);
    setEnvio(null);
  }, []);

  return {
    conEnvio,
    setConEnvio,
    direccion,
    localidad,
    envio,
    calculando,
    errorEnvio,
    datosTienda,
    cargandoTienda,
    calcular,
    cambiarDireccion,
    cambiarLocalidad,
  };
}

export default function EntregaEnvio({ entrega, envioHabilitado = true, tarifaBase = 0, mostrarDireccionLocal = false, onDireccionEditada }) {
  const {
    conEnvio,
    setConEnvio,
    direccion,
    localidad,
    envio,
    calculando,
    errorEnvio,
    datosTienda,
    cargandoTienda,
    calcular,
    cambiarDireccion,
    cambiarLocalidad,
  } = entrega;

  return (
    <View>
      <Text style={styles.titulo}>Entrega</Text>

      {mostrarDireccionLocal && (
        <View style={styles.direccionLocal}>
          <Text style={styles.puntoTitulo}>📍 Dirección del local</Text>
          <Text style={styles.puntoTexto}>
            {cargandoTienda ? 'Consultando dirección...' : [datosTienda?.direccion, datosTienda?.localidad].filter(Boolean).join(', ') || 'El administrador todavía no configuró la dirección del local.'}
          </Text>
        </View>
      )}

      <View style={styles.filaOpciones}>
        <TouchableOpacity
          style={[styles.opcion, !conEnvio && styles.opcionActiva]}
          onPress={() => setConEnvio(false)}
        >
          <Text style={[styles.opcionTexto, !conEnvio && styles.opcionTextoActivo]}>Retiro en el local</Text>
        </TouchableOpacity>
        {envioHabilitado && (
          <TouchableOpacity
            style={[styles.opcion, conEnvio && styles.opcionActiva]}
            onPress={() => setConEnvio(true)}
          >
            <Text style={[styles.opcionTexto, conEnvio && styles.opcionTextoActivo]}>Envío a domicilio</Text>
          </TouchableOpacity>
        )}
      </View>

      {conEnvio && (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Calle y número (ej: Av. Mitre 200)"
            value={direccion}
            onChangeText={(texto) => { onDireccionEditada?.(); cambiarDireccion(texto); }}
          />
          <TextInput
            style={styles.input}
            placeholder="Localidad (ej: Lanús)"
            value={localidad}
            onChangeText={(texto) => { onDireccionEditada?.(); cambiarLocalidad(texto); }}
          />

          <TouchableOpacity style={styles.botonCalcular} onPress={calcular} disabled={calculando}>
            {calculando ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.botonCalcularTexto}>Calcular envío</Text>
            )}
          </TouchableOpacity>

          {errorEnvio !== '' && <Text style={styles.error}>{errorEnvio}</Text>}

          {envio && (
            <View style={styles.resultado}>
              <Text style={styles.puntoTitulo}>📍 Desde</Text>
              <Text style={styles.puntoTexto}>{envio.origen}</Text>

              <Text style={styles.puntoTitulo}>🏠 Hasta</Text>
              <Text style={styles.puntoTexto}>{envio.destino}</Text>

              <Text style={styles.distancia}>
                {envio.distanciaKm.toFixed(1)} km {envio.metodo === 'recta' ? '(en línea recta, aproximado)' : 'por calles'}
                {' — '}
                {envio.costo === 0 ? '¡Envío gratis!' : `Envío: $${envio.costo}`}
              </Text>

              <Text style={styles.nota}>
                Si esa no es tu dirección, corregí la calle o la localidad y volvé a calcular.
              </Text>
            </View>
          )}

          <Text style={styles.nota}>Envío gratis hasta {UMBRAL_GRATIS_KM} km según distancia, más tarifa base de ${Number(tarifaBase || 0)}. Datos © OpenStreetMap.</Text>
        </View>
      )}
    </View>
  );
}

const styles = createThemedStyles({
  titulo: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  direccionLocal: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10, marginBottom: 10 },
  filaOpciones: { flexDirection: 'row' },
  opcion: { flex: 1, borderWidth: 1, borderColor: '#ffcc80', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  opcionActiva: { backgroundColor: '#ffcc80' },
  opcionTexto: { color: '#c77b00' },
  opcionTextoActivo: { color: '#000', fontWeight: 'bold' },

  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginTop: 10 },
  botonCalcular: { backgroundColor: '#ffcc80', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  botonCalcularTexto: { fontWeight: 'bold' },
  error: { color: '#e57373', fontWeight: 'bold', marginTop: 8 },

  resultado: { backgroundColor: '#f1f8e9', borderRadius: 8, padding: 10, marginTop: 10 },
  puntoTitulo: { fontWeight: 'bold', marginTop: 4 },
  puntoTexto: { color: '#555' },
  distancia: { color: '#2e7d32', fontWeight: 'bold', marginTop: 10 },
  nota: { color: '#888', fontSize: 12, marginTop: 6 },
});
