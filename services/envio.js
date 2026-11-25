// explicación del archivo: React solicita el cálculo al backend; el celular no consulta directamente los servicios de mapas.
import { api } from './api';

export const UMBRAL_GRATIS_KM = 1.5;

export async function calcularEnvio(direccion, localidad = '') {
  if (!String(direccion || '').trim()) throw new Error('Escribí la calle y el número.');
  if (!String(localidad || '').trim()) throw new Error('Escribí la localidad de entrega.');

  return api('/envios/calcular', {
    method: 'POST',
    body: JSON.stringify({
      direccionCliente: String(direccion).trim(),
      localidadCliente: String(localidad).trim(),
    }),
  });
}
