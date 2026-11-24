// explicación del archivo: muestra las opciones de retiro o envío y reúne los datos necesarios para calcular el costo de entrega
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { calcularEnvio, UMBRAL_GRATIS_KM } from '../services/envio';

// Guarda todo el estado de la entrega (retiro o envío) y el cálculo del costo.
// "inicial" sirve para arrancar con lo que ya se eligió en otra pantalla.
export function useEntrega(inicial = {}, tarifaBase = 0) {
  const [conEnvio, setConEnvio] = useState(inicial.conEnvio || false);
  const [direccion, setDireccion] = useState(inicial.direccion || '');
  const [localidad, setLocalidad] = useState(inicial.localidad || '');
  const [envio, setEnvio] = useState(inicial.envio || null);
  const [calculando, setCalculando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  const calcular = async () => {
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
      const resultado = await calcularEnvio(direccion.trim(), localidad.trim());
      setEnvio({ ...resultado, costo: Number(resultado.costo || 0) + Math.max(0, Number(tarifaBase || 0)) });
    } catch (e) {
      setErrorEnvio(e.message || 'No pudimos calcular el envío. Probá de nuevo.');
    } finally {
      setCalculando(false);
    }
  };

  // Si el cliente cambia la dirección, el cálculo anterior ya no vale
  const cambiarDireccion = (texto) => {
    setDireccion(texto);
    setEnvio(null);
  };
  const cambiarLocalidad = (texto) => {
    setLocalidad(texto);
    setEnvio(null);
  };

  return {
    conEnvio,
    setConEnvio,
    direccion,
    localidad,
    envio,
    calculando,
    errorEnvio,
    calcular,
    cambiarDireccion,
    cambiarLocalidad,
  };
}

export default function EntregaEnvio({ entrega, envioHabilitado = true, tarifaBase = 0 }) {
  const {
    conEnvio,
    setConEnvio,
    direccion,
    localidad,
    envio,
    calculando,
    errorEnvio,
    calcular,
    cambiarDireccion,
    cambiarLocalidad,
  } = entrega;

  return (
    <View>
      <Text style={styles.titulo}>Entrega</Text>

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
            onChangeText={cambiarDireccion}
          />
          <TextInput
            style={styles.input}
            placeholder="Localidad (ej: Lanús)"
            value={localidad}
            onChangeText={cambiarLocalidad}
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

const styles = StyleSheet.create({
  titulo: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
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
