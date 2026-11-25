import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text, ThemedTextInput as TextInput } from '../context/ThemeContext';
import { createThemedStyles } from '../context/ThemeContext';
// Reúne entrega, cupón, medio de pago y confirmación de la compra.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, Alert, Switch } from 'react-native';
import { cupones } from '../data/cupones';
import { useCarrito } from '../context/CarritoContext';
import EntregaEnvio, { useEntrega } from '../components/EntregaEnvio';
import { usePedido } from '../context/PedidoContext';
import { pedirPermisoNotificaciones, notificarEstadoPedido } from '../services/notificaciones';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const MEDIOS_DE_PAGO = [
  { id: 'credito', nombre: 'Tarjeta de crédito', grupo: 'tarjeta' },
  { id: 'debito', nombre: 'Tarjeta de débito', grupo: 'tarjeta' },
  { id: 'mercado_pago', nombre: 'Mercado Pago', grupo: 'billetera' },
  { id: 'cuenta_dni', nombre: 'Cuenta DNI', grupo: 'billetera' },
  { id: 'modo', nombre: 'MODO', grupo: 'billetera' },
  { id: 'naranja_x', nombre: 'Naranja X', grupo: 'billetera' },
  { id: 'uala', nombre: 'Ualá', grupo: 'billetera' },
  { id: 'transferencia', nombre: 'Transferencia bancaria', grupo: 'otro' },
  { id: 'rapipago', nombre: 'Rapipago (efectivo)', grupo: 'otro' },
];

const generarCodigoRapipago = () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('').replace(/(.{4})/g, '$1 ').trim();
const estaHabilitado = (valor) => valor === true || Number(valor) === 1;
const esPredeterminado = (registro) => registro?.esPredeterminado === true || Number(registro?.esPredeterminado) === 1;

export default function PrepararCompra({ route, navigation }) {
  const { items = [], subtotal = 0, comprarAhora, entrega: entregaInicial, medioPagoInicial, medioPagoUsuarioIdInicial, medioPagoGuardadoInicial } = route.params || {};
  const { usuario } = useAuth();
  const { quitarSeleccionados } = useCarrito();
  const { crearPedido } = usePedido();
  const [envioHabilitado, setEnvioHabilitado] = useState(true);
  const [costoEnvioBase, setCostoEnvioBase] = useState(0);
  const entrega = useEntrega(entregaInicial, costoEnvioBase);

  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState(null);
  const [errorCupon, setErrorCupon] = useState('');
  const [medioPago, setMedioPago] = useState(medioPagoInicial || null);
  const [medioPagoUsuarioId, setMedioPagoUsuarioId] = useState(medioPagoUsuarioIdInicial || null);
  const [mediosPago, setMediosPago] = useState({});
  const [metodosGuardados, setMetodosGuardados] = useState([]);
  const [direcciones, setDirecciones] = useState([]);
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState(null);
  const [direccionAlias, setDireccionAlias] = useState('');
  const [direccionDestinatario, setDireccionDestinatario] = useState('');
  const [instruccionesEntrega, setInstruccionesEntrega] = useState('');
  const [guardarDireccionNueva, setGuardarDireccionNueva] = useState(false);
  const [aliasDireccionNueva, setAliasDireccionNueva] = useState('Casa');
  const [notificacionesActivas, setNotificacionesActivas] = useState(true);
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const salidaAutorizadaRef = useRef(false);
  const dialogoSalidaAbiertoRef = useRef(false);
  const compraRegistradaRef = useRef(false);

  // Si el usuario intenta volver o salir durante la preparación, pide confirmación.
  // Los productos permanecen en el carrito; los datos aún no confirmados del checkout no se guardan.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (evento) => {
      if (salidaAutorizadaRef.current || compraRegistradaRef.current || !items.length) return;
      evento.preventDefault();
      if (dialogoSalidaAbiertoRef.current) return;
      dialogoSalidaAbiertoRef.current = true;
      Alert.alert(
        '¿Seguro que querés salir?',
        'Al salir no se guardará tu pedido. Los productos seguirán en tu carrito.',
        [
          { text: 'Seguir con la compra', style: 'cancel', onPress: () => { dialogoSalidaAbiertoRef.current = false; } },
          { text: 'Salir', style: 'destructive', onPress: () => {
            dialogoSalidaAbiertoRef.current = false;
            salidaAutorizadaRef.current = true;
            navigation.dispatch(evento.data.action);
          } },
        ],
        { cancelable: false, onDismiss: () => { dialogoSalidaAbiertoRef.current = false; } }
      );
    });
    return unsubscribe;
  }, [navigation, items.length]);

  const metodosDisponibles = useMemo(() => MEDIOS_DE_PAGO.filter((m) => estaHabilitado(mediosPago[m.id])), [mediosPago]);
  const tarjetasDisponibles = metodosGuardados.filter((m) => m.tipo === 'credito' || m.tipo === 'debito');
  const perfilesMedioSeleccionado = metodosGuardados.filter((m) => m.tipo === medioPago);

  const aplicarDireccion = (d) => {
    setDireccionSeleccionadaId(d.id);
    setDireccionAlias(d.alias || '');
    setDireccionDestinatario(d.destinatario || '');
    setInstruccionesEntrega(d.detalle || '');
    entrega.setConEnvio(true);
    entrega.cambiarDireccion(d.direccion || '');
    entrega.cambiarLocalidad(d.localidad || '');
  };

  const cargarPreferenciasCompra = async () => {
    // La tienda es necesaria para habilitar medios de pago. Las direcciones,
    // preferencias y tarjetas son complementarias: un fallo en una no bloquea las demás.
    const [tiendaResultado, prefsResultado, dirsResultado, metodosResultado] = await Promise.allSettled([
      api('/configuracion-tienda'),
      api(`/usuarios/${usuario.id}/preferencias`),
      api(`/usuarios/${usuario.id}/direcciones`),
      api(`/usuarios/${usuario.id}/metodos-pago`),
    ]);

    if (tiendaResultado.status !== 'fulfilled') throw tiendaResultado.reason;

    const tienda = tiendaResultado.value || {};
    const prefs = prefsResultado.status === 'fulfilled' ? (prefsResultado.value || {}) : {};
    const dirs = dirsResultado.status === 'fulfilled' ? dirsResultado.value : [];
    const metodos = metodosResultado.status === 'fulfilled' ? metodosResultado.value : [];

    if (prefsResultado.status === 'rejected') console.warn('No se pudieron cargar las preferencias:', prefsResultado.reason?.message);
    if (dirsResultado.status === 'rejected') console.warn('No se pudieron cargar las direcciones guardadas:', dirsResultado.reason?.message);
    if (metodosResultado.status === 'rejected') console.warn('No se pudieron cargar los medios de pago guardados:', metodosResultado.reason?.message);

    const disponibles = tienda.metodosPago || {};
    setMediosPago(disponibles);
    setEnvioHabilitado(Boolean(tienda.envioHabilitado));
    setCostoEnvioBase(Number(tienda.costoEnvioBase || 0));
    if (!tienda.envioHabilitado) entrega.setConEnvio(false);

    const listaDirecciones = Array.isArray(dirs) ? dirs : [];
    const listaMetodos = Array.isArray(metodos) ? [...metodos] : [];
    if (medioPagoGuardadoInicial && !listaMetodos.some((m) => Number(m.id) === Number(medioPagoGuardadoInicial.id))) {
      listaMetodos.push(medioPagoGuardadoInicial);
    }
    setDirecciones(listaDirecciones);
    setMetodosGuardados(listaMetodos);

    // Respeta el medio elegido, luego la preferencia de la cuenta y después
    // el perfil guardado. Si esos datos no están disponibles, elige uno habilitado.
    const perfilPreferido = listaMetodos.find((m) => esPredeterminado(m) && estaHabilitado(disponibles[m.tipo]))
      || listaMetodos.find((m) => estaHabilitado(disponibles[m.tipo]));
    const metodoCarritoValido = medioPagoInicial
      && estaHabilitado(disponibles[medioPagoInicial])
      && (!['credito', 'debito'].includes(medioPagoInicial)
        || listaMetodos.some((m) => m.tipo === medioPagoInicial));
    const preferenciaCuentaValida = prefs.metodoPagoPreferido
      && estaHabilitado(disponibles[prefs.metodoPagoPreferido])
      && (!['credito', 'debito'].includes(prefs.metodoPagoPreferido)
        || listaMetodos.some((m) => m.tipo === prefs.metodoPagoPreferido));
    const metodoDelPerfilValido = perfilPreferido?.tipo && estaHabilitado(disponibles[perfilPreferido.tipo]);
    const metodosHabilitados = MEDIOS_DE_PAGO.filter((m) => estaHabilitado(disponibles[m.id]));
    // Si no se pudo recuperar una preferencia ni una tarjeta guardada, evitar
    // seleccionar crédito/débito como respaldo porque esos medios requieren tarjeta registrada.
    const primerMetodoHabilitado = metodosHabilitados.find((m) => !['credito', 'debito'].includes(m.id))
      || metodosHabilitados[0];
    const metodoPreferido = metodoCarritoValido
      ? medioPagoInicial
      : preferenciaCuentaValida
        ? prefs.metodoPagoPreferido
        : metodoDelPerfilValido
          ? perfilPreferido.tipo
          : primerMetodoHabilitado?.id || '';

    if (metodoPreferido) {
      setMedioPago(metodoPreferido);
      const perfilInicial = Number(medioPagoUsuarioIdInicial) > 0
        ? listaMetodos.find((m) => Number(m.id) === Number(medioPagoUsuarioIdInicial) && m.tipo === metodoPreferido)
        : null;
      const perfil = perfilInicial
        || listaMetodos.find((m) => m.tipo === metodoPreferido && esPredeterminado(m))
        || listaMetodos.find((m) => m.tipo === metodoPreferido);
      setMedioPagoUsuarioId(perfil?.id || null);
    } else {
      setMedioPago(null);
      setMedioPagoUsuarioId(null);
    }

    // Conserva la dirección elegida en el carrito o aplica la predeterminada.
    const direccionElegidaEnCarrito = entregaInicial?.direccionGuardada
      || (entregaInicial?.direccionGuardadaId
        ? listaDirecciones.find((d) => String(d.id) === String(entregaInicial.direccionGuardadaId))
        : null);
    const direccionPrincipal = listaDirecciones.find(esPredeterminado) || listaDirecciones[0];
    const direccionParaAplicar = direccionElegidaEnCarrito
      || (!entregaInicial?.direccion ? direccionPrincipal : null);

    if (direccionParaAplicar) {
      aplicarDireccion(direccionParaAplicar);
    } else if (!entregaInicial?.direccion) {
      setDireccionSeleccionadaId(null);
      if (prefs.direccion) entrega.cambiarDireccion(prefs.direccion);
      if (prefs.localidad) entrega.cambiarLocalidad(prefs.localidad);
    } else if (entregaInicial?.direccionGuardadaId) {
      setDireccionSeleccionadaId(entregaInicial.direccionGuardadaId);
    }

    setNotificacionesActivas(prefs.notificacionesActivas === undefined ? true : Boolean(prefs.notificacionesActivas));
  };

  useEffect(() => {
    let vigente = true;
    cargarPreferenciasCompra()
      .catch((error) => console.warn('No se pudieron recuperar las preferencias de compra:', error.message))
      .finally(() => { if (vigente) setCargandoPreferencias(false); });
    return () => { vigente = false; };
  }, [usuario?.id]);

  let descuento = 0;
  let envioFinal = entrega.conEnvio && entrega.envio ? entrega.envio.costo : 0;
  if (cuponAplicado) {
    if (cuponAplicado.tipo === 'porcentaje') descuento = Math.round((subtotal * cuponAplicado.valor) / 100);
    if (cuponAplicado.tipo === 'monto') descuento = Math.min(cuponAplicado.valor, subtotal);
    if (cuponAplicado.tipo === 'envioGratis') envioFinal = 0;
  }
  const total = subtotal - descuento + envioFinal;

  const aplicarCupon = () => {
    const codigo = codigoCupon.trim().toUpperCase();
    if (!codigo) return setErrorCupon('Escribí un código.');
    const encontrado = cupones.find((c) => c.codigo === codigo);
    if (!encontrado) return setErrorCupon('Ese cupón no existe o venció.');
    if (encontrado.tipo === 'envioGratis' && !entrega.conEnvio) return setErrorCupon('Este cupón solo sirve con envío a domicilio.');
    setCuponAplicado(encontrado); setErrorCupon(''); setCodigoCupon('');
  };

  const seleccionarMedio = (id) => {
    setMedioPago(id);
    const perfil = metodosGuardados.find((m) => m.tipo === id && esPredeterminado(m)) || metodosGuardados.find((m) => m.tipo === id);
    setMedioPagoUsuarioId(perfil?.id || null);
  };

  const confirmarCompra = () => {
    if (!medioPago || !estaHabilitado(mediosPago[medioPago])) return Alert.alert('Falta el medio de pago', 'Elegí un medio de pago habilitado por la tienda.');
    if (entrega.conEnvio && !entrega.envio) return Alert.alert('Falta el envío', 'Calculá el costo de envío antes de confirmar.');
    if (entrega.conEnvio && (instruccionesEntrega.length > 500 || direccionAlias.length > 50 || direccionDestinatario.length > 120)) return Alert.alert('Revisá la dirección', 'El alias, destinatario o las notas son demasiado largos.');
    if ((medioPago === 'credito' || medioPago === 'debito') && !medioPagoUsuarioId) {
      return Alert.alert('Falta registrar la tarjeta', 'Primero agregá tu tarjeta en Configuración → Métodos de pago.', [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Ir a métodos de pago', onPress: () => navigation.navigate('ConfiguracionCuenta', { seccion: 'pago' }) },
      ]);
    }

    const codigoRapipago = medioPago === 'rapipago' ? generarCodigoRapipago() : null;
    const nombreMedio = MEDIOS_DE_PAGO.find((m) => m.id === medioPago)?.nombre || medioPago;
    const perfil = metodosGuardados.find((m) => Number(m.id) === Number(medioPagoUsuarioId));
    Alert.alert('Confirmar compra', `Medio: ${nombreMedio}${perfil ? `\n${perfil.alias || `${perfil.marca || nombreMedio} •••• ${perfil.ultimos4 || ''}`}` : ''}\nTotal estimado: $${total}\n\n¿Querés registrar el pedido?`, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setConfirmando(true);
          try {
            const venta = await api('/ventas', {
              method: 'POST',
              body: JSON.stringify({
                usuarioId: usuario.id,
                items: items.map((i) => ({ id: i.id, cantidad: i.cantidad })),
                metodoPago: medioPago,
                metodoPagoUsuarioId: medioPagoUsuarioId,
                codigoCupon: cuponAplicado?.codigo || '',
                codigoRapipago,
                conEnvio: Boolean(entrega.conEnvio),
                direccion: entrega.conEnvio ? entrega.direccion : '',
                localidad: entrega.conEnvio ? entrega.localidad : '',
                direccionAlias: entrega.conEnvio ? direccionAlias : '',
                direccionDestinatario: entrega.conEnvio ? direccionDestinatario : '',
                instruccionesEntrega: entrega.conEnvio ? instruccionesEntrega : '',
                distanciaKm: entrega.conEnvio && entrega.envio ? entrega.envio.distanciaKm : null,
                costoEnvio: entrega.conEnvio ? envioFinal : 0,
              }),
            });

            compraRegistradaRef.current = true;

            if (entrega.conEnvio && guardarDireccionNueva && !direccionSeleccionadaId) {
              await api(`/usuarios/${usuario.id}/direcciones`, {
                method: 'POST',
                body: JSON.stringify({ alias: aliasDireccionNueva.trim() || 'Otra', destinatario: direccionDestinatario, direccion: entrega.direccion, localidad: entrega.localidad, detalle: instruccionesEntrega, esPredeterminada: direcciones.length === 0 }),
              }).catch((e) => console.warn('La compra se guardó, pero no se pudo guardar la dirección:', e.message));
            }

            if (!comprarAhora) quitarSeleccionados();
            const avisosActivados = notificacionesActivas ? await pedirPermisoNotificaciones() : false;
            const pedido = crearPedido({ ...venta, avisosActivados, estado: venta.estadoPedido || venta.estado || 'confirmado', estadoPedido: venta.estadoPedido || venta.estado || 'confirmado' });
            if (avisosActivados) await notificarEstadoPedido(venta.numero, 'confirmado');
            const mensaje = venta.codigoRapipago ? `Pedido #${venta.numero} registrado. Código de Rapipago: ${venta.codigoRapipago}.` : `Pedido #${venta.numero} registrado correctamente.`;
            Alert.alert('¡Pedido registrado!', `${mensaje}\nTotal: $${Number(venta.total).toFixed(2)}`, [
              { text: 'Ver mi pedido', onPress: () => navigation.reset({ index: 1, routes: [{ name: 'Inicio' }, { name: 'Seguimiento', params: { pedidoId: pedido.id } }] }) },
            ]);
          } catch (error) {
            Alert.alert('No se pudo registrar la compra', error.message || 'Revisá la conexión con el backend e intentá nuevamente.');
          } finally { setConfirmando(false); }
        },
      },
    ], { cancelable: false });
  };

  const puedeConfirmar = Boolean(medioPago && estaHabilitado(mediosPago[medioPago]) && !cargandoPreferencias && !confirmando && items.length);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 140 }} keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={styles.caja}>
        <Text style={styles.titulo}>Tu pedido</Text>
        {items.map((item) => <View key={item.id} style={styles.filaMonto}><Text style={styles.nombreItem} numberOfLines={1}>{item.cantidad} x {item.nombre}</Text><Text>${item.precio * item.cantidad}</Text></View>)}
      </View>

      <View style={styles.caja}>
        <Text style={styles.titulo}>Direcciones guardadas</Text>
        {direcciones.length ? direcciones.map((d) => (
          <TouchableOpacity key={d.id} style={[styles.tarjetaDireccion, Number(direccionSeleccionadaId) === Number(d.id) && styles.tarjetaSeleccionada]} onPress={() => aplicarDireccion(d)}>
            <Text style={styles.direccionNombre}>{d.alias || 'Dirección'}{esPredeterminado(d) ? ' · Principal' : ''}</Text>
            <Text style={styles.direccionTexto}>{d.direccion}, {d.localidad}</Text>
            {!!d.destinatario && <Text style={styles.nota}>{`Recibe: ${d.destinatario}`}</Text>}
            {!!d.detalle && <Text style={styles.nota}>{d.detalle}</Text>}
          </TouchableOpacity>
        )) : <Text style={styles.nota}>Todavía no guardaste direcciones. Podés agregar varias desde Configuración → Dirección de entrega.</Text>}
        {direccionSeleccionadaId && <TouchableOpacity onPress={() => { setDireccionSeleccionadaId(null); setDireccionAlias(''); setDireccionDestinatario(''); setInstruccionesEntrega(''); entrega.cambiarDireccion(''); entrega.cambiarLocalidad(''); }}><Text style={styles.link}>Ingresar otra dirección</Text></TouchableOpacity>}
      </View>

      <View style={styles.caja}>
        <EntregaEnvio entrega={entrega} envioHabilitado={envioHabilitado} tarifaBase={costoEnvioBase} />
        {!envioHabilitado && <Text style={styles.avisoPago}>La tienda no tiene habilitado el envío a domicilio.</Text>}
        {entrega.conEnvio && <>
          <Text style={styles.etiqueta}>Nombre para esta dirección (opcional)</Text>
          <TextInput style={styles.input} placeholder="Casa, Trabajo, etc." value={direccionAlias} onChangeText={setDireccionAlias} maxLength={50} />
          <Text style={styles.etiqueta}>¿Quién recibe? (opcional)</Text>
          <TextInput style={styles.input} placeholder="Nombre de quien recibe" value={direccionDestinatario} onChangeText={setDireccionDestinatario} maxLength={120} />
          <Text style={styles.etiqueta}>Notas para el envío (opcional)</Text>
          <TextInput style={styles.input} placeholder="Tocar timbre 2B, dejar en portería..." value={instruccionesEntrega} onChangeText={setInstruccionesEntrega} maxLength={500} multiline />
          {!direccionSeleccionadaId && <View style={styles.switchFila}><Text style={styles.nota}>Guardar esta dirección para futuras compras</Text><Switch value={guardarDireccionNueva} onValueChange={setGuardarDireccionNueva} trackColor={{ true: '#E5A33A' }} /></View>}
          {guardarDireccionNueva && !direccionSeleccionadaId && <TextInput style={styles.input} value={aliasDireccionNueva} onChangeText={setAliasDireccionNueva} placeholder="Nombre: Casa, Trabajo..." maxLength={50} />}
        </>}
      </View>

      <View style={styles.caja}>
        <Text style={styles.titulo}>Cupón de descuento</Text>
        {cuponAplicado ? <View style={styles.cuponAplicado}><Text style={styles.cuponAplicadoTexto}>🎟️ {cuponAplicado.codigo}: {cuponAplicado.descripcion}</Text><TouchableOpacity onPress={() => setCuponAplicado(null)}><Text style={styles.link}>Quitar</Text></TouchableOpacity></View> : (
          <View style={styles.filaCupon}><TextInput style={styles.inputCupon} placeholder="Código de cupón" autoCapitalize="characters" value={codigoCupon} onChangeText={(texto) => { setCodigoCupon(texto); setErrorCupon(''); }} /><TouchableOpacity style={styles.botonAplicar} onPress={aplicarCupon}><Text style={styles.botonAplicarTexto}>Aplicar</Text></TouchableOpacity></View>
        )}
        {errorCupon !== '' && <Text style={styles.errorCupon}>{errorCupon}</Text>}
      </View>

      <View style={styles.caja}>
        <Text style={styles.titulo}>Medio de pago</Text>
        {metodosDisponibles.map((medio) => (
          <TouchableOpacity key={medio.id} style={[styles.opcionPago, medioPago === medio.id && styles.opcionPagoActiva]} onPress={() => seleccionarMedio(medio.id)}>
            <View style={[styles.radio, medioPago === medio.id && styles.radioActivo]} />
            <Text style={styles.opcionPagoTexto}>{medio.nombre}</Text>
          </TouchableOpacity>
        ))}
        {cargandoPreferencias && <Text style={styles.avisoPago}>Cargando medios habilitados...</Text>}
        {!cargandoPreferencias && !metodosDisponibles.length && <Text style={styles.avisoPago}>La tienda no tiene medios de pago habilitados.</Text>}
        {!medioPago && <Text style={styles.avisoPago}>Elegí un medio de pago para confirmar.</Text>}
        {(medioPago === 'credito' || medioPago === 'debito') && (
          <View style={styles.perfilesPago}>
            <Text style={styles.etiqueta}>Elegí una tarjeta guardada</Text>
            {tarjetasDisponibles.filter((m) => m.tipo === medioPago).map((m) => (
              <TouchableOpacity key={m.id} style={[styles.opcionPago, Number(medioPagoUsuarioId) === Number(m.id) && styles.opcionPagoActiva]} onPress={() => setMedioPagoUsuarioId(m.id)}>
                <View style={[styles.radio, Number(medioPagoUsuarioId) === Number(m.id) && styles.radioActivo]} />
                <View style={{ flex: 1 }}><Text style={styles.opcionPagoTexto}>{m.marca} •••• {m.ultimos4}</Text><Text style={styles.nota}>{m.titular} · vence {String(m.vencimientoMes).padStart(2, '0')}/{String(m.vencimientoAnio).slice(-2)}</Text></View>
              </TouchableOpacity>
            ))}
            {!tarjetasDisponibles.some((m) => m.tipo === medioPago) && <Text style={styles.avisoPago}>No tenés una tarjeta de este tipo guardada.</Text>}
            <TouchableOpacity onPress={() => navigation.navigate('ConfiguracionCuenta', { seccion: 'pago' })}><Text style={styles.link}>Agregar o administrar tarjetas</Text></TouchableOpacity>
          </View>
        )}
        {medioPago && !['credito', 'debito'].includes(medioPago) && perfilesMedioSeleccionado.length > 0 && (
          <View style={styles.perfilesPago}>
            <Text style={styles.etiqueta}>Cuenta o billetera guardada (opcional)</Text>
            {perfilesMedioSeleccionado.map((m) => (
              <TouchableOpacity key={m.id} style={[styles.opcionPago, Number(medioPagoUsuarioId) === Number(m.id) && styles.opcionPagoActiva]} onPress={() => setMedioPagoUsuarioId(m.id)}>
                <View style={[styles.radio, Number(medioPagoUsuarioId) === Number(m.id) && styles.radioActivo]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.opcionPagoTexto}>{m.alias || MEDIOS_DE_PAGO.find((x) => x.id === m.tipo)?.nombre || m.tipo}</Text>
                  {m.esPredeterminado ? <Text style={styles.nota}>Preferido</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {medioPago && !['credito', 'debito'].includes(medioPago) && <Text style={styles.nota}>La compra registra el medio elegido. Esta versión todavía no realiza cobros externos ni solicita contraseñas, CVV o códigos de billeteras.</Text>}
        {medioPago === 'rapipago' && <Text style={styles.infoRapipago}>Al confirmar te damos un código de pago para abonar en efectivo en cualquier sucursal de Rapipago.</Text>}
      </View>

      <View style={styles.caja}>
        <View style={styles.filaMonto}><Text>Subtotal</Text><Text>${subtotal}</Text></View>
        {descuento > 0 && <View style={styles.filaMonto}><Text>Descuento ({cuponAplicado.codigo})</Text><Text style={styles.descuento}>-${descuento}</Text></View>}
        {entrega.conEnvio && <View style={styles.filaMonto}><Text>Envío</Text><Text>{entrega.envio ? (envioFinal === 0 ? 'Gratis' : `$${envioFinal}`) : 'Sin calcular'}</Text></View>}
        <View style={[styles.filaMonto, styles.filaTotal]}><Text style={styles.totalTexto}>Total</Text><Text style={styles.totalTexto}>${total}</Text></View>
      </View>

      <TouchableOpacity style={[styles.botonConfirmar, !puedeConfirmar && styles.botonConfirmarInactivo]} onPress={confirmarCompra} disabled={!puedeConfirmar}>
        <Text style={styles.botonConfirmarTexto}>{confirmando ? 'Registrando...' : puedeConfirmar ? 'Confirmar compra' : 'Elegí un medio de pago'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = createThemedStyles({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  caja: { backgroundColor: '#fff', marginHorizontal: 10, marginTop: 10, padding: 12, borderRadius: 10 },
  titulo: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 }, link: { color: '#c77b00', fontWeight: 'bold', marginTop: 8 },
  filaMonto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }, nombreItem: { flex: 1, marginRight: 10 }, descuento: { color: '#2e7d32', fontWeight: 'bold' },
  filaTotal: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 }, totalTexto: { fontWeight: 'bold', fontSize: 16 },
  filaCupon: { flexDirection: 'row', alignItems: 'center' }, inputCupon: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginTop: 8, color: '#35230E' }, etiqueta: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  botonAplicar: { backgroundColor: '#ffcc80', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 }, botonAplicarTexto: { fontWeight: 'bold' },
  cuponAplicado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8 }, cuponAplicadoTexto: { flex: 1, marginRight: 10, color: '#2e7d32', fontWeight: 'bold' }, errorCupon: { color: '#e57373', fontWeight: 'bold', marginTop: 6 },
  opcionPago: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffcc80', borderRadius: 8, padding: 12, marginBottom: 8 }, opcionPagoActiva: { backgroundColor: '#fff3e0', borderColor: '#c77b00' }, opcionPagoTexto: { marginLeft: 10, fontWeight: '600' }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#c77b00' }, radioActivo: { backgroundColor: '#c77b00' },
  avisoPago: { color: '#e57373', fontWeight: 'bold', marginTop: 5 }, perfilesPago: { marginTop: 10 }, nota: { color: '#888', fontSize: 12, marginTop: 5, lineHeight: 17 }, infoRapipago: { color: '#555', marginTop: 4 },
  botonConfirmar: { backgroundColor: '#007bff', marginHorizontal: 10, marginVertical: 16, padding: 14, borderRadius: 8, alignItems: 'center' }, botonConfirmarInactivo: { backgroundColor: '#b0bec5' }, botonConfirmarTexto: { color: '#fff', fontWeight: 'bold' },
  tarjetaDireccion: { borderWidth: 1, borderColor: '#eadcc9', borderRadius: 9, padding: 10, marginBottom: 8 }, tarjetaSeleccionada: { borderColor: '#B97719', backgroundColor: '#FFF3E0' }, direccionNombre: { fontWeight: 'bold', fontSize: 14 }, direccionTexto: { fontSize: 13, marginTop: 3 }, switchFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});
