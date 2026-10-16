import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { cupones } from '../data/cupones';
import { useCarrito } from '../context/CarritoContext';

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
  const { items, subtotal, conEnvio, direccion, envio } = route.params;
  const { quitarSeleccionados } = useCarrito();

  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState(null);
  const [errorCupon, setErrorCupon] = useState('');

  const [medioPago, setMedioPago] = useState(null);
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [titular, setTitular] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');

  // ---- Cálculo del total ----
  let descuento = 0;
  let envioFinal = conEnvio && envio ? envio.costo : 0;

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
    if (encontrado.tipo === 'envioGratis' && !conEnvio) {
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

  // ---- Confirmar ----
  const confirmarCompra = () => {
    if (!medioPago) {
      Alert.alert('Falta el medio de pago', 'Elegí cómo querés pagar.');
      return;
    }
    if (medioPago !== 'rapipago') {
      const error = validarTarjeta();
      if (error) {
        Alert.alert('Revisá los datos', error);
        return;
      }
    }

    const detallePago =
      medioPago === 'rapipago'
        ? `Tu código de pago es ${generarCodigoRapipago()}. Abonalo en cualquier sucursal de Rapipago.`
        : 'Tu pago fue aprobado.';

    Alert.alert('¡Compra confirmada!', `${detallePago}\n\nTotal: $${total}`, [
      {
        text: 'Aceptar',
        onPress: () => {
          quitarSeleccionados();
          navigation.popToTop();
        },
      },
    ]);
  };

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

      {/* Entrega */}
      <View style={styles.caja}>
        <View style={styles.filaTitulo}>
          <Text style={styles.titulo}>Entrega</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Cambiar</Text>
          </TouchableOpacity>
        </View>
        {conEnvio ? (
          <View>
            <Text>📍 {direccion}</Text>
            {envio && (
              <Text style={styles.detalle}>
                {envio.distanciaKm.toFixed(1)} km — {envioFinal === 0 ? 'envío gratis' : `envío $${envioFinal}`}
              </Text>
            )}
          </View>
        ) : (
          <Text>Retiro en el local</Text>
        )}
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
        {MEDIOS_DE_PAGO.map((medio) => (
          <TouchableOpacity
            key={medio.id}
            style={[styles.opcionPago, medioPago === medio.id && styles.opcionPagoActiva]}
            onPress={() => setMedioPago(medio.id)}
          >
            <View style={[styles.radio, medioPago === medio.id && styles.radioActivo]} />
            <Text style={styles.opcionPagoTexto}>{medio.nombre}</Text>
          </TouchableOpacity>
        ))}

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
        {conEnvio && (
          <View style={styles.filaMonto}>
            <Text>Envío</Text>
            <Text>{envioFinal === 0 ? 'Gratis' : `$${envioFinal}`}</Text>
          </View>
        )}
        <View style={[styles.filaMonto, styles.filaTotal]}>
          <Text style={styles.totalTexto}>Total</Text>
          <Text style={styles.totalTexto}>${total}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.botonConfirmar} onPress={confirmarCompra}>
        <Text style={styles.botonConfirmarTexto}>Confirmar compra</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },

  caja: { backgroundColor: '#fff', marginHorizontal: 10, marginTop: 10, padding: 12, borderRadius: 10 },
  titulo: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: '#c77b00', fontWeight: 'bold' },
  detalle: { color: '#888', marginTop: 4 },

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

  formTarjeta: { marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  filaDos: { flexDirection: 'row', justifyContent: 'space-between' },
  inputMitad: { width: '48%' },
  aviso: { color: '#888', fontSize: 12 },
  infoRapipago: { color: '#555', marginTop: 4 },

  botonConfirmar: { backgroundColor: '#007bff', marginHorizontal: 10, marginVertical: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  botonConfirmarTexto: { color: '#fff', fontWeight: 'bold' },
});