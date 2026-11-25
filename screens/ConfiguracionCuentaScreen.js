import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text, ThemedTextInput as TextInput } from '../context/ThemeContext';
import { createThemedStyles } from '../context/ThemeContext';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Switch, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { cancelarAvisos, pedirPermisoNotificaciones } from '../services/notificaciones';

const METODOS = [
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

const limpiarNumero = (valor) => String(valor || '').replace(/\D/g, '').slice(0, 19);
const formatearNumero = (valor) => limpiarNumero(valor).replace(/(.{4})/g, '$1 ').trim();
const limpiarVencimiento = (valor) => {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
};

function validarLuhn(numero) {
  let suma = 0;
  let alternar = false;
  for (let i = numero.length - 1; i >= 0; i -= 1) {
    let digito = Number(numero[i]);
    if (alternar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    alternar = !alternar;
  }
  return numero.length >= 13 && numero.length <= 19 && suma % 10 === 0;
}

function detectarMarca(numero) {
  if (/^4/.test(numero)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(numero)) return 'Mastercard';
  if (/^3[47]/.test(numero)) return 'American Express';
  if (/^(50|6)/.test(numero)) return 'Cabal';
  return 'Tarjeta';
}

export default function ConfiguracionCuentaScreen({ route, navigation }) {
  const { usuario } = useAuth();
  const seccion = route.params?.seccion || 'pago';
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [preferencias, setPreferencias] = useState({ metodoPagoPreferido: '', notificacionesActivas: true });
  const [configTienda, setConfigTienda] = useState({ metodosPago: {} });
  const [direcciones, setDirecciones] = useState([]);
  const [metodosGuardados, setMetodosGuardados] = useState([]);

  const [direccionEditando, setDireccionEditando] = useState(null);
  const [direccionForm, setDireccionForm] = useState({ alias: 'Casa', destinatario: '', direccion: '', localidad: '', detalle: '', esPredeterminada: false });

  const [tipoTarjeta, setTipoTarjeta] = useState('credito');
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [titularTarjeta, setTitularTarjeta] = useState('');
  const [vencimientoTarjeta, setVencimientoTarjeta] = useState('');
  const [aliasTarjeta, setAliasTarjeta] = useState('');
  const [tipoBilletera, setTipoBilletera] = useState('mercado_pago');
  const [aliasBilletera, setAliasBilletera] = useState('');
  const [tipoOtroMedio, setTipoOtroMedio] = useState('transferencia');
  const [aliasOtroMedio, setAliasOtroMedio] = useState('');

  const metodosActivos = useMemo(() => METODOS.filter((m) => configTienda.metodosPago?.[m.id]), [configTienda]);
  const billeterasActivas = metodosActivos.filter((m) => m.grupo === 'billetera');
  const otrosMediosActivos = metodosActivos.filter((m) => m.grupo === 'otro');

  const cargarDatos = async () => {
    const [prefs, tienda, dirs, pagos] = await Promise.all([
      api(`/usuarios/${usuario.id}/preferencias`),
      api('/configuracion-tienda'),
      api(`/usuarios/${usuario.id}/direcciones`),
      api(`/usuarios/${usuario.id}/metodos-pago`),
    ]);
    setPreferencias({ metodoPagoPreferido: prefs.metodoPagoPreferido || '', notificacionesActivas: Boolean(prefs.notificacionesActivas) });
    const metodosTienda = tienda?.metodosPago || {};
    setConfigTienda(tienda || { metodosPago: {} });
    setDirecciones(Array.isArray(dirs) ? dirs : []);
    setMetodosGuardados(Array.isArray(pagos) ? pagos : []);
    const tarjetasActivas = ['credito', 'debito'].filter((id) => metodosTienda[id]);
    if (tarjetasActivas.length && !tarjetasActivas.includes(tipoTarjeta)) setTipoTarjeta(tarjetasActivas[0]);
    const billeterasActivasIds = ['mercado_pago', 'cuenta_dni', 'modo', 'naranja_x', 'uala'].filter((id) => metodosTienda[id]);
    const billeteraGuardada = (Array.isArray(pagos) ? pagos : []).find((p) => billeterasActivasIds.includes(p.tipo));
    if (billeteraGuardada) setTipoBilletera(billeteraGuardada.tipo);
    else if (billeterasActivasIds.length && !billeterasActivasIds.includes(tipoBilletera)) setTipoBilletera(billeterasActivasIds[0]);
    const otrosActivosIds = ['transferencia', 'rapipago'].filter((id) => metodosTienda[id]);
    const otroGuardado = (Array.isArray(pagos) ? pagos : []).find((p) => otrosActivosIds.includes(p.tipo));
    if (otroGuardado) setTipoOtroMedio(otroGuardado.tipo);
    else if (otrosActivosIds.length && !otrosActivosIds.includes(tipoOtroMedio)) setTipoOtroMedio(otrosActivosIds[0]);
  };

  useEffect(() => {
    let vigente = true;
    cargarDatos().catch((error) => {
      if (vigente) Alert.alert('No se pudo cargar la configuración', error.message);
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [usuario?.id]);

  const actualizarPreferencia = (campo, valor) => setPreferencias((actual) => ({ ...actual, [campo]: valor }));

  const guardarPreferencias = async (datos = preferencias) => {
    setGuardando(true);
    try {
      await api(`/usuarios/${usuario.id}/preferencias`, { method: 'PUT', body: JSON.stringify(datos) });
      setPreferencias(datos);
      Alert.alert('Configuración guardada', 'Los cambios quedaron registrados en tu cuenta.');
    } catch (error) {
      Alert.alert('No se pudo guardar', error.message);
    } finally { setGuardando(false); }
  };

  const guardarDireccion = async () => {
    const datos = {
      alias: direccionForm.alias.trim(),
      destinatario: direccionForm.destinatario.trim(),
      direccion: direccionForm.direccion.trim(),
      localidad: direccionForm.localidad.trim(),
      detalle: direccionForm.detalle.trim(),
      esPredeterminada: Boolean(direccionForm.esPredeterminada || direcciones.length === 0),
    };
    if (!datos.alias || !datos.direccion || !datos.localidad) {
      Alert.alert('Faltan datos', 'Completá el nombre de la dirección, la calle y la localidad.');
      return;
    }
    setGuardando(true);
    try {
      const base = `/usuarios/${usuario.id}/direcciones`;
      if (direccionEditando) {
        await api(`${base}/${direccionEditando}`, { method: 'PUT', body: JSON.stringify(datos) });
      } else {
        await api(base, { method: 'POST', body: JSON.stringify(datos) });
      }
      setDireccionEditando(null);
      setDireccionForm({ alias: 'Casa', destinatario: '', direccion: '', localidad: '', detalle: '', esPredeterminada: false });
      await cargarDatos();
      Alert.alert('Dirección guardada', 'Ya podés elegirla al preparar una compra.');
    } catch (error) { Alert.alert('No se pudo guardar la dirección', error.message); }
    finally { setGuardando(false); }
  };

  const editarDireccion = (d) => {
    setDireccionEditando(d.id);
    setDireccionForm({ alias: d.alias || '', destinatario: d.destinatario || '', direccion: d.direccion || '', localidad: d.localidad || '', detalle: d.detalle || '', esPredeterminada: Boolean(d.esPredeterminada) });
  };

  const eliminarDireccion = (id) => Alert.alert('Eliminar dirección', '¿Querés quitar esta dirección de tu cuenta?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: async () => {
      try { await api(`/usuarios/${usuario.id}/direcciones/${id}`, { method: 'DELETE' }); await cargarDatos(); }
      catch (error) { Alert.alert('No se pudo eliminar', error.message); }
    } },
  ]);

  const marcarDireccionPrincipal = async (d) => {
    try {
      await api(`/usuarios/${usuario.id}/direcciones/${d.id}`, { method: 'PUT', body: JSON.stringify({ ...d, esPredeterminada: true }) });
      await cargarDatos();
    } catch (error) { Alert.alert('No se pudo actualizar', error.message); }
  };

  const guardarTarjeta = async () => {
    const numero = limpiarNumero(numeroTarjeta);
    const [mes, anio] = vencimientoTarjeta.split('/');
    if (!validarLuhn(numero)) return Alert.alert('Tarjeta inválida', 'Revisá el número. Para pruebas locales podés usar una tarjeta de prueba conocida.');
    if (!titularTarjeta.trim()) return Alert.alert('Falta el titular', 'Ingresá el nombre que figura en la tarjeta.');
    if (!mes || !anio || Number(mes) < 1 || Number(mes) > 12 || anio.length !== 2) return Alert.alert('Vencimiento inválido', 'Usá el formato MM/AA.');
    const anioCompleto = 2000 + Number(anio);
    const vence = new Date(anioCompleto, Number(mes), 1);
    if (vence <= new Date()) return Alert.alert('Tarjeta vencida', 'Ingresá una fecha de vencimiento futura.');
    const marca = detectarMarca(numero);
    const ultimos4 = numero.slice(-4);
    setGuardando(true);
    try {
      await api(`/usuarios/${usuario.id}/metodos-pago`, {
        method: 'POST',
        body: JSON.stringify({
          tipo: tipoTarjeta,
          alias: aliasTarjeta.trim() || `${marca} •••• ${ultimos4}`,
          marca,
          ultimos4,
          titular: titularTarjeta.trim(),
          vencimientoMes: Number(mes),
          vencimientoAnio: anioCompleto,
          esPredeterminado: metodosGuardados.length === 0,
        }),
      });
      setNumeroTarjeta(''); setTitularTarjeta(''); setVencimientoTarjeta(''); setAliasTarjeta('');
      await cargarDatos();
      Alert.alert('Tarjeta registrada', `Se guardó ${marca} terminada en ${ultimos4}. El número completo y el código de seguridad no se guardaron.`);
    } catch (error) { Alert.alert('No se pudo registrar la tarjeta', error.message); }
    finally { setGuardando(false); }
  };

  const guardarBilletera = async () => {
    if (!tipoBilletera || !configTienda.metodosPago?.[tipoBilletera]) return Alert.alert('Medio no disponible', 'La tienda no tiene habilitada esa billetera.');
    setGuardando(true);
    try {
      await api(`/usuarios/${usuario.id}/metodos-pago`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoBilletera, alias: aliasBilletera.trim() || METODOS.find((m) => m.id === tipoBilletera)?.nombre, esPredeterminado: metodosGuardados.length === 0 }),
      });
      setAliasBilletera('');
      await cargarDatos();
      Alert.alert('Medio agregado', 'La billetera quedó asociada a tu cuenta como preferencia. El pago todavía se confirma según el medio que acepte la tienda.');
    } catch (error) { Alert.alert('No se pudo guardar el medio', error.message); }
    finally { setGuardando(false); }
  };

  const guardarOtroMedio = async () => {
    if (!tipoOtroMedio || !configTienda.metodosPago?.[tipoOtroMedio]) return Alert.alert('Medio no disponible', 'La tienda no tiene habilitado ese medio.');
    setGuardando(true);
    try {
      await api(`/usuarios/${usuario.id}/metodos-pago`, {
        method: 'POST',
        body: JSON.stringify({
          tipo: tipoOtroMedio,
          alias: aliasOtroMedio.trim() || METODOS.find((m) => m.id === tipoOtroMedio)?.nombre,
          esPredeterminado: metodosGuardados.length === 0,
        }),
      });
      setAliasOtroMedio('');
      await cargarDatos();
      Alert.alert('Medio guardado', 'Ya podés elegirlo al preparar tu compra.');
    } catch (error) { Alert.alert('No se pudo guardar el medio', error.message); }
    finally { setGuardando(false); }
  };

  const marcarMetodoPreferido = async (metodo) => {
    setGuardando(true);
    try {
      await api(`/usuarios/${usuario.id}/metodos-pago/${metodo.id}/preferido`, { method: 'PUT', body: JSON.stringify({}) });
      setPreferencias((actual) => ({ ...actual, metodoPagoPreferido: metodo.tipo }));
      await cargarDatos();
      Alert.alert('Medio preferido actualizado', 'Se va a proponer automáticamente al preparar tu próxima compra.');
    } catch (error) { Alert.alert('No se pudo actualizar', error.message); }
    finally { setGuardando(false); }
  };

  const eliminarMetodo = (id) => Alert.alert('Quitar medio de pago', 'Se quitará de tus opciones guardadas. No se modifica ninguna compra anterior.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Quitar', style: 'destructive', onPress: async () => {
      try { await api(`/usuarios/${usuario.id}/metodos-pago/${id}`, { method: 'DELETE' }); await cargarDatos(); }
      catch (error) { Alert.alert('No se pudo quitar', error.message); }
    } },
  ]);

  const cambiarNotificaciones = async (valor) => {
    if (valor) {
      const permiso = await pedirPermisoNotificaciones();
      if (!permiso) return Alert.alert('Permiso no concedido', 'Activá las notificaciones desde los ajustes del teléfono.');
    } else await cancelarAvisos();
    const nuevas = { ...preferencias, notificacionesActivas: valor };
    actualizarPreferencia('notificacionesActivas', valor);
    await guardarPreferencias(nuevas);
  };

  const titulo = { pago: 'Métodos de pago', direccion: 'Direcciones de entrega', notificaciones: 'Notificaciones', seguridad: 'Privacidad y seguridad' }[seccion] || 'Configuración de cuenta';
  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text style={styles.ayuda}>Cargando preferencias...</Text></View>;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={[styles.contenido, { paddingBottom: 140 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.descripcion}>Estos datos se guardan en tu cuenta y se usan al preparar una compra.</Text>

      {seccion === 'pago' && (
        <>
          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo}>Medio preferido</Text>
            <Text style={styles.ayuda}>Solo aparecen los medios habilitados por Dulces Lucho.</Text>
            {metodosActivos.map((m) => (
              <TouchableOpacity key={m.id} style={styles.opcion} onPress={() => guardarPreferencias({ ...preferencias, metodoPagoPreferido: m.id })}>
                <View style={[styles.radio, preferencias.metodoPagoPreferido === m.id && styles.radioActivo]} />
                <Text style={styles.textoOpcion}>{m.nombre}</Text>
              </TouchableOpacity>
            ))}
            {!metodosActivos.length && <Text style={styles.ayuda}>La tienda todavía no habilitó medios de pago.</Text>}
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo}>Tarjetas guardadas</Text>
            <Text style={styles.ayuda}>El número completo y el CVV nunca se guardan aquí. Solo conservamos marca, últimos cuatro dígitos, titular y vencimiento como referencia. Los cobros son simulados hasta conectar una pasarela de pago.</Text>
            {metodosGuardados.filter((m) => ['credito', 'debito'].includes(m.tipo)).map((m) => (
              <View key={m.id} style={styles.metodoGuardado}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.textoOpcion}>{m.marca || 'Tarjeta'} •••• {m.ultimos4}</Text>
                  <Text style={styles.ayuda}>{m.tipo === 'credito' ? 'Crédito' : 'Débito'} · {m.titular} · vence {String(m.vencimientoMes).padStart(2, '0')}/{String(m.vencimientoAnio).slice(-2)}</Text>
                  {m.esPredeterminado ? <Text style={styles.etiquetaEstado}>Preferida</Text> : null}
                </View>
                {!m.esPredeterminado && <TouchableOpacity onPress={() => marcarMetodoPreferido(m)}><Text style={styles.link}>Preferir</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => eliminarMetodo(m.id)}><Text style={styles.eliminar}>Quitar</Text></TouchableOpacity>
              </View>
            ))}
            <Text style={styles.etiqueta}>Tipo de tarjeta</Text>
            <View style={styles.filaChips}>
              {['credito', 'debito'].filter((id) => configTienda.metodosPago?.[id]).map((id) => (
                <TouchableOpacity key={id} style={[styles.chip, tipoTarjeta === id && styles.chipActivo]} onPress={() => setTipoTarjeta(id)}><Text style={styles.textoChip}>{id === 'credito' ? 'Crédito' : 'Débito'}</Text></TouchableOpacity>
              ))}
            </View>
            {['credito', 'debito'].some((id) => configTienda.metodosPago?.[id]) && <>
              <Campo label="Número de tarjeta (solo se usa para identificarla)" value={numeroTarjeta} onChangeText={(v) => setNumeroTarjeta(formatearNumero(v))} keyboardType="number-pad" maxLength={23} placeholder="4242 4242 4242 4242" />
              <Campo label="Titular" value={titularTarjeta} onChangeText={setTitularTarjeta} autoCapitalize="characters" placeholder="NOMBRE Y APELLIDO" />
              <Campo label="Vencimiento MM/AA" value={vencimientoTarjeta} onChangeText={(v) => setVencimientoTarjeta(limpiarVencimiento(v))} keyboardType="number-pad" maxLength={5} placeholder="12/30" />
              <Campo label="Nombre para identificarla (opcional)" value={aliasTarjeta} onChangeText={setAliasTarjeta} placeholder="Mi Visa personal" />
              <Boton texto="Registrar tarjeta" onPress={guardarTarjeta} cargando={guardando} />
            </>}
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo}>Billeteras virtuales y otros medios</Text>
            {metodosGuardados.filter((m) => !['credito', 'debito'].includes(m.tipo)).map((m) => (
              <View key={m.id} style={styles.metodoGuardado}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.textoOpcion}>{METODOS.find((x) => x.id === m.tipo)?.nombre || m.tipo}</Text>
                  <Text style={styles.ayuda}>{m.alias || 'Medio guardado'}</Text>
                  {m.esPredeterminado ? <Text style={styles.etiquetaEstado}>Preferido</Text> : null}
                </View>
                {!m.esPredeterminado && <TouchableOpacity onPress={() => marcarMetodoPreferido(m)}><Text style={styles.link}>Preferir</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => eliminarMetodo(m.id)}><Text style={styles.eliminar}>Quitar</Text></TouchableOpacity>
              </View>
            ))}
            {billeterasActivas.length > 0 && <>
              <Text style={styles.etiqueta}>Billetera</Text>
              <View style={styles.filaChips}>
                {billeterasActivas.map((m) => <TouchableOpacity key={m.id} style={[styles.chip, tipoBilletera === m.id && styles.chipActivo]} onPress={() => setTipoBilletera(m.id)}><Text style={styles.textoChip}>{m.nombre}</Text></TouchableOpacity>)}
              </View>
              <Campo label="Alias o cuenta (opcional, no ingreses contraseñas ni códigos)" value={aliasBilletera} onChangeText={setAliasBilletera} placeholder="Mi cuenta personal" />
              <Boton texto="Guardar billetera" onPress={guardarBilletera} cargando={guardando} />
            </>}
            {otrosMediosActivos.length > 0 && <>
              <Text style={styles.etiqueta}>Otros medios habilitados</Text>
              <View style={styles.filaChips}>
                {otrosMediosActivos.map((m) => <TouchableOpacity key={m.id} style={[styles.chip, tipoOtroMedio === m.id && styles.chipActivo]} onPress={() => setTipoOtroMedio(m.id)}><Text style={styles.textoChip}>{m.nombre}</Text></TouchableOpacity>)}
              </View>
              <Campo label="Alias o referencia (opcional)" value={aliasOtroMedio} onChangeText={setAliasOtroMedio} placeholder="Mi banco, pago en efectivo..." />
              <Boton texto="Guardar otro medio" onPress={guardarOtroMedio} cargando={guardando} />
            </>}
            <Text style={styles.ayuda}>Las billeteras, transferencias y tarjetas se registran como referencia de pago. Esta versión todavía no cobra ni inicia sesión en servicios externos. Nunca ingreses contraseñas, CVV, tokens ni códigos de verificación.</Text>
          </View>
        </>
      )}

      {seccion === 'direccion' && (
        <>
          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo}>{direccionEditando ? 'Editar dirección' : 'Agregar dirección'}</Text>
            <Campo label="Nombre de la dirección" value={direccionForm.alias} onChangeText={(v) => setDireccionForm((f) => ({ ...f, alias: v }))} placeholder="Casa, Trabajo, Mamá..." maxLength={50} />
            <Campo label="¿Quién recibe? (opcional)" value={direccionForm.destinatario} onChangeText={(v) => setDireccionForm((f) => ({ ...f, destinatario: v }))} placeholder="Luciano, mamá, portería..." maxLength={120} />
            <Campo label="Calle y número" value={direccionForm.direccion} onChangeText={(v) => setDireccionForm((f) => ({ ...f, direccion: v }))} placeholder="Av. Mitre 200" maxLength={200} />
            <Campo label="Localidad" value={direccionForm.localidad} onChangeText={(v) => setDireccionForm((f) => ({ ...f, localidad: v }))} placeholder="Lanús" maxLength={100} />
            <Campo label="Notas para quien entrega / ¿para quién es?" value={direccionForm.detalle} onChangeText={(v) => setDireccionForm((f) => ({ ...f, detalle: v }))} placeholder="Tocar timbre 2B, dejar en portería..." maxLength={500} multiline />
            <FilaSwitch titulo="Usar como dirección predeterminada" valor={direccionForm.esPredeterminada} onChange={(v) => setDireccionForm((f) => ({ ...f, esPredeterminada: v }))} />
            <Boton texto={direccionEditando ? 'Guardar cambios' : 'Agregar dirección'} onPress={guardarDireccion} cargando={guardando} />
            {direccionEditando && <Boton texto="Cancelar edición" onPress={() => { setDireccionEditando(null); setDireccionForm({ alias: 'Casa', destinatario: '', direccion: '', localidad: '', detalle: '', esPredeterminada: false }); }} cargando={false} secundario />}
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo}>Mis direcciones</Text>
            {direcciones.length === 0 && <Text style={styles.ayuda}>Todavía no guardaste direcciones. Podés agregar Casa, Trabajo u otra.</Text>}
            {direcciones.map((d) => (
              <View key={d.id} style={styles.direccionGuardada}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.textoOpcion}>{d.alias} {d.esPredeterminada ? '· Predeterminada' : ''}</Text>
                  <Text style={styles.textoDetalle}>{d.direccion}, {d.localidad}</Text>
                  {!!d.destinatario && <Text style={styles.ayuda}>Recibe: {d.destinatario}</Text>}
                  {!!d.detalle && <Text style={styles.ayuda}>Nota: {d.detalle}</Text>}
                </View>
                <TouchableOpacity onPress={() => editarDireccion(d)}><Text style={styles.link}>Editar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => eliminarDireccion(d.id)}><Text style={styles.eliminar}>Quitar</Text></TouchableOpacity>
                {!d.esPredeterminada && <TouchableOpacity onPress={() => marcarDireccionPrincipal(d)}><Text style={styles.link}>Hacer principal</Text></TouchableOpacity>}
              </View>
            ))}
          </View>
        </>
      )}

      {seccion === 'notificaciones' && (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Avisos de pedidos</Text>
          <View style={styles.filaSwitch}>
            <View style={styles.switchTexto}><Text style={styles.textoOpcion}>Notificaciones en este dispositivo</Text><Text style={styles.ayuda}>Avisos locales sobre las etapas del pedido.</Text></View>
            <Switch value={preferencias.notificacionesActivas} onValueChange={cambiarNotificaciones} trackColor={{ true: '#E5A33A' }} />
          </View>
          <Text style={styles.ayuda}>El permiso también debe estar habilitado en los ajustes del teléfono.</Text>
        </View>
      )}

      {seccion === 'seguridad' && (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Protección de la cuenta</Text>
          <Text style={styles.ayuda}>Para cambiar el Gmail o la contraseña primero vas a verificar tu identidad. Las cuentas de administrador necesitan además el código general y su clave personal de seis números.</Text>
          <Boton texto="Continuar con la verificación" onPress={() => navigation.navigate('ProteccionCuenta')} cargando={false} />
        </View>
      )}
    </ScrollView>
  );
}

function Campo({ label, multiline, ...props }) {
  return <View style={styles.campo}><Text style={styles.etiqueta}>{label}</Text><TextInput style={[styles.input, multiline && styles.multiline]} multiline={multiline} {...props} /></View>;
}
function Boton({ texto, onPress, cargando, secundario }) {
  return <TouchableOpacity style={[styles.boton, secundario && styles.botonSecundario, cargando && { opacity: 0.6 }]} onPress={onPress} disabled={cargando}><Text style={styles.botonTexto}>{cargando ? 'Guardando...' : texto}</Text></TouchableOpacity>;
}
function FilaSwitch({ titulo, valor, onChange }) {
  return <View style={styles.filaSwitch}><Text style={styles.textoOpcion}>{titulo}</Text><Switch value={Boolean(valor)} onValueChange={onChange} trackColor={{ true: '#E5A33A' }} /></View>;
}

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 32 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1' },
  titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' },
  descripcion: { color: '#765F43', marginTop: 5, marginBottom: 15, lineHeight: 19 },
  tarjeta: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  subtitulo: { fontSize: 17, fontWeight: 'bold', color: '#493116', marginBottom: 8 },
  ayuda: { color: '#8A785D', fontSize: 12, lineHeight: 18, marginBottom: 8 }, etiqueta: { color: '#80500F', fontWeight: '600', fontSize: 13, marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#FFFCF5', borderWidth: 1, borderColor: '#E8D8C2', borderRadius: 8, padding: 11, color: '#35230E' }, multiline: { minHeight: 76, textAlignVertical: 'top' }, campo: { marginBottom: 4 },
  opcion: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1E7D8' },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#C48B39', marginRight: 12 }, radioActivo: { backgroundColor: '#C48B39' }, textoOpcion: { color: '#35230E', fontSize: 14, flex: 1, fontWeight: '600' },
  textoDetalle: { color: '#765F43', fontSize: 12, marginTop: 3 },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  boton: { backgroundColor: '#E8A23A', padding: 13, borderRadius: 9, alignItems: 'center', marginTop: 14 }, botonSecundario: { backgroundColor: '#9A8A75' }, botonTexto: { color: '#38240D', fontWeight: 'bold' },
  metodoGuardado: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1E7D8' },
  direccionGuardada: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1E7D8', gap: 7 },
  etiquetaEstado: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold', marginTop: 3 }, link: { color: '#A86616', fontWeight: 'bold', fontSize: 12 }, eliminar: { color: '#B3261E', fontWeight: 'bold', fontSize: 12 },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }, chip: { borderWidth: 1, borderColor: '#D9C6AA', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }, chipActivo: { backgroundColor: '#FBE5BE', borderColor: '#B97719' }, textoChip: { color: '#493116', fontSize: 12, fontWeight: '600' },
});
