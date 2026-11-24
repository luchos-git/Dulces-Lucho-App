import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const vacio = { productos: [], proveedores: [], pedidos: [], anticipados: [] };
const ESTADOS_ACTIVOS = ['solicitado', 'confirmado', 'en_camino'];

const fechaSugerida = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const stockDe = (p) => Math.max(0, Number(p?.stockDisponible ?? p?.stock_disponible ?? 0));
const minimoDe = (p) => Math.max(0, Number(p?.stockMinimo ?? p?.stock_minimo ?? 0));
// La prioridad mínima de reposición nunca baja de 5 unidades, aunque el producto
// todavía no tenga configurado un mínimo propio.
const umbralDe = (p) => Math.max(5, minimoDe(p));
const nivelDe = (p) => {
  const stock = stockDe(p);
  if (stock <= 0) return 'agotado';
  if (stock <= umbralDe(p)) return 'bajo';
  return 'correcto';
};
const ordenStock = (a, b) => {
  const nivel = { agotado: 0, bajo: 1, correcto: 2 };
  return nivel[nivelDe(a)] - nivel[nivelDe(b)] || stockDe(a) - stockDe(b) || String(a.nombre).localeCompare(String(b.nombre));
};

export default function AdminStockScreen() {
  const { usuario, esPropietario, puede } = useAuth();
  const puedeStock = esPropietario || puede('gestionar_insumos');
  const puedePedidos = esPropietario || puede('solicitar_compras');
  const puedeDestacados = esPropietario || puede('gestionar_productos');

  const [datos, setDatos] = useState(vacio);
  const [formularios, setFormularios] = useState({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [guardandoId, setGuardandoId] = useState(null);
  const [proveedor, setProveedor] = useState({ nombre: '', contacto: '', telefono: '', email: '', localidad: '', plazoEntregaDias: '7' });
  const [proveedorNuevo, setProveedorNuevo] = useState(false);
  const [proveedorId, setProveedorId] = useState(null);
  const [tipoPedido, setTipoPedido] = useState('reposicion');
  const [fechaEstimada, setFechaEstimada] = useState(fechaSugerida());
  const [notas, setNotas] = useState('');
  const [itemsPedido, setItemsPedido] = useState([]);
  const [filtroProductos, setFiltroProductos] = useState('prioridad');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [guardandoPedido, setGuardandoPedido] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      setErrorCarga('');
      const resultado = await api(`/admin/abastecimiento?adminId=${usuario.id}`);
      setDatos({ ...vacio, ...resultado });
      const iniciales = {};
      (resultado.productos || []).forEach((p) => {
        iniciales[p.id] = {
          stockMinimo: String(p.stockMinimo ?? 0),
          proveedorId: p.proveedorId ? String(p.proveedorId) : '',
          diasReposicionEstimados: String(p.diasReposicionEstimados || 7),
          destacadoOrden: String(p.destacadoOrden || 0),
        };
      });
      setFormularios(iniciales);
      if (resultado.proveedores?.length) {
        setProveedorId((actual) => (resultado.proveedores.some((p) => String(p.id) === String(actual)) ? actual : resultado.proveedores[0].id));
      } else {
        setProveedorId(null);
      }
    } catch (error) {
      setErrorCarga(error.message || 'No se pudo consultar el abastecimiento.');
      Alert.alert('No se pudo cargar stock y proveedores', error.message);
    } finally {
      setCargando(false);
    }
  }, [usuario?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const productosOrdenados = useMemo(() => [...datos.productos].sort(ordenStock), [datos.productos]);
  const productosPrioritarios = useMemo(() => productosOrdenados.filter((p) => nivelDe(p) !== 'correcto'), [productosOrdenados]);
  const pedidosActivos = useMemo(() => datos.pedidos.filter((p) => ESTADOS_ACTIVOS.includes(p.estado)), [datos.pedidos]);
  const productosFiltrados = useMemo(() => {
    const termino = busquedaProducto.trim().toLocaleLowerCase();
    return productosOrdenados.filter((p) => {
      const nivel = nivelDe(p);
      const coincideFiltro = filtroProductos === 'todos'
        || (filtroProductos === 'prioridad' && nivel !== 'correcto')
        || (filtroProductos === 'agotados' && nivel === 'agotado')
        || (filtroProductos === 'bajo' && nivel === 'bajo');
      return coincideFiltro && (!termino || String(p.nombre).toLocaleLowerCase().includes(termino));
    });
  }, [productosOrdenados, filtroProductos, busquedaProducto]);

  const cambiarFormulario = (id, campo, valor) => setFormularios((actual) => ({
    ...actual,
    [id]: { ...(actual[id] || {}), [campo]: valor },
  }));

  const guardarStock = async (producto) => {
    const f = formularios[producto.id] || {};
    const body = {
      adminId: usuario.id,
      stockMinimo: Number(f.stockMinimo),
      proveedorId: f.proveedorId || null,
      diasReposicionEstimados: Number(f.diasReposicionEstimados || 7),
    };
    if (!Number.isInteger(body.stockMinimo) || body.stockMinimo < 0
      || !Number.isInteger(body.diasReposicionEstimados) || body.diasReposicionEstimados < 1 || body.diasReposicionEstimados > 120) {
      Alert.alert('Revisá la configuración', 'El stock mínimo debe ser un entero no negativo. El plazo debe ser de 1 a 120 días.');
      return;
    }
    setGuardandoId(producto.id);
    try {
      await api(`/admin/productos/${producto.id}/stock`, { method: 'PATCH', body: JSON.stringify(body) });
      await cargar();
      Alert.alert(
        'Configuración guardada',
        `Se guardaron el mínimo, el proveedor y el plazo de reposición de ${producto.nombre}. La cantidad disponible solo cambia con ventas y recepciones de proveedores.`,
      );
    } catch (error) {
      Alert.alert('No se pudo actualizar el stock', error.message);
    } finally {
      setGuardandoId(null);
    }
  };

  const alternarDestacado = async (producto, destacado) => {
    try {
      const orden = Number(formularios[producto.id]?.destacadoOrden ?? producto.destacadoOrden ?? 0);
      if (!Number.isInteger(orden) || orden < 0) {
        Alert.alert('Orden inválido', 'Usá un número entero igual o mayor que cero.');
        return;
      }
      await api(`/admin/productos/${producto.id}/destacado`, { method: 'PATCH', body: JSON.stringify({ adminId: usuario.id, destacado, orden }) });
      await cargar();
    } catch (error) {
      Alert.alert('No se pudo actualizar la portada', error.message);
    }
  };

  const guardarOrdenDestacado = async (producto) => alternarDestacado(producto, Boolean(producto.destacadoDia));

  const crearProveedor = async () => {
    if (!proveedor.nombre.trim()) {
      Alert.alert('Falta el nombre', 'Escribí el nombre del proveedor.');
      return;
    }
    try {
      const creado = await api('/admin/proveedores', { method: 'POST', body: JSON.stringify({ ...proveedor, plazoEntregaDias: Number(proveedor.plazoEntregaDias) }) });
      setProveedorId(creado.id);
      setProveedor({ nombre: '', contacto: '', telefono: '', email: '', localidad: '', plazoEntregaDias: '7' });
      setProveedorNuevo(false);
      await cargar();
      Alert.alert('Proveedor agregado', 'Ya está disponible para asignarlo a productos y pedidos.');
    } catch (error) {
      Alert.alert('No se pudo agregar el proveedor', error.message);
    }
  };

  const alternarProductoPedido = (producto) => {
    setItemsPedido((actuales) => {
      const existe = actuales.some((item) => String(item.productoId) === String(producto.id));
      if (existe) return actuales.filter((item) => String(item.productoId) !== String(producto.id));
      const sugerida = Math.max(1, umbralDe(producto) - stockDe(producto));
      return [...actuales, { productoId: producto.id, nombre: producto.nombre, stockActual: stockDe(producto), cantidad: String(sugerida) }];
    });
  };

  const cambiarCantidadPedido = (productoId, valor) => setItemsPedido((actuales) => actuales.map((item) => (
    String(item.productoId) === String(productoId) ? { ...item, cantidad: valor } : item
  )));

  const quitarProductoPedido = (productoId) => setItemsPedido((actuales) => actuales.filter((item) => String(item.productoId) !== String(productoId)));

  const seleccionarPrioritarios = () => {
    setItemsPedido((actuales) => {
      const ids = new Set(actuales.map((item) => String(item.productoId)));
      const nuevos = productosPrioritarios
        .filter((producto) => !ids.has(String(producto.id)))
        .map((producto) => ({
          productoId: producto.id,
          nombre: producto.nombre,
          stockActual: stockDe(producto),
          cantidad: String(Math.max(1, umbralDe(producto) - stockDe(producto))),
        }));
      return [...actuales, ...nuevos];
    });
  };

  const crearPedidoProveedor = async () => {
    const itemsValidos = itemsPedido.map((item) => ({ productoId: item.productoId, cantidad: Number(item.cantidad) }));
    if (!proveedorId || !itemsValidos.length) {
      Alert.alert('Pedido incompleto', 'Elegí primero un proveedor y seleccioná uno o más productos.');
      return;
    }
    if (itemsValidos.some((item) => !Number.isInteger(item.cantidad) || item.cantidad <= 0 || item.cantidad > 100000)) {
      Alert.alert('Cantidades inválidas', 'Cada producto seleccionado necesita una cantidad entera mayor que cero.');
      return;
    }
    if (fechaEstimada && !/^\d{4}-\d{2}-\d{2}$/.test(fechaEstimada)) {
      Alert.alert('Fecha inválida', 'Usá el formato AAAA-MM-DD.');
      return;
    }
    setGuardandoPedido(true);
    try {
      const resultado = await api('/admin/pedidos-proveedor', {
        method: 'POST',
        body: JSON.stringify({
          adminId: usuario.id,
          proveedorId,
          tipo: tipoPedido,
          fechaEstimadaRecepcion: fechaEstimada,
          notas,
          items: itemsValidos,
        }),
      });
      setItemsPedido([]);
      setNotas('');
      Alert.alert('Pedido al proveedor registrado', `Número ${resultado.numero}. El stock se actualizará automáticamente cuando marques la mercadería como recibida.`);
      await cargar();
    } catch (error) {
      Alert.alert('No se pudo registrar el pedido', error.message);
    } finally {
      setGuardandoPedido(false);
    }
  };

  const cambiarEstadoPedido = async (pedido, estado) => {
    const ejecutar = async () => {
      try {
        await api(`/admin/pedidos-proveedor/${pedido.id}/estado`, { method: 'PATCH', body: JSON.stringify({ adminId: usuario.id, estado }) });
        await cargar();
        if (estado === 'recibido') Alert.alert('Mercadería recibida', 'Las unidades se sumaron automáticamente al stock de todos los productos del pedido.');
      } catch (error) {
        Alert.alert('No se pudo actualizar el pedido', error.message);
      }
    };
    if (estado === 'recibido') {
      Alert.alert('Confirmar recepción', 'Solo marcá recibido cuando la mercadería haya llegado. Las cantidades se sumarán una sola vez al stock.', [
        { text: 'Volver', style: 'cancel' },
        { text: 'Recibí la mercadería', onPress: ejecutar },
      ]);
    } else {
      ejecutar();
    }
  };

  const cambiarEstadoAnticipado = async (pedido, estado) => {
    try {
      await api(`/admin/pedidos-anticipados/${pedido.id}/estado`, { method: 'PATCH', body: JSON.stringify({ adminId: usuario.id, estado }) });
      await cargar();
    } catch (error) {
      Alert.alert('No se pudo actualizar el pedido del cliente', error.message);
    }
  };

  const renderProveedor = (p) => {
    const pendientes = pedidosActivos.filter((pedido) => Number(pedido.proveedorId) === Number(p.id));
    return (
      <View key={p.id} style={styles.proveedorCard}>
        <View style={styles.filaTitulo}>
          <Text style={styles.nombre}>{p.nombre}</Text>
          <Text style={pendientes.length ? styles.badgePendiente : styles.badgeOk}>{pendientes.length ? `${pendientes.length} encargo(s) abierto(s)` : 'Sin encargos'}</Text>
        </View>
        <Text style={styles.ayuda}>{p.contacto || 'Sin contacto'} · {p.telefono || p.email || 'Sin teléfono'} · Entrega habitual: {p.plazoEntregaDias} días</Text>
      </View>
    );
  };

  if (!puedeStock && !puedePedidos && !puedeDestacados) {
    return <View style={styles.centrado}><Text style={styles.titulo}>Acceso no autorizado</Text><Text style={styles.ayuda}>La cuenta propietaria debe asignarte permisos de stock, proveedores, pedidos o productos destacados.</Text></View>;
  }
  if (cargando) return <View style={styles.centrado}><ActivityIndicator color="#A86616" size="large" /><Text style={styles.ayuda}>Cargando proveedores y stock…</Text></View>;

  const renderProductoParaPedido = (producto) => {
    const nivel = nivelDe(producto);
    const seleccionado = itemsPedido.some((item) => String(item.productoId) === String(producto.id));
    const item = itemsPedido.find((x) => String(x.productoId) === String(producto.id));
    const nivelLabel = nivel === 'agotado' ? 'AGOTADO' : nivel === 'bajo' ? `STOCK BAJO · ${stockDe(producto)}` : `STOCK OK · ${stockDe(producto)}`;
    return (
      <View key={producto.id} style={[styles.productoSeleccionable, styles[`producto_${nivel}`], seleccionado && styles.productoSeleccionado]}>
        <TouchableOpacity style={styles.filaSeleccionProducto} onPress={() => alternarProductoPedido(producto)} activeOpacity={0.8}>
          <View style={[styles.checkProducto, seleccionado && styles.checkProductoActivo]}><Text style={styles.checkProductoTexto}>{seleccionado ? '✓' : '+'}</Text></View>
          <View style={styles.datosProducto}>
            <Text style={styles.nombre}>{producto.nombre}</Text>
            <Text style={styles.stockDetalle}>Quedan {stockDe(producto)} · Mínimo configurado: {minimoDe(producto)} · Prioridad desde 5</Text>
          </View>
          <Text style={[styles.estadoStock, nivel === 'agotado' && styles.textoAgotado, nivel === 'bajo' && styles.textoBajo, nivel === 'correcto' && styles.textoCorrecto]}>{nivelLabel}</Text>
        </TouchableOpacity>
        {seleccionado && <View style={styles.filaCantidadSeleccionada}>
          <Text style={styles.label}>Cantidad a pedir</Text>
          <TextInput
            style={styles.inputCantidad}
            value={String(item?.cantidad ?? '1')}
            keyboardType="number-pad"
            onChangeText={(valor) => cambiarCantidadPedido(producto.id, valor.replace(/[^0-9]/g, ''))}
            placeholder="Cantidad"
          />
          <TouchableOpacity onPress={() => quitarProductoPedido(producto.id)}><Text style={styles.linkRojo}>Quitar</Text></TouchableOpacity>
        </View>}
      </View>
    );
  };

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Stock y proveedores</Text>
      <Text style={styles.descripcion}>Las ventas descuentan unidades automáticamente. Cuando recibís una reposición, el stock se suma una sola vez.</Text>

      {/* RESUMEN Y PROVEEDORES PRIMERO: no hay que recorrer todos los productos para ver encargos. */}
      <View style={styles.resumenFila}>
        <View style={styles.resumenCard}><Text style={styles.resumenNumero}>{datos.proveedores.length}</Text><Text style={styles.resumenTexto}>Proveedores</Text></View>
        <View style={styles.resumenCard}><Text style={[styles.resumenNumero, pedidosActivos.length > 0 && styles.textoBajo]}>{pedidosActivos.length}</Text><Text style={styles.resumenTexto}>Encargos abiertos</Text></View>
        <View style={styles.resumenCard}><Text style={[styles.resumenNumero, productosPrioritarios.length > 0 && styles.textoAgotado]}>{productosPrioritarios.length}</Text><Text style={styles.resumenTexto}>Productos a revisar</Text></View>
      </View>

      {(puedePedidos || esPropietario) && <View style={styles.seccionBloque}>
        <View style={styles.filaTitulo}>
          <Text style={styles.seccion}>Proveedores y encargos</Text>
          {esPropietario && <TouchableOpacity onPress={() => setProveedorNuevo((v) => !v)}><Text style={styles.link}>{proveedorNuevo ? 'Cerrar' : '+ Agregar proveedor'}</Text></TouchableOpacity>}
        </View>
        {datos.proveedores.length ? datos.proveedores
          .slice()
          .sort((a, b) => pedidosActivos.filter((p) => Number(p.proveedorId) === Number(b.id)).length - pedidosActivos.filter((p) => Number(p.proveedorId) === Number(a.id)).length || String(a.nombre).localeCompare(String(b.nombre)))
          .map(renderProveedor)
          : <Text style={styles.ayuda}>Todavía no hay proveedores registrados. La cuenta propietaria puede agregar el primero.</Text>}
        {proveedorNuevo && esPropietario && <View style={styles.tarjeta}>
          {[
            ['nombre', 'Nombre del proveedor'], ['contacto', 'Persona de contacto (opcional)'], ['telefono', 'Teléfono'], ['email', 'Correo'], ['localidad', 'Localidad'], ['plazoEntregaDias', 'Días habituales de entrega'],
          ].map(([campo, placeholder]) => <TextInput key={campo} style={styles.input} placeholder={placeholder} value={proveedor[campo]} keyboardType={campo === 'plazoEntregaDias' ? 'number-pad' : 'default'} onChangeText={(v) => setProveedor((a) => ({ ...a, [campo]: v }))} />)}
          <TouchableOpacity style={styles.botonPrincipal} onPress={crearProveedor}><Text style={styles.botonTexto}>Guardar proveedor</Text></TouchableOpacity>
        </View>}
      </View>}

      {puedePedidos && <View style={styles.tarjeta}>
        <Text style={styles.seccion}>Nuevo pedido a proveedor</Text>
        <Text style={styles.ayuda}>Elegí primero el proveedor y después todos los productos que necesites. Los productos agotados y los que tienen 5 unidades o menos aparecen arriba.</Text>
        <View style={styles.chips}>
          <TouchableOpacity style={[styles.chip, tipoPedido === 'reposicion' && styles.chipActivo]} onPress={() => setTipoPedido('reposicion')}><Text style={styles.chipTexto}>Reposición</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.chip, tipoPedido === 'pedido_grande' && styles.chipActivo]} onPress={() => setTipoPedido('pedido_grande')}><Text style={styles.chipTexto}>Pedido grande</Text></TouchableOpacity>
        </View>
        <Text style={styles.label}>1. Proveedor</Text>
        <View style={styles.chips}>
          {datos.proveedores.map((p) => <TouchableOpacity key={p.id} style={[styles.chip, String(proveedorId) === String(p.id) && styles.chipActivo]} onPress={() => setProveedorId(p.id)}><Text style={styles.chipTexto}>{p.nombre}</Text></TouchableOpacity>)}
        </View>
        {!datos.proveedores.length && <Text style={styles.avisoBajo}>Primero la cuenta propietaria debe agregar al menos un proveedor.</Text>}

        <Text style={styles.label}>2. Seleccioná varios productos</Text>
        <TextInput style={styles.input} value={busquedaProducto} onChangeText={setBusquedaProducto} placeholder="Buscar producto…" />
        <View style={styles.chips}>
          {[
            ['prioridad', `Prioridad (${productosPrioritarios.length})`],
            ['agotados', 'Agotados'],
            ['bajo', 'Stock bajo'],
            ['todos', 'Todos'],
          ].map(([valor, titulo]) => <TouchableOpacity key={valor} style={[styles.chip, filtroProductos === valor && styles.chipActivo]} onPress={() => setFiltroProductos(valor)}><Text style={styles.chipTexto}>{titulo}</Text></TouchableOpacity>)}
        </View>
        {productosPrioritarios.length > 0 && <View style={styles.filaAcciones}>
          <TouchableOpacity style={styles.botonPequeno} onPress={seleccionarPrioritarios}><Text style={styles.botonPequenoTexto}>Seleccionar todos los prioritarios</Text></TouchableOpacity>
          {itemsPedido.length > 0 && <TouchableOpacity style={styles.botonPequeno} onPress={() => setItemsPedido([])}><Text style={styles.botonPequenoTexto}>Limpiar selección</Text></TouchableOpacity>}
        </View>}
        <View style={styles.leyendaColores}>
          <Text style={styles.leyendaRoja}>Rojo: agotado</Text>
          <Text style={styles.leyendaNaranja}>Naranja: 5 o menos</Text>
          <Text style={styles.leyendaVerde}>Verde: stock suficiente</Text>
        </View>
        {productosFiltrados.map(renderProductoParaPedido)}
        {!productosFiltrados.length && <Text style={styles.ayuda}>No hay productos en este filtro.</Text>}
        <Text style={styles.resumenSeleccion}>{itemsPedido.length} producto(s) seleccionado(s)</Text>
        {itemsPedido.map((item) => <Text key={item.productoId} style={styles.ayuda}>• {item.nombre}: pedir {item.cantidad || '—'} (quedan {item.stockActual})</Text>)}
        <Text style={styles.label}>3. Fecha estimada de llegada (AAAA-MM-DD)</Text>
        <TextInput style={styles.input} value={fechaEstimada} onChangeText={setFechaEstimada} placeholder="2026-12-01" />
        <TextInput style={styles.input} value={notas} onChangeText={setNotas} placeholder="Notas para el proveedor (opcional)" maxLength={500} />
        <TouchableOpacity style={[styles.botonPrincipal, (!proveedorId || !itemsPedido.length || guardandoPedido) && styles.deshabilitado]} onPress={crearPedidoProveedor} disabled={!proveedorId || !itemsPedido.length || guardandoPedido}>
          <Text style={styles.botonTexto}>{guardandoPedido ? 'Enviando…' : tipoPedido === 'pedido_grande' ? `Registrar pedido grande (${itemsPedido.length})` : `Solicitar reposición (${itemsPedido.length})`}</Text>
        </TouchableOpacity>
        <Text style={styles.notaStock}>El pedido queda como solicitado. El inventario aumenta automáticamente cuando confirmes que la mercadería llegó; no aumenta al enviar el pedido porque todavía no está disponible para vender.</Text>
      </View>}

      {/* Los historiales quedan inmediatamente debajo del formulario de pedido al proveedor. */}
      {puedePedidos && <>
        <Text style={styles.seccion}>Historial de pedidos a proveedores</Text>
        {datos.pedidos.map((p) => <View key={p.id} style={styles.tarjeta}>
          <View style={styles.filaTitulo}>
            <Text style={styles.nombre}>{p.numero} · {p.proveedor}</Text>
            <Text style={styles.estadoPedido}>{etiquetaEstadoPedido(p.estado)}</Text>
          </View>
          <Text style={styles.ayuda}>{p.tipo === 'pedido_grande' ? 'Pedido grande' : 'Reposición'} · Llegada estimada: {p.fechaEstimada ? String(p.fechaEstimada).slice(0, 10) : 'A confirmar'}</Text>
          {(p.items || []).map((i) => <Text key={i.productoId} style={styles.ayuda}>• {i.cantidad} × {i.nombre}{p.estado === 'recibido' ? ` · Recibidas: ${i.cantidadRecibida ?? i.cantidad}` : ''}</Text>)}
          {['solicitado', 'confirmado', 'en_camino'].includes(p.estado) && <View style={styles.filaAcciones}>
            {p.estado === 'solicitado' && <TouchableOpacity style={styles.botonPequeno} onPress={() => cambiarEstadoPedido(p, 'confirmado')}><Text style={styles.botonPequenoTexto}>Proveedor confirmó</Text></TouchableOpacity>}
            {['solicitado', 'confirmado'].includes(p.estado) && <TouchableOpacity style={styles.botonPequeno} onPress={() => cambiarEstadoPedido(p, 'en_camino')}><Text style={styles.botonPequenoTexto}>Marcar en camino</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.botonRecibir} onPress={() => cambiarEstadoPedido(p, 'recibido')}><Text style={styles.botonRecibirTexto}>Recibí mercadería (+ stock)</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => cambiarEstadoPedido(p, 'cancelado')}><Text style={styles.linkRojo}>Cancelar pedido</Text></TouchableOpacity>
          </View>}
        </View>)}
        {!datos.pedidos.length && <Text style={styles.ayuda}>Todavía no hay pedidos a proveedores.</Text>}
      </>}

      {(esPropietario || puede('gestionar_pedidos')) && <>
        <Text style={styles.seccion}>Pedidos de clientes</Text>
        {datos.anticipados.map((p) => <View key={p.id} style={styles.tarjeta}>
          <Text style={styles.nombre}>{p.numero} · {p.cliente}</Text>
          <Text style={styles.ayuda}>{p.cantidad} × {p.producto} · Cuenta #{p.usuarioId}</Text>
          <Text style={styles.ayuda}>Necesita: {String(p.fechaDeseada).slice(0, 10)} · Reposición estimada: {p.fechaEstimada ? String(p.fechaEstimada).slice(0, 10) : 'A confirmar'}</Text>
          <Text style={styles.ayuda}>{p.modalidadEntrega === 'envio' ? `Envío: ${p.direccion}, ${p.localidad}` : 'Retira en el local'} · Pago: ${p.metodoPago}</Text>
          <Text style={styles.etiqueta}>{etiquetaEstadoAnticipado(p.estado)}</Text>
          {['pendiente_reposicion', 'producto_disponible'].includes(p.estado) && <View style={styles.chips}>
            {p.estado === 'producto_disponible' ? <TouchableOpacity style={styles.chipActivo} onPress={() => cambiarEstadoAnticipado(p, 'confirmado')}><Text style={styles.chipTexto}>Confirmar y reservar stock</Text></TouchableOpacity> : <Text style={styles.avisoBajo}>Esperando reposición: todavía no se puede confirmar.</Text>}
            <TouchableOpacity style={styles.chip} onPress={() => cambiarEstadoAnticipado(p, 'cancelado')}><Text style={styles.chipTexto}>Cancelar</Text></TouchableOpacity>
          </View>}
        </View>)}
        {!datos.anticipados.length && <Text style={styles.ayuda}>Todavía no hay pedidos de clientes.</Text>}
      </>}


      {(puedeStock || puedeDestacados) && <>
        <Text style={styles.seccion}>{puedeStock ? 'Inventario de productos a la venta' : 'Productos del día'}</Text>
        {productosOrdenados.map((producto) => {
          const f = formularios[producto.id] || {};
          const nivel = nivelDe({ ...producto, stockMinimo: f.stockMinimo ?? producto.stockMinimo });
          return (
            <View key={producto.id} style={[styles.tarjetaProducto, styles[`producto_${nivel}`]]}>
              <View style={styles.filaTitulo}>
                <Text style={styles.nombre}>{producto.nombre}</Text>
                <Text style={[styles.estadoStock, nivel === 'agotado' && styles.textoAgotado, nivel === 'bajo' && styles.textoBajo, nivel === 'correcto' && styles.textoCorrecto]}>{nivel === 'agotado' ? 'AGOTADO' : `${stockDe(producto)} disponibles`}</Text>
              </View>
              {puedeStock && <>
                <View style={styles.stockActualPanel}>
                  <Text style={styles.label}>Cantidad actual (solo lectura)</Text>
                  <Text style={styles.stockActualNumero}>{stockDe(producto)} unidades</Text>
                  <Text style={styles.ayuda}>Este número cambia automáticamente cuando se confirma una compra de cliente o cuando recibís mercadería de un proveedor. No existe una carga manual de unidades.</Text>
                </View>
                <View style={styles.filaCampos}>
                  <View style={styles.campoMitad}>
                    <Text style={styles.label}>Avisar cuando queden</Text>
                    <TextInput style={styles.input} value={f.stockMinimo ?? '0'} keyboardType="number-pad" onChangeText={(v) => cambiarFormulario(producto.id, 'stockMinimo', v.replace(/[^0-9]/g, ''))} />
                  </View>
                  <View style={styles.campoMitad}>
                    <Text style={styles.label}>Días estimados de reposición</Text>
                    <TextInput style={styles.input} keyboardType="number-pad" value={f.diasReposicionEstimados ?? '7'} onChangeText={(v) => cambiarFormulario(producto.id, 'diasReposicionEstimados', v.replace(/[^0-9]/g, ''))} />
                  </View>
                </View>
                <Text style={styles.label}>Proveedor habitual</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  <TouchableOpacity style={[styles.chip, !f.proveedorId && styles.chipActivo]} onPress={() => cambiarFormulario(producto.id, 'proveedorId', '')}><Text style={styles.chipTexto}>Sin asignar</Text></TouchableOpacity>
                  {datos.proveedores.map((p) => <TouchableOpacity key={p.id} style={[styles.chip, String(f.proveedorId) === String(p.id) && styles.chipActivo]} onPress={() => cambiarFormulario(producto.id, 'proveedorId', String(p.id))}><Text style={styles.chipTexto}>{p.nombre}</Text></TouchableOpacity>)}
                </ScrollView>
                <TouchableOpacity style={styles.botonGuardarStock} onPress={() => guardarStock(producto)} disabled={guardandoId === producto.id}>
                  <Text style={styles.botonTexto}>{guardandoId === producto.id ? 'Guardando…' : 'Guardar configuración de reposición'}</Text>
                </TouchableOpacity>
              </>}
              {puedeDestacados && <View style={styles.filaDestacado}>
                <View style={{ flex: 1, marginRight: 10 }}><Text style={styles.labelDestacado}>Mostrar en Productos del día</Text><Text style={styles.ayuda}>Orden en la calesita (1 aparece primero)</Text><TextInput style={styles.inputOrden} value={f.destacadoOrden ?? '0'} keyboardType="number-pad" onChangeText={(v) => cambiarFormulario(producto.id, 'destacadoOrden', v.replace(/[^0-9]/g, ''))} /><TouchableOpacity onPress={() => guardarOrdenDestacado(producto)}><Text style={styles.link}>Guardar orden</Text></TouchableOpacity></View>
                <Switch value={Boolean(producto.destacadoDia)} onValueChange={(v) => alternarDestacado(producto, v)} trackColor={{ true: '#E5A33A' }} />
              </View>}
            </View>
          );
        })}
      </>}

      <TouchableOpacity style={styles.actualizar} onPress={cargar}><Text style={styles.link}>Actualizar información</Text></TouchableOpacity>
      {!!errorCarga && <Text style={styles.errorCarga}>{errorCarga}</Text>}
    </ScrollView>
  );
}

function etiquetaEstadoPedido(estado) {
  return ({ solicitado: 'Solicitado', confirmado: 'Proveedor confirmó', en_camino: 'En camino', recibido: 'Recibido', cancelado: 'Cancelado' })[estado] || estado;
}
function etiquetaEstadoAnticipado(estado) {
  return ({ pendiente_reposicion: 'Esperando reposición', producto_disponible: 'Producto disponible', confirmado: 'Pedido confirmado', cancelado: 'Cancelado' })[estado] || estado;
}

const styles = StyleSheet.create({
  stockActualPanel: { backgroundColor: '#F7EBD5', borderRadius: 10, padding: 11, marginBottom: 10 },
  stockActualNumero: { color: '#35230E', fontSize: 22, fontWeight: 'bold', marginTop: 3 },
  fondo: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 15, paddingBottom: 60 },
  centrado: { flex: 1, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', padding: 24 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#35230E' },
  descripcion: { color: '#6F5B43', lineHeight: 19, marginTop: 6, marginBottom: 12 },
  seccion: { fontSize: 17, fontWeight: 'bold', color: '#80500F', marginTop: 16, marginBottom: 8 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 11, padding: 13, marginBottom: 10 },
  tarjetaProducto: { borderRadius: 11, borderWidth: 1, padding: 13, marginBottom: 10 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { flex: 1, color: '#35230E', fontWeight: 'bold' },
  nombreMini: { color: '#65420F', fontWeight: 'bold', fontSize: 13 },
  etiqueta: { color: '#7B5B2A', fontSize: 12, marginTop: 5 },
  estadoStock: { fontSize: 11, fontWeight: 'bold' },
  agotado: { color: '#B42318', fontWeight: 'bold' },
  stockBajo: { color: '#B26A00', fontWeight: 'bold' },
  textoAgotado: { color: '#A61B1B' },
  textoBajo: { color: '#A85D00' },
  textoCorrecto: { color: '#267444' },
  producto_agotado: { backgroundColor: '#FDE8E7', borderColor: '#F0B6B2' },
  producto_bajo: { backgroundColor: '#FFF1D6', borderColor: '#F0D09A' },
  producto_correcto: { backgroundColor: '#EAF6EC', borderColor: '#B8D9BF' },
  filaCampos: { flexDirection: 'row', gap: 9, alignItems: 'flex-end', marginTop: 8 },
  campoMitad: { flex: 1 },
  label: { color: '#66533D', fontSize: 12, marginBottom: 5, marginTop: 7 },
  input: { backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: '#E8D9C2', borderRadius: 8, padding: 10, color: '#39280F', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 6 },
  chip: { borderWidth: 1, borderColor: '#E7C48D', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, marginRight: 5, marginBottom: 5 },
  chipActivo: { backgroundColor: '#FFD995', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, marginRight: 5, marginBottom: 5 },
  chipTexto: { color: '#65420F', fontSize: 12, fontWeight: '600' },
  botonGuardarStock: { backgroundColor: '#FFE4B5', borderRadius: 8, alignItems: 'center', padding: 12, marginBottom: 8 },
  botonPrincipal: { backgroundColor: '#E8A23A', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 6 },
  botonTexto: { color: '#38240D', fontWeight: 'bold' },
  deshabilitado: { opacity: 0.5 },
  avisoBajo: { color: '#B26A00', fontSize: 12, marginTop: 6 },
  filaDestacado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3EBDD', marginTop: 8, paddingTop: 5 },
  labelDestacado: { color: '#66533D', fontSize: 13 },
  proveedorCard: { backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#EAD9BA', borderRadius: 10, padding: 12, marginBottom: 8 },
  proveedorFila: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F3EBDD' },
  proveedorFilaDummy: { color: '#806B4E' },
  proveedorNombre: { color: '#35230E', fontWeight: 'bold' },
  badgePendiente: { color: '#9A4B00', backgroundColor: '#FFE1B8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: 'bold' },
  badgeOk: { color: '#267444', backgroundColor: '#E1F1E4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: 'bold' },
  pedidoProveedorMini: { borderTopWidth: 1, borderTopColor: '#F1E3CB', marginTop: 9, paddingTop: 8 },
  estadoPedido: { color: '#79552A', fontSize: 11, fontWeight: '600', marginTop: 3 },
  filaAcciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  botonPequeno: { borderWidth: 1, borderColor: '#D8B679', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6, marginTop: 5 },
  botonPequenoTexto: { color: '#80500F', fontSize: 11, fontWeight: 'bold' },
  botonRecibir: { backgroundColor: '#DCEFE0', borderRadius: 7, padding: 9, marginTop: 7, alignItems: 'center' },
  botonRecibirTexto: { color: '#24643B', fontSize: 12, fontWeight: 'bold' },
  ayuda: { color: '#806B4E', fontSize: 12, lineHeight: 17, marginTop: 3 },
  formularioProveedor: { marginTop: 10 },
  link: { color: '#A86616', fontWeight: 'bold' },
  linkRojo: { color: '#B42318', fontWeight: 'bold', marginLeft: 8 },
  lineaPedido: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  actualizar: { padding: 12, alignItems: 'center' },
  resumenFila: { flexDirection: 'row', gap: 7, marginTop: 8, marginBottom: 4 },
  resumenCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFE1CB', borderRadius: 10, padding: 9 },
  resumenNumero: { color: '#65420F', fontSize: 19, fontWeight: 'bold' },
  resumenTexto: { color: '#806B4E', fontSize: 10, marginTop: 2 },
  seccionBloque: { marginBottom: 5 },
  productoSeleccionable: { borderWidth: 1, borderRadius: 9, padding: 10, marginBottom: 7 },
  productoSeleccionado: { borderWidth: 2, borderColor: '#A86616' },
  filaSeleccionProducto: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkProducto: { width: 25, height: 25, borderRadius: 7, borderWidth: 1, borderColor: '#A78B63', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF8' },
  checkProductoActivo: { backgroundColor: '#E8A23A', borderColor: '#A86616' },
  checkProductoTexto: { color: '#51350F', fontWeight: 'bold' },
  datosProducto: { flex: 1 },
  stockDetalle: { color: '#745F44', fontSize: 10, marginTop: 3 },
  filaCantidadSeleccionada: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#EAD9BA', paddingTop: 6, marginTop: 8 },
  inputCantidad: { width: 84, borderWidth: 1, borderColor: '#D7B77D', borderRadius: 7, backgroundColor: '#FFFDF8', padding: 8, color: '#39280F', textAlign: 'center' },
  leyendaColores: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 5 },
  leyendaRoja: { color: '#A61B1B', fontSize: 10, fontWeight: 'bold' },
  leyendaNaranja: { color: '#A85D00', fontSize: 10, fontWeight: 'bold' },
  leyendaVerde: { color: '#267444', fontSize: 10, fontWeight: 'bold' },
  resumenSeleccion: { color: '#65420F', fontWeight: 'bold', marginTop: 8 },
  notaStock: { color: '#806B4E', fontSize: 11, lineHeight: 16, marginTop: 8 },
  inputOrden: { backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: '#E8D9C2', borderRadius: 8, padding: 8, color: '#39280F', marginTop: 5, width: 90 },
  errorCarga: { color: '#A61B1B', fontSize: 11, marginTop: 10 },
});
