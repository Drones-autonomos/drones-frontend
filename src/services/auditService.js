/**
 * Servicio de Auditoría para AeroLuferan.
 * Consume el registro criptográfico inmutable del backend:
 *   GET /audit/export  → reporte JSON con verificación de cadena SHA-256 (ADMIN)
 */

import apiClient from './apiClient.js'

/**
 * Obtiene el reporte completo de auditoría del servidor:
 * { integridad: { chain_valid, total_records, sealed_records }, registros: [...] }.
 */
export async function fetchAuditExport() {
  return apiClient.get('/audit/export')
}

/**
 * Lista los últimos eventos del registro de auditoría (GET /audit/, solo ADMIN).
 * Acepta { limit = 50, accion, usuarioId } como filtros del backend.
 * Devuelve el arreglo de registros ordenados del más reciente al más antiguo.
 */
export async function fetchAuditLogs({ limit = 50, accion, usuarioId } = {}) {
  const query = { limit }
  if (accion) query.accion = accion
  if (usuarioId !== undefined && usuarioId !== null) query.usuario_id = usuarioId
  return apiClient.get('/audit/', { query })
}

/**
 * Genera y descarga el archivo JSON del registro criptográfico de auditoría.
 * Retorna { filename } para que la UI muestre confirmación.
 */
export async function downloadAuditExport() {
  const report = await fetchAuditExport()

  const filename = `AeroLuferan_Registro_Auditoria_${new Date().toISOString().slice(0, 10)}.json`
  const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(jsonBlob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
  return { filename }
}
