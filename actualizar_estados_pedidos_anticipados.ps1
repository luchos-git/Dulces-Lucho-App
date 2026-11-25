$ErrorActionPreference = 'Stop'

$serverPath = Join-Path $PSScriptRoot 'backend\src\server.js'
if (-not (Test-Path $serverPath)) {
  throw "No encontré backend\src\server.js. Extraé este paquete en la carpeta principal Dulces-Lucho-App."
}

$contenido = [System.IO.File]::ReadAllText($serverPath)
$inicioMarker = "app.patch('/api/admin/pedidos-anticipados/:id/estado'"
$finMarker = '// Las rutas de inventario de materias primas fueron retiradas.'
$inicio = $contenido.IndexOf($inicioMarker, [System.StringComparison]::Ordinal)
if ($inicio -lt 0) {
  throw "No encontré la ruta actual de pedidos anticipados. No se modificó server.js. Compartime tu backend/src/server.js para adaptar el parche."
}
$fin = $contenido.IndexOf($finMarker, $inicio, [System.StringComparison]::Ordinal)
if ($fin -lt 0 -or $fin -le $inicio) {
  throw "No encontré el final esperado de la ruta de pedidos anticipados. No se modificó server.js."
}

$reemplazo = @'
app.patch('/api/admin/pedidos-anticipados/:id/estado', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  if (!await verificarPermisoAdmin(req, 'gestionar_pedidos', adminId)) {
    return res.status(403).json({ error: 'No tenés permiso para actualizar pedidos anticipados.' });
  }

  const id = Number(req.params.id);
  const estado = String(req.body?.estado || '');
  const estadosValidos = [
    'confirmado', 'preparando', 'en_camino',
    'listo_para_retirar', 'entregado', 'cancelado',
  ];

  if (!Number.isInteger(id) || id <= 0 || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'El ID o estado no son válidos.' });
  }

  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    const [[pedido]] = await conexion.query(
      `SELECT id, producto_id AS productoId, cantidad, estado,
        modalidad_entrega AS modalidadEntrega
       FROM pedidos_anticipados WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (!pedido) {
      await conexion.rollback();
      return res.status(404).json({ error: 'No se encontró el pedido anticipado.' });
    }

    // Repetir el mismo estado no vuelve a reservar ni a devolver unidades.
    if (pedido.estado === estado) {
      await conexion.commit();
      return res.json({ ok: true, id, estado, sinCambios: true });
    }

    const transiciones = {
      pendiente_reposicion: ['cancelado'],
      producto_disponible: ['confirmado', 'cancelado'],
      confirmado: ['preparando', 'cancelado'],
      en_camino: ['entregado'],
      listo_para_retirar: ['entregado'],
    };

    let permitidos = transiciones[pedido.estado] || [];
    if (pedido.estado === 'preparando') {
      const siguiente = pedido.modalidadEntrega === 'envio'
        ? 'en_camino'
        : 'listo_para_retirar';
      permitidos = [siguiente, 'cancelado'];
    }

    if (!permitidos.includes(estado)) {
      await conexion.rollback();
      return res.status(409).json({
        error: `No se puede pasar el pedido de ${pedido.estado} a ${estado}. Revisá el estado actual y el tipo de entrega.`,
      });
    }

    let stockReservado = false;
    let stockDevuelto = false;

    // La tienda confirma el pedido y reserva las unidades en ese momento.
    if (estado === 'confirmado') {
      if (pedido.estado !== 'producto_disponible') {
        await conexion.rollback();
        return res.status(409).json({ error: 'Todavía no se recibió la reposición. No se puede confirmar este pedido.' });
      }

      const [[producto]] = await conexion.query(
        'SELECT stock_disponible AS stockDisponible FROM productos WHERE id = ? AND activo = 1 FOR UPDATE',
        [pedido.productoId]
      );

      if (!producto) {
        await conexion.rollback();
        return res.status(404).json({ error: 'El producto ya no está disponible.' });
      }

      const stockActual = Number(producto.stockDisponible || 0);
      if (stockActual < Number(pedido.cantidad)) {
        await conexion.rollback();
        return res.status(409).json({
          error: `No hay unidades suficientes para confirmar. Disponibles: ${stockActual}.`,
        });
      }

      await conexion.query(
        'UPDATE productos SET stock_disponible = stock_disponible - ? WHERE id = ?',
        [Number(pedido.cantidad), pedido.productoId]
      );
      stockReservado = true;
    }

    // Si se cancela antes del despacho, se liberan las unidades reservadas.
    if (estado === 'cancelado' && ['confirmado', 'preparando'].includes(pedido.estado)) {
      await conexion.query(
        'UPDATE productos SET stock_disponible = COALESCE(stock_disponible, 0) + ? WHERE id = ?',
        [Number(pedido.cantidad), pedido.productoId]
      );
      stockDevuelto = true;
    }

    await conexion.query(
      'UPDATE pedidos_anticipados SET estado = ? WHERE id = ?',
      [estado, id]
    );

    await conexion.commit();
    res.json({ ok: true, id, estado, stockReservado, stockDevuelto });
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error('Error al actualizar pedido anticipado:', error.message);
    res.status(500).json({
      error: 'No se pudo actualizar el pedido anticipado.',
      ...(process.env.NODE_ENV === 'production'
        ? {}
        : { codigo: error.code || null, detalle: error.sqlMessage || error.message }),
    });
  } finally {
    conexion.release();
  }
});

'@

$backupPath = "$serverPath.backup-pedidos-anticipados-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
[System.IO.File]::Copy($serverPath, $backupPath, $false)
$antes = $contenido.Substring(0, $inicio)
$despues = $contenido.Substring($fin)
$actualizado = $antes + $reemplazo + $despues
$utf8SinBOM = New-Object System.Text.UTF8Encoding -ArgumentList $false
[System.IO.File]::WriteAllText($serverPath, $actualizado, $utf8SinBOM)

Write-Host 'Se actualizó únicamente la ruta de pedidos anticipados.' -ForegroundColor Green
Write-Host "Copia de seguridad: $backupPath"
Write-Host 'No se modificaron otras rutas, pagos, carrito, envíos ni tablas.'
