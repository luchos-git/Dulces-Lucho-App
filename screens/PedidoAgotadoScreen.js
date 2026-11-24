import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const fechaISO = (fecha = new Date()) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
const mananaISO = () => { const f = new Date(); f.setDate(f.getDate() + 1); return fechaISO(f); };
const METODOS = [
  { id: 'credito', texto: 'Tarjeta de crédito' },
  { id: 'debito', texto: 'Tarjeta de débito' },
  { id: 'rapipago', texto: 'Rapipago' },
];

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00`);
  return !Number.isNaN(fecha.getTime()) && fechaISO(fecha) === valor;
}

export default function PedidoAgotadoScreen({ route, navigation }) {
  const producto = route.params?.producto;
  const { usuario } = useAuth();
  const [cantidad, setCantidad] = useState('1');
  const [fechaDeseada, setFechaDeseada] = useState(mananaISO());
  const [modalidadEntrega, setModalidadEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [metodoPago, setMetodoPago] = useState('credito');
  const [notas, setNotas] = useState('');
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [metodosHabilitados, setMetodosHabilitados] = useState({ credito: true, debito: true, rapipago: true });
  const [envioHabilitado, setEnvioHabilitado] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      api(`/productos/${producto?.id}/disponibilidad`),
      api('/configuracion-tienda').catch(() => null),
      api(`/usuarios/${usuario?.id}/preferencias`).catch(() => null),
    ]).then(([estado, tienda, preferencias]) => {
      if (!vigente) return;
      setDisponibilidad(estado);
      if (tienda?.metodosPago) {
        setMetodosHabilitados(tienda.metodosPago);
        const primerMedio = METODOS.find((m) => tienda.metodosPago[m.id])?.id;
        if (primerMedio) setMetodoPago((actual) => (tienda.metodosPago[actual] ? actual : primerMedio));
      }
      if (typeof tienda?.envioHabilitado === 'boolean') {
        setEnvioHabilitado(tienda.envioHabilitado);
        if (!tienda.envioHabilitado) setModalidadEntrega('retiro');
      }
      if (preferencias?.direccion) setDireccion(preferencias.direccion);
      if (preferencias?.localidad) setLocalidad(preferencias.localidad);
      if (preferencias?.metodoPagoPreferido && (tienda?.metodosPago?.[preferencias.metodoPagoPreferido] ?? true)) setMetodoPago(preferencias.metodoPagoPreferido);
      if (estado?.stockDisponible > 0) {
        Alert.alert('El producto volvió a estar disponible', 'Podés volver a su ficha y comprarlo normalmente.');
      }
    }).catch((error) => {
      if (vigente) Alert.alert('No se pudo consultar la reposición', error.message);
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [producto?.id, usuario?.id]);

  const metodosDisponibles = useMemo(() => METODOS.filter((m) => metodosHabilitados[m.id]), [metodosHabilitados]);
  const fechaEstimadaTexto = disponibilidad?.fechaEstimada
    ? String(disponibilidad.fechaEstimada).slice(0, 10)
    : 'A confirmar';

  const enviar = async () => {
    const unidades = Number(cantidad);
    if (!Number.isInteger(unidades) || unidades < 1 || unidades > 100) {
      Alert.alert('Cantidad inválida', 'Ingresá una cantidad entre 1 y 100.'); return;
    }
    if (!fechaValida(fechaDeseada) || fechaDeseada < fechaISO()) {
      Alert.alert('Fecha inválida', 'Ingresá una fecha válida de hoy en adelante con formato AAAA-MM-DD.'); return;
    }
    if (!metodoPago || !metodosHabilitados[metodoPago]) {
      Alert.alert('Medio de pago', 'Elegí un medio de pago habilitado por la tienda.'); return;
    }
    if (modalidadEntrega === 'envio' && (!direccion.trim() || !localidad.trim())) {
      Alert.alert('Faltan los datos de entrega', 'Completá dirección y localidad para el envío.'); return;
    }
    if (Number(disponibilidad?.stockDisponible || 0) > 0) {
      Alert.alert('Ya hay stock', 'El producto volvió a estar disponible. Volvé a su ficha para agregarlo al carrito.');
      navigation.goBack();
      return;
    }

    setGuardando(true);
    try {
      const pedido = await api('/pedidos-anticipados', {
        method: 'POST',
        body: JSON.stringify({
          usuarioId: usuario.id,
          productoId: Number(producto.id),
          cantidad: unidades,
          fechaDeseada,
          modalidadEntrega,
          direccion: modalidadEntrega === 'envio' ? direccion.trim() : '',
          localidad: modalidadEntrega === 'envio' ? localidad.trim() : '',
          metodoPago,
          notas: notas.trim(),
        }),
      });
      Alert.alert(
        'Solicitud registrada',
        `Tu solicitud ${pedido.numero} quedó registrada.\nLlegada estimada: ${pedido.fechaEstimada || fechaEstimadaTexto} (${pedido.diasEstimados ?? disponibilidad?.diasEstimados ?? '—'} días).\nLa tienda te confirmará la disponibilidad y el pago antes de preparar la entrega.`,
        [{ text: 'Ver mis pedidos', onPress: () => navigation.navigate('MisPedidos') }]
      );
    } catch (error) {
      Alert.alert('No se pudo registrar el pedido', error.message);
    } finally { setGuardando(false); }
  };

  if (!producto) return <View style={styles.centrado}><Text>No se encontró el producto.</Text></View>;

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Realizar pedido</Text>
        <Text style={styles.nombreProducto}>{producto.nombre}</Text>
        <Text style={styles.precio}>${Number(producto.precio || 0).toFixed(0)}</Text>
        <View style={styles.etiquetaAgotado}><Text style={styles.textoAgotado}>AGOTADO</Text></View>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>¿Cuándo podría llegar?</Text>
        {cargando ? <ActivityIndicator color="#A86616" /> : (
          <>
            <Text style={styles.eta}>{disponibilidad?.diasEstimados ?? producto.diasReposicionEstimados ?? 7} días aproximadamente</Text>
            <Text style={styles.ayuda}>Fecha estimada: {fechaEstimadaTexto}</Text>
            <Text style={styles.ayuda}>{disponibilidad?.proveedor ? `Proveedor habitual: ${disponibilidad.proveedor}` : 'La tienda todavía debe confirmar el proveedor y la fecha de reposición.'}</Text>
          </>
        )}
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Datos de tu pedido</Text>
        <Text style={styles.label}>Cantidad</Text>
        <TextInput style={styles.input} value={cantidad} onChangeText={(v) => setCantidad(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="1" />
        <Text style={styles.label}>¿Para qué fecha lo necesitás? (AAAA-MM-DD)</Text>
        <TextInput style={styles.input} value={fechaDeseada} onChangeText={setFechaDeseada} placeholder="2026-12-01" />

        <Text style={styles.label}>Entrega</Text>
        <View style={styles.filaChips}>
          <TouchableOpacity style={[styles.chip, modalidadEntrega === 'retiro' && styles.chipActivo]} onPress={() => setModalidadEntrega('retiro')}><Text style={styles.textoChip}>Retiro en el local</Text></TouchableOpacity>
          {envioHabilitado && <TouchableOpacity style={[styles.chip, modalidadEntrega === 'envio' && styles.chipActivo]} onPress={() => setModalidadEntrega('envio')}><Text style={styles.textoChip}>Envío a domicilio</Text></TouchableOpacity>}
        </View>
        {!envioHabilitado && <Text style={styles.ayuda}>Por ahora la tienda solo permite retirar en el local.</Text>}
        {modalidadEntrega === 'envio' && <>
          <Text style={styles.label}>Dirección</Text>
          <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} placeholder="Calle y altura" maxLength={200} />
          <Text style={styles.label}>Localidad</Text>
          <TextInput style={styles.input} value={localidad} onChangeText={setLocalidad} placeholder="Tu localidad" maxLength={100} />
        </>}

        <Text style={styles.label}>Medio de pago preferido</Text>
        <View style={styles.filaChips}>
          {metodosDisponibles.map((m) => <TouchableOpacity key={m.id} style={[styles.chip, metodoPago === m.id && styles.chipActivo]} onPress={() => setMetodoPago(m.id)}><Text style={styles.textoChip}>{m.texto}</Text></TouchableOpacity>)}
          {!metodosDisponibles.length && <Text style={styles.ayuda}>La tienda todavía no habilitó medios de pago.</Text>}
        </View>
        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput style={[styles.input, styles.inputNotas]} value={notas} onChangeText={setNotas} placeholder="Aclaraciones para la tienda" multiline maxLength={500} />
      </View>

      <Text style={styles.legal}>Esta solicitud no cobra el pedido ni reserva stock todavía. La tienda confirmará la reposición, el plazo y el pago cuando el proveedor responda.</Text>
      <TouchableOpacity style={[styles.boton, (guardando || cargando || !metodosDisponibles.length) && styles.botonInactivo]} onPress={enviar} disabled={guardando || cargando || !metodosDisponibles.length}>
        <Text style={styles.textoBoton}>{guardando ? 'Registrando solicitud…' : 'Enviar pedido'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 15, paddingBottom: 38 }, centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E1' },
  encabezado: { backgroundColor: '#FFE8C5', borderRadius: 13, padding: 17, marginBottom: 12 }, titulo: { color: '#493116', fontSize: 22, fontWeight: 'bold' }, nombreProducto: { color: '#38240D', fontSize: 17, fontWeight: 'bold', marginTop: 8 }, precio: { color: '#A86616', fontSize: 19, fontWeight: 'bold', marginTop: 4 },
  etiquetaAgotado: { backgroundColor: '#8A2D20', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, marginTop: 9 }, textoAgotado: { color: '#fff', fontWeight: '900', letterSpacing: 1 }, tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 }, subtitulo: { color: '#493116', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }, eta: { color: '#A86616', fontSize: 20, fontWeight: 'bold' }, ayuda: { color: '#806B4E', fontSize: 12, lineHeight: 18, marginTop: 4 },
  label: { color: '#66533D', fontSize: 12, marginTop: 9, marginBottom: 5 }, input: { borderWidth: 1, borderColor: '#E8D9C2', backgroundColor: '#FFFCF7', padding: 11, borderRadius: 8, color: '#38240D' }, inputNotas: { minHeight: 72, textAlignVertical: 'top' }, filaChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }, chip: { borderWidth: 1, borderColor: '#E7C48D', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8, marginRight: 7, marginBottom: 7 }, chipActivo: { backgroundColor: '#FFD995', borderColor: '#D99B3C' }, textoChip: { color: '#65420F', fontSize: 12, fontWeight: '600' },
  legal: { color: '#806B4E', fontSize: 11, lineHeight: 17, marginHorizontal: 3, marginBottom: 12 }, boton: { backgroundColor: '#E8A23A', borderRadius: 9, padding: 14, alignItems: 'center' }, botonInactivo: { opacity: 0.5 }, textoBoton: { color: '#38240D', fontWeight: 'bold', fontSize: 15 },
});
