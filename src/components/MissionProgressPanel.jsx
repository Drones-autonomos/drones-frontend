import { useState } from 'react'
import { CheckIcon } from './EnVivoIcons.jsx'

const ESTADO_LABEL = {
  EN_CURSO: 'En curso',
  PROGRAMADA: 'Programada',
  CANCELANDO: 'Cancelando',
  RECUPERACION: 'Recuperación',
}

const ESTADO_CLASS = {
  EN_CURSO: 'en-curso',
  PROGRAMADA: 'programada',
  CANCELANDO: 'cancelando',
  RECUPERACION: 'recuperacion',
}

const PAGE_SIZE = 3

function formatCoord(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(5) : '—'
}

/**
 * Panel de progreso de la misión relevante (EN_CURSO/PROGRAMADA/etc.):
 * barra de avance y timeline de waypoints marcando completados, el hito
 * actual y los pendientes. Consume la misión ya mapeada por telemetryService
 * (`raw.mission`), sin llamadas extra al backend.
 *
 * La lista está paginada (PAGE_SIZE registros por página) y sigue
 * automáticamente al waypoint en curso hasta que el usuario navega.
 */
export default function MissionProgressPanel({ mission }) {
  const waypoints = Array.isArray(mission?.backendWaypoints) ? mission.backendWaypoints : []
  const total = waypoints.length
  const completed = Math.min(Math.max(mission?.waypoints_completados ?? 0, 0), total)
  const inFlight = mission?.estado === 'EN_CURSO' || mission?.estado === 'CANCELANDO'
  const pct = total ? Math.round((completed / total) * 100) : 0

  // Ítems paginables: waypoints + fila de regreso/aterrizaje cuando aplica
  const showReturnItem = inFlight && completed >= total
  const itemCount = total + (showReturnItem ? 1 : 0)
  const pageCount = Math.max(1, Math.ceil(itemCount / PAGE_SIZE))

  // Página "en vivo": la que contiene el hito actual (o la fila de retorno).
  // nav.anchor guarda `completed` al hacer clic; si completed cambia, se
  // vuelve a seguir automáticamente el progreso.
  const autoPage = Math.min(Math.floor(completed / PAGE_SIZE), pageCount - 1)
  const [nav, setNav] = useState({ page: 0, anchor: null })
  const page = nav.anchor === completed ? Math.min(nav.page, pageCount - 1) : autoPage
  const goTo = (next) => setNav({ page: next, anchor: completed })

  const pageStart = page * PAGE_SIZE
  const pageWaypoints = waypoints.slice(pageStart, pageStart + PAGE_SIZE)
  const showReturnOnPage = showReturnItem && total >= pageStart && total < pageStart + PAGE_SIZE

  return (
    <section className="mission-progress" aria-label="Progreso de la misión">
      <header className="mission-progress__head">
        <div className="mission-progress__title-wrap">
          <h2>Progreso de Misión</h2>
          <span className="mission-progress__mission-name">
            {mission ? mission.name : 'Sin misión activa ni programada'}
          </span>
        </div>
        {mission && (
          <span
            className={`mission-progress__badge mission-progress__badge--${ESTADO_CLASS[mission.estado] || 'otra'}`}
          >
            {ESTADO_LABEL[mission.estado] || mission.estado}
          </span>
        )}
      </header>

      {!mission && (
        <p className="mission-progress__empty">
          Cuando haya una misión programada o en curso verás aquí su avance waypoint a waypoint.
        </p>
      )}

      {mission && total === 0 && (
        <p className="mission-progress__empty">
          La misión seleccionada no tiene waypoints registrados.
        </p>
      )}

      {mission && total > 0 && (
        <>
          <div
            className="mission-progress__bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance de la misión: ${completed} de ${total} waypoints`}
          >
            <span style={{ width: `${pct}%` }} />
          </div>

          <ol className="mission-progress__list">
            {pageWaypoints.map((wp, i) => {
              const idx = pageStart + i
              const done = idx < completed
              const current = inFlight && idx === completed
              const hover = Number(wp.hover_segundos) || 0
              return (
                <li
                  key={wp.orden_waypoint ?? idx}
                  className={`mission-progress__item${done ? ' mission-progress__item--done' : ''}${current ? ' mission-progress__item--current' : ''}`}
                >
                  <span className="mission-progress__node" aria-hidden="true">
                    {done ? <CheckIcon /> : (wp.orden_waypoint ?? idx + 1)}
                  </span>
                  <div className="mission-progress__body">
                    <span className="mission-progress__wp">
                      Waypoint {wp.orden_waypoint ?? idx + 1}
                      {current ? ' · en curso' : ''}
                    </span>
                    <span className="mission-progress__meta">
                      <span>{formatCoord(wp.latitud)}, {formatCoord(wp.longitud)}</span>
                      <span>{wp.altitud_metros != null ? `${wp.altitud_metros} m AGL` : '—'}</span>
                      {hover > 0 && <span>espera {hover} s</span>}
                    </span>
                  </div>
                </li>
              )
            })}
            {showReturnOnPage && (
              <li className="mission-progress__item mission-progress__item--current">
                <span className="mission-progress__node" aria-hidden="true">
                  ⌂
                </span>
                <div className="mission-progress__body">
                  <span className="mission-progress__wp">Regreso y aterrizaje en base</span>
                  <span className="mission-progress__meta">
                    <span>Todos los waypoints completados</span>
                  </span>
                </div>
              </li>
            )}
          </ol>

          {pageCount > 1 && (
            <nav className="mission-progress__pager" aria-label="Paginación de waypoints">
              <button
                type="button"
                className="mission-progress__pager-btn"
                disabled={page === 0}
                onClick={() => goTo(page - 1)}
                aria-label="Página anterior"
              >
                ‹ Anterior
              </button>
              <span className="mission-progress__pager-info">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="mission-progress__pager-btn"
                disabled={page >= pageCount - 1}
                onClick={() => goTo(page + 1)}
                aria-label="Página siguiente"
              >
                Siguiente ›
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
