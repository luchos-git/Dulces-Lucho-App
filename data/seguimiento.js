// explicación del archivo: define las etapas del pedido y calcula qué etapa corresponde según el tiempo transcurrido
// ---------------------------------------------------------------------------
// ETAPAS DEL SEGUIMIENTO DEL PEDIDO — es una SIMULACIÓN
//
// "desdeSeg" son los segundos, contados desde que se confirma la compra, en los
// que empieza cada etapa. Están cortos a propósito para poder mostrarlo en una
// demo; si querés más tiempo, cambiá esos números.
//
// Las etapas con "aviso" mandan una notificación al celular.
// "destacado" pinta la etapa en naranja en la pantalla.
// ---------------------------------------------------------------------------
export const PASOS_ENVIO = [
  { icono: '🧾', titulo: 'Pedido confirmado', detalle: 'Recibimos tu pedido.', desdeSeg: 0 },
  { icono: '📦', titulo: 'Preparando tu pedido', detalle: 'Estamos armando tu pedido.', desdeSeg: 10 },
  {
    icono: '🛵',
    titulo: 'Tu pedido está en camino',
    detalle: 'Ya salió hacia tu dirección.',
    desdeSeg: 25,
    aviso: { titulo: 'Tu pedido está en camino 🛵', cuerpo: 'Ya salió hacia tu dirección.' },
  },
  {
    icono: '📍',
    titulo: 'Tu pedido está cerca',
    detalle: 'Llega en unos minutos. ¡Estate atento!',
    desdeSeg: 45,
    destacado: true,
    aviso: { titulo: 'Tu pedido está cerca 📍', cuerpo: 'Llega en unos minutos. ¡Estate atento!' },
  },
  {
    icono: '✅',
    titulo: 'Entregado',
    detalle: '¡Que lo disfrutes!',
    desdeSeg: 65,
    aviso: { titulo: 'Tu pedido fue entregado ✅', cuerpo: '¡Que lo disfrutes!' },
  },
];

export const PASOS_RETIRO = [
  { icono: '🧾', titulo: 'Pedido confirmado', detalle: 'Recibimos tu pedido.', desdeSeg: 0 },
  { icono: '📦', titulo: 'Preparando tu pedido', detalle: 'Estamos armando tu pedido.', desdeSeg: 10 },
  {
    icono: '🏪',
    titulo: 'Listo para retirar',
    detalle: 'Pasá a retirarlo por el local.',
    desdeSeg: 25,
    destacado: true,
    aviso: { titulo: 'Tu pedido está listo para retirar 🏪', cuerpo: 'Pasá a buscarlo por el local.' },
  },
];

// Qué lista de etapas corresponde a un pedido
export function pasosDe(pedido) {
  return pedido.conEnvio ? PASOS_ENVIO : PASOS_RETIRO;
}

// Índice de la etapa en la que está el pedido, según los segundos que pasaron
export function indicePaso(pasos, segundosTranscurridos) {
  let indice = 0;
  pasos.forEach((paso, i) => {
    if (segundosTranscurridos >= paso.desdeSeg) indice = i;
  });
  return indice;
}
