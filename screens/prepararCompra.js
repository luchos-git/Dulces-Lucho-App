// explicación del archivo: reúne los datos de entrega, cupón y medio de pago y crea el pedido dentro de la app
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { cupones } from '../data/cupones';
import { useCarrito } from '../context/CarritoContext';
import EntregaEnvio, { useEntrega } from '../components/EntregaEnvio';
import { usePedido } from '../context/PedidoContext';
import { pedirPermisoNotificaciones, notificarEstadoPedido } from '../services/notificaciones';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const MEDIOS_DE_PAGO = [
  { id: 'credito', nombre: 'Tarjeta de crédito' },
  { id: 'debito', nombre: 'Tarjeta de débito' },
  { id: 'rapipago', nombre: 'Rapipago (efectivo)' },
];

const formatearNumero = (texto) =>
  texto.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const formatearVencimiento = (texto) => {
  const soloNumeros = texto.replace(/\D/g, '').slice(0, 4);
  if (soloNumeros.length <= 2) return soloNumeros;
  return soloNumeros.slice(0, 2) + '/' + soloNumeros.slice(2);
};

const generarCodigoRapipago = () =>
  Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
    .join('')
    .replace(/(.{4})/g, '$1 ')
    .trim();

export default function PrepararCompra({ route, navigation }) {
  const { items, subtotal, comprarAhora, entrega: entregaInicial } = route.params;
  const { usuario } = useAuth();
  const { quitarSeleccionados } = useCarrito();
  const { crearPedido } = usePedido();
  const [envioHabilitado, setEnvioHabilitado] = useState(true);
  const [costoEnvioBase, setCostoEnvioBase] = useState(0);

  // La entrega arranca con lo que se eligió antes (carrito o "Comprar ahora") y se puede cambiar acá.
  const entrega = useEntrega(entregaInicial, costoEnvioBase);

  // datos que se ingresan para aplicar descuentos y seleccionar el medio de pago
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState(null);
  const [errorCupon, setErrorCupon] = useState('');

  const [medioPago, setMedioPago] = useState(null);
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [titular, setTitular] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [mediosPago, setMediosPago] = useState({ credito: true, debito: true, rapipago: true });
  const [notificacionesActivas, setNotificacionesActivas] = useState(true);
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);

  // Recupera el medio de pago y la dirección guardados en Mi configuración.
  useEffect(() => {
    let vigente = true;
    Promise.all([api('/configuracion-tienda'), api(`/usuarios/${usuario.id}/preferencias`)])
      .then(([tienda, prefs]) => {
        if (!vigente) return;
        const disponibles = tienda.metodosPago || { credito: true, debito: true, rapipago: true };
        setMediosPago(disponibles);
        setEnvioHabilitado(Boolean(tienda.envioHabilitado));
        setCostoEnvioBase(Number(tienda.costoEnvioBase || 0));
        if (!tienda.envioHabilitado) entrega.setConEnvio(false);
        if (prefs.metodoPagoPreferido && disponibles[prefs.metodoPagoPreferido]) setMedioPago(prefs.metodoPagoPreferido);
        if (!entregaInicial?.direccion && prefs.direccion) entrega.cambiarDireccion(prefs.direccion);
        if (!entregaInicial?.localidad && prefs.localidad) entrega.cambiarLocalidad(prefs.localidad);
        setNotificacionesActivas(Boolean(prefs.notificacionesActivas));
      })
      .catch((error) => console.warn('No se pudieron recuperar las preferencias de compra:', error.message))
      .finally(() => { if (vigente) setCargandoPreferencias(false); });
    return () => { vigente = false; };
  }, [usuario?.id]);

  // ---- Cálculo del total ----
  let descuento = 0;
  let envioFinal = entrega.conEnvio && entrega.envio ? entrega.envio.costo : 0;

  if (cuponAplicado) {
    if (cuponAplicado.tipo === 'porcentaje') {
      descuento = Math.round((subtotal * cuponAplicado.valor) / 100);
    }
    if (cuponAplicado.tipo === 'monto') {
      descuento = Math.min(cuponAplicado.valor, subtotal);
    }
    if (cuponAplicado.tipo === 'envioGratis') {
      envioFinal = 0;
    }
  }
  const total = subtotal - descuento + envioFinal;

  // ---- Cupón ----
  const aplicarCupon = () => {
    const codigo = codigoCupon.trim().toUpperCase();
    if (!codigo) {
      setErrorCupon('Escribí un código.');
      return;
    }
    const encontrado = cupones.find((c) => c.codigo === codigo);
    if (!encontrado) {
      setErrorCupon('Ese cupón no existe o venció.');
      return;
    }
    if (encontrado.tipo === 'envioGratis' && !entrega.conEnvio) {
      setErrorCupon('Este cupón solo sirve con envío a domicilio.');
      return;
    }
    setCuponAplicado(encontrado);
    setErrorCupon('');
    setCodigoCupon('');
  };

  // ---- Validación de tarjeta ----
  const validarTarjeta = () => {
    if (numeroTarjeta.replace(/\s/g, '').length !== 16) {
      return 'El número de tarjeta debe tener 16 dígitos.';
    }
    if (!titular.trim()) {
      return 'Escribí el nombre que figura en la tarjeta.';
    }
    const [mes, anio] = vencimiento.split('/');
    if (!mes || !anio || anio.length !== 2 || Number(mes) < 1 || Number(mes) > 12) {
      return 'El vencimiento debe tener el formato MM/AA.';
    }
    const primerDiaDelMesSiguiente = new Date(2000 + Number(anio), Number(mes), 1);
    if (primerDiaDelMesSiguiente <= new Date()) {
      return 'La tarjeta está vencida.';
    }
    if (cvv.length < 3) {
      return 'El código de seguridad debe tener 3 o 4 dígitos.';
    }
    return null;
  };

  // Los datos de tarjeta se validan para la demostración, pero nunca se envían ni se guardan.
  // La compra sí se registra en MySQL para que el cliente y administración compartan el historial.
  const confirmarCompra = () => {
    if (!medioPago || !mediosPago[medioPago]) {
      Alert.alert('Falta el medio de pago', 'Elegí un medio de pago habilitado por la tienda.');
      return;
    }
    if (entrega.conEnvio && !entrega.envio) {
      Alert.alert('Falta el envío', 'Calculá el costo de envío antes de confirmar.');
      return;
    }
    if (medioPago !== 'rapipago') {
      const error = validarTarjeta();
      if (error) {
        Alert.alert('Revisá los datos de la tarjeta', error);
        return;
      }
    }

    const codigoRapipago = medioPago === 'rapipago' ? generarCodigoRapipago() : null;
    Alert.alert(
      'Confirmar compra',
      `Total estimado: $${total}\n\n¿Querés registrar el pedido?`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const venta = await api('/ventas', {
                method: 'POST',
                body: JSON.stringify({
                  usuarioId: usuario.id,
                  items: items.map((i) => ({ id: i.id, cantidad: i.cantidad })),
                  metodoPago,
                  codigoCupon: cuponAplicado?.codigo || '',
                  codigoRapipago,
                  conEnvio: Boolean(entrega.conEnvio),
                  direccion: entrega.conEnvio ? entrega.direccion : '',
                  localidad: entrega.conEnvio ? entrega.localidad : '',
                  distanciaKm: entrega.conEnvio && entrega.envio ? entrega.envio.distanciaKm : null,
                  costoEnvio: entrega.conEnvio ? envioFinal : 0,
                }),
              });

              if (!comprarAhora) quitarSeleccionados();
              const avisosActivados = notificacionesActivas ? await pedirPermisoNotificaciones() : false;
              const pedido = crearPedido({ ...venta, avisosActivados, estado: venta.estadoPedido || venta.estado || 'confirmado', estadoPedido: venta.estadoPedido || venta.estado || 'confirmado' });
              if (avisosActivados) await notificarEstadoPedido(venta.numero, 'confirmado');

              const mensaje = venta.codigoRapipago
                ? `Pedido #${venta.numero} registrado. Código de Rapipago: ${venta.codigoRapipago}.`
                : `Pedido #${venta.numero} registrado correctamente.`;
              Alert.alert('¡Pedido registrado!', `${mensaje}\nTotal: $${Number(venta.total).toFixed(2)}`, [
                { text: 'Ver mi pedido', onPress: () => navigation.reset({ index: 1, routes: [{ name: 'Inicio' }, { name: 'Seguimiento', params: { pedidoId: pedido.id } }] }) },
              ]);
            } catch (error) {
              Alert.alert('No se pudo registrar la compra', error.message || 'Revisá la conexión con el backend e intentá nuevamente.');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  // controla si ya se eligió una forma de pago para habilitar la confirmación
  const puedeConfirmar = medioPago !== null && Boolean(mediosPago[medioPago]) && !cargandoPreferencias;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Resumen del pedido */}
      <View style={styles.caja}>
        <Text style={styles.titulo}>Tu pedido</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.filaMonto}>
            <Text style={styles.nombreItem} numberOfLines={1}>
              {item.cantidad} x {item.nombre}
            </Text>
            <Text>${item.precio * item.cantidad}</Text>
          </View>
        ))}
      </View>

      {/* Entrega (retiro o envío, con origen y destino) */}
      <View style={styles.caja}>
        <EntregaEnvio entrega={entrega} envioHabilitado={envioHabilitado} tarifaBase={costoEnvioBase} />
        {!envioHabilitado && <Text style={styles.avisoPago}>La tienda no tiene habilitado el envío a domicilio.</Text>}
      </View>

      {/* Cupón */}
      <View style={styles.caja}>
        <Text style={styles.titulo}>Cupón de descuento</Text>
        {cuponAplicado ? (
          <View style={styles.cuponAplicado}>
            <Text style={styles.cuponAplicadoTexto}>
              🎟️ {cuponAplicado.codigo}: {cuponAplicado.descripcion}
            </Text>
            <TouchableOpacity onPress={() => setCuponAplicado(null)}>
              <Text style={styles.link}>Quitar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.filaCupon}>
            <TextInput
              style={styles.inputCupon}
              placeholder="Código de cupón"
              autoCapitalize="characters"
              value={codigoCupon}
              onChangeText={(texto) => {
                setCodigoCupon(texto);
                setErrorCupon('');
              }}
            />
            <TouchableOpacity style={styles.botonAplicar} onPress={aplicarCupon}>
              <Text style={styles.botonAplicarTexto}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        )}
        {errorCupon !== '' && <Text style={styles.errorCupon}>{errorCupon}</Text>}
      </View>

      {/* Medio de pago */}
      <View style={styles.caja}>
        <Text style={styles.titulo}>Medio de pago</Text>
        {MEDIOS_DE_PAGO.filter((medio) => mediosPago[medio.id]).map((medio) => (
          <TouchableOpacity
            key={medio.id}
            style={[styles.opcionPago, medioPago === medio.id && styles.opcionPagoActiva]}
            onPress={() => setMedioPago(medio.id)}
          >
            <View style={[styles.radio, medioPago === medio.id && styles.radioActivo]} />
            <Text style={styles.opcionPagoTexto}>{medio.nombre}</Text>
          </TouchableOpacity>
        ))}

        {cargandoPreferencias && <Text style={styles.avisoPago}>Cargando medios habilitados...</Text>}
        {!cargandoPreferencias && !MEDIOS_DE_PAGO.some((medio) => mediosPago[medio.id]) && <Text style={styles.avisoPago}>La tienda no tiene medios de pago habilitados en este momento.</Text>}
        {!medioPago && <Text style={styles.avisoPago}>Elegí un medio de pago para poder confirmar la compra.</Text>}

        {(medioPago === 'credito' || medioPago === 'debito') && (
          <View style={styles.formTarjeta}>
            <TextInput
              style={styles.input}
              placeholder="Número de tarjeta"
              keyboardType="number-pad"
              value={numeroTarjeta}
              onChangeText={(texto) => setNumeroTarjeta(formatearNumero(texto))}
              maxLength={19}
            />
            <TextInput
              style={styles.input}
              placeholder="Nombre del titular"
              autoCapitalize="characters"
              value={titular}
              onChangeText={setTitular}
            />
            <View style={styles.filaDos}>
              <TextInput
                style={[styles.input, styles.inputMitad]}
                placeholder="MM/AA"
                keyboardType="number-pad"
                value={vencimiento}
                onChangeText={(texto) => setVencimiento(formatearVencimiento(texto))}
                maxLength={5}
              />
              <TextInput
                style={[styles.input, styles.inputMitad]}
                placeholder="CVV"
                keyboardType="number-pad"
                secureTextEntry
                value={cvv}
                onChangeText={(texto) => setCvv(texto.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
              />
            </View>
            <Text style={styles.aviso}>Prototipo: estos datos no se guardan ni se envían a ningún lado.</Text>
          </View>
        )}

        {medioPago === 'rapipago' && (
          <Text style={styles.infoRapipago}>
            Al confirmar te damos un código de pago para abonar en efectivo en cualquier sucursal de Rapipago.
          </Text>
        )}
      </View>

      {/* Totales */}
      <View style={styles.caja}>
        <View style={styles.filaMonto}>
          <Text>Subtotal</Text>
          <Text>${subtotal}</Text>
        </View>
        {descuento > 0 && (
          <View style={styles.filaMonto}>
            <Text>Descuento ({cuponAplicado.codigo})</Text>
            <Text style={styles.descuento}>-${descuento}</Text>
          </View>
        )}
        {entrega.conEnvio && (
          <View style={styles.filaMonto}>
            <Text>Envío</Text>
            <Text>
              {entrega.envio ? (envioFinal === 0 ? 'Gratis' : `$${envioFinal}`) : 'Sin calcular'}
            </Text>
          </View>
        )}
        <View style={[styles.filaMonto, styles.filaTotal]}>
          <Text style={styles.totalTexto}>Total</Text>
          <Text style={styles.totalTexto}>${total}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.botonConfirmar, !puedeConfirmar && styles.botonConfirmarInactivo]}
        onPress={confirmarCompra}
        disabled={!puedeConfirmar}
      >
        <Text style={styles.botonConfirmarTexto}>
          {puedeConfirmar ? 'Confirmar compra' : 'Elegí un medio de pago'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },

  caja: { backgroundColor: '#fff', marginHorizontal: 10, marginTop: 10, padding: 12, borderRadius: 10 },
  titulo: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  link: { color: '#c77b00', fontWeight: 'bold' },

  filaMonto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nombreItem: { flex: 1, marginRight: 10 },
  descuento: { color: '#2e7d32', fontWeight: 'bold' },
  filaTotal: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 },
  totalTexto: { fontWeight: 'bold', fontSize: 16 },

  filaCupon: { flexDirection: 'row', alignItems: 'center' },
  inputCupon: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 8 },
  botonAplicar: { backgroundColor: '#ffcc80', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  botonAplicarTexto: { fontWeight: 'bold' },
  cuponAplicado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8 },
  cuponAplicadoTexto: { flex: 1, marginRight: 10, color: '#2e7d32', fontWeight: 'bold' },
  errorCupon: { color: '#e57373', fontWeight: 'bold', marginTop: 6 },

  opcionPago: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffcc80', borderRadius: 8, padding: 12, marginBottom: 8 },
  opcionPagoActiva: { backgroundColor: '#fff3e0', borderColor: '#c77b00' },
  opcionPagoTexto: { marginLeft: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#c77b00' },
  radioActivo: { backgroundColor: '#c77b00' },
  avisoPago: { color: '#e57373', fontWeight: 'bold', marginTop: 2 },

  formTarjeta: { marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  filaDos: { flexDirection: 'row', justifyContent: 'space-between' },
  inputMitad: { width: '48%' },
  aviso: { color: '#888', fontSize: 12 },
  infoRapipago: { color: '#555', marginTop: 4 },

  botonConfirmar: { backgroundColor: '#007bff', marginHorizontal: 10, marginVertical: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  botonConfirmarInactivo: { backgroundColor: '#b0bec5' },
  botonConfirmarTexto: { color: '#fff', fontWeight: 'bold' },
});
