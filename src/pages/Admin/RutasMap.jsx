import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CompassTargetIcon } from '../../components/RutasIcons.jsx'
import { CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM } from './rutasData.js'
import { PATROL_BASES } from './presetRoutes.js'

export default function RutasMap({
  ref = null,
  geofences = [],
  selectedRoute = null,
  // Todas las misiones con ruta: se dibujan atenuadas; la seleccionada destaca
  missionRoutes = [],
  isDrawingMode = false,
  onZoneCreated = null,
  onCancelDrawing = null,
  // Props para Waypoints interactivos en Programar Ruta
  waypoints = null,
  onWaypointsChange = null,
  allowWaypointEditing = false,
  tileMode = 'satellite', // 'satellite' | 'streets'
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const layersGroupRef = useRef(null)
  const tileLayerRef = useRef(null)
  const labelLayerRef = useRef(null)
  const drawingStateRef = useRef({ tempRect: null })
  const [firstCorner, setFirstCorner] = useState(null)

  // API imperativa para centrar una zona/misión desde el exterior del mapa.
  useImperativeHandle(ref, () => ({
    flyToBounds(bounds) {
      const map = mapInstanceRef.current
      if (!map || !bounds) return
      map.flyToBounds(L.latLngBounds(bounds).pad(0.2), { maxZoom: 18 })
    },
  }))

  // Inicialización del mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: CAMPUS_CENTER,
      zoom: CAMPUS_DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 19,
      minZoom: 14,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Configurar capa de mapa base
    if (tileMode === 'streets') {
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 },
      ).addTo(map)
      tileLayerRef.current = osm
    } else {
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, subdomains: ['server', 'services'] },
      ).addTo(map)
      const labels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, opacity: 0.85 },
      ).addTo(map)
      tileLayerRef.current = sat
      labelLayerRef.current = labels
    }

    const layersGroup = L.layerGroup().addTo(map)
    layersGroupRef.current = layersGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [tileMode])

  // Renderizar geocercas, marcadores de campus y waypoints
  useEffect(() => {
    const map = mapInstanceRef.current
    const group = layersGroupRef.current
    if (!map || !group) return

    group.clearLayers()

    // 1. Dibujar geocercas registradas compartidas
    geofences.forEach((zone) => {
      if (zone.status === 'Inactiva') return

      const isRestricted = zone.type === 'restringida'
      const isWarning = zone.type === 'advertencia'

      const strokeColor = isRestricted ? '#ef4444' : isWarning ? '#f59e0b' : '#0284c7'
      const fillColor = isRestricted ? '#ef4444' : isWarning ? '#f59e0b' : '#0284c7'

      const shapeStyle = {
        color: strokeColor,
        weight: 2.2,
        dashArray: '6, 6',
        fillColor: fillColor,
        fillOpacity: 0.12,
        interactive: true,
      }

      // Geometría real según el tipo de zona: círculo (CIRCULAR del backend),
      // polígono (vértices exactos) o rectángulo envolvente (fallback local).
      let rect
      if (zone.circulo?.centro && zone.circulo.radioMetros > 0) {
        rect = L.circle(zone.circulo.centro, {
          ...shapeStyle,
          radius: zone.circulo.radioMetros,
        })
      } else if (Array.isArray(zone.poligono) && zone.poligono.length >= 3) {
        rect = L.polygon(zone.poligono, shapeStyle)
      } else {
        rect = L.rectangle(zone.bounds, shapeStyle)
      }

      rect.bindTooltip(
        `<strong>${zone.name}</strong><br/>Tipo: ${zone.type}${zone.restrictionReason ? `<br/><em>${zone.restrictionReason}</em>` : ''}`,
        { direction: 'top', className: 'geofence-tooltip' },
      )

      rect.addTo(group)

      // Etiqueta flotante con el badgeCode de la zona (si lo tiene)
      if (zone.badgeCode) {
        const corner = [zone.bounds[1][0], zone.bounds[0][1]]
        const badgeIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div class="map-badge-group">
              <span class="map-circle-badge">${zone.badgeCode}</span>
              <span class="map-badge-label">${zone.name}</span>
            </div>
          `,
          iconSize: [80, 30],
          iconAnchor: [15, 15],
        })
        L.marker(corner, { icon: badgeIcon, interactive: false }).addTo(group)
      }
    })

    // 2. Marcadores fijos de Helipuertos
    const heliNorteIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="map-helipad-badge">
          <span>H-N</span>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })
    L.marker([20.7045, -100.4440], { icon: heliNorteIcon })
      .bindTooltip('Helipuerto Base Norte', { direction: 'top' })
      .addTo(group)

    const heliSurIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="map-helipad-badge map-helipad-badge--sur">
          <span>H-S</span>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })
    L.marker([20.7018, -100.4435], { icon: heliSurIcon })
      .bindTooltip('Helipuerto Base Sur', { direction: 'bottom' })
      .addTo(group)

    // 2b. Bases de patrullaje reales (HOME + Base 1 + Base 2) — estilo propio
    // inline para no depender del CSS de la página contenedora.
    PATROL_BASES.forEach((base) => {
      const bg = base.id === 'home' ? '#059669' : '#7c3aed'
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;transform:translateY(-4px);">
            <div style="background:${bg};color:#fff;font-size:9px;font-weight:800;padding:3px 7px;border-radius:999px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);white-space:nowrap;">${base.label}</div>
          </div>`,
        iconSize: [54, 22],
        iconAnchor: [27, 11],
      })
      L.marker(base.coords, { icon, interactive: false })
        .bindTooltip(base.tooltip, { direction: 'top' })
        .addTo(group)
    })

    // 2c. Rutas de todas las misiones programadas (atenuadas; la seleccionada
    // se dibuja después con énfasis y badges de waypoints).
    const selectedId = selectedRoute?.id ?? null
    missionRoutes.forEach((route) => {
      if (!Array.isArray(route?.waypoints) || route.waypoints.length < 2) return
      if (route.id === selectedId) return // la seleccionada va abajo con badges
      L.polyline(route.waypoints, {
        color: '#94a3b8',
        weight: 2.4,
        opacity: 0.75,
        dashArray: '5, 7',
      })
        .bindTooltip(
          `<strong>${route.name || `Misión ${route.id}`}</strong><br/>${route.waypoints.length} waypoints · ${route.status || ''}`,
          { sticky: true },
        )
        .addTo(group)
    })

    // 3. Waypoints activos: interactivos o de ruta seleccionada
    const activeWaypoints = waypoints || selectedRoute?.waypoints || []

    if (activeWaypoints.length > 0) {
      // Dibujar polilínea de trayectoria
      if (activeWaypoints.length > 1) {
        L.polyline(activeWaypoints, {
          color: '#0284c7',
          weight: 3.8,
          opacity: 0.95,
          dashArray: '8, 8',
        }).addTo(group)
      }

      // Dibujar marcadores de waypoints
      activeWaypoints.forEach((pt, idx) => {
        const isFirst = idx === 0
        const isLast = idx === activeWaypoints.length - 1 && activeWaypoints.length > 1

        const label = isFirst ? 'E2' : isLast ? 'A' : `P${idx + 1}`

        const wpIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div class="map-waypoint-badge${isFirst ? ' is-start' : isLast ? ' is-end' : ''}">
              ${label}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const marker = L.marker(pt, {
          icon: wpIcon,
          draggable: allowWaypointEditing,
        }).addTo(group)

        // Manejar arrastre de waypoints
        if (allowWaypointEditing && onWaypointsChange) {
          marker.on('dragend', (e) => {
            const newPos = [e.target.getLatLng().lat, e.target.getLatLng().lng]
            const updated = [...activeWaypoints]
            updated[idx] = newPos
            onWaypointsChange(updated)
          })

          // Clic para eliminar punto si hay más de 2
          if (activeWaypoints.length > 2) {
            marker.bindPopup(
              `<div style="text-align: center; font-size: 11px;">
                <strong>Punto ${label}</strong><br/>
                <button type="button" style="background:#ef4444; color:#fff; border:none; border-radius:4px; padding:3px 8px; cursor:pointer; margin-top:4px;" id="del-wp-${idx}">
                  Eliminar
                </button>
              </div>`,
            )

            marker.on('popupopen', () => {
              const btn = document.getElementById(`del-wp-${idx}`)
              if (btn) {
                btn.onclick = () => {
                  const updated = activeWaypoints.filter((_, i) => i !== idx)
                  // Segundo argumento: índice eliminado, para que el consumidor
                  // realinee metadatos por-waypoint (p. ej. hovers).
                  onWaypointsChange(updated, idx)
                }
              }
            })
          }
        }
      })
    }
  }, [geofences, selectedRoute, missionRoutes, waypoints, allowWaypointEditing, onWaypointsChange])

  // Encuadre automático: cubre todas las rutas programadas + bases para que la
  // trayectoria completa (incl. bases fuera del centro del campus) sea visible.
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    const pts = []
    missionRoutes.forEach((route) => {
      ;(route?.waypoints || []).forEach((pt) => pts.push(pt))
    })
    const active = waypoints || selectedRoute?.waypoints || []
    active.forEach((pt) => pts.push(pt))
    if (pts.length < 2) return
    pts.push(...PATROL_BASES.map((b) => b.coords))
    map.fitBounds(L.latLngBounds(pts).pad(0.18), { maxZoom: 17 })
  }, [missionRoutes, selectedRoute, waypoints])

  // Lógica de clic sobre el mapa para agregar waypoints en modo edición
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !allowWaypointEditing || isDrawingMode) return

    function handleMapClick(e) {
      if (onWaypointsChange && waypoints) {
        const newPoint = [e.latlng.lat, e.latlng.lng]
        onWaypointsChange([...waypoints, newPoint])
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [allowWaypointEditing, isDrawingMode, waypoints, onWaypointsChange])

  // Lógica de dibujo interactivo de rectángulos
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (!isDrawingMode) {
      if (drawingStateRef.current.tempRect) {
        drawingStateRef.current.tempRect.remove()
        drawingStateRef.current.tempRect = null
      }
      map.getContainer().style.cursor = ''
      return
    }

    map.getContainer().style.cursor = 'crosshair'

    function handleMapClick(e) {
      const { lat, lng } = e.latlng

      if (!firstCorner) {
        setFirstCorner([lat, lng])
        const tempRect = L.rectangle([[lat, lng], [lat, lng]], {
          color: '#0284c7',
          weight: 2,
          dashArray: '4, 4',
          fillColor: '#38bdf8',
          fillOpacity: 0.2,
        }).addTo(map)
        drawingStateRef.current.tempRect = tempRect
      } else {
        const second = [lat, lng]
        if (drawingStateRef.current.tempRect) {
          drawingStateRef.current.tempRect.remove()
          drawingStateRef.current.tempRect = null
        }
        const cornerA = firstCorner
        setFirstCorner(null)
        map.getContainer().style.cursor = ''

        if (onZoneCreated) {
          onZoneCreated([cornerA, second])
        }
      }
    }

    function handleMouseMove(e) {
      if (firstCorner && drawingStateRef.current.tempRect) {
        const current = [e.latlng.lat, e.latlng.lng]
        drawingStateRef.current.tempRect.setBounds([firstCorner, current])
      }
    }

    map.on('click', handleMapClick)
    map.on('mousemove', handleMouseMove)

    return () => {
      map.off('click', handleMapClick)
      map.off('mousemove', handleMouseMove)
    }
  }, [isDrawingMode, firstCorner, onZoneCreated])

  function handleResetView() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM)
    }
  }

  function handleCancel() {
    setFirstCorner(null)
    if (drawingStateRef.current.tempRect) {
      drawingStateRef.current.tempRect.remove()
      drawingStateRef.current.tempRect = null
    }
    if (onCancelDrawing) {
      onCancelDrawing()
    }
  }

  return (
    <div className="rutas-map-wrapper">
      <div className="rutas-map-container" ref={mapContainerRef} />

      {isDrawingMode && (
        <div className="map-drawing-banner">
          <span className="map-drawing-banner__text">
            <CompassTargetIcon size={15} color="#0284C7" />
            {!firstCorner
              ? ' Haz clic en el mapa para fijar la primera esquina.'
              : ' Haz clic para fijar la esquina opuesta del rectángulo.'}
          </span>
          <button type="button" onClick={handleCancel} className="map-btn-cancel-draw">
            Cancelar
          </button>
        </div>
      )}

      <button
        type="button"
        className="map-recenter-btn"
        title="Centrar en Facultad de Informática"
        onClick={handleResetView}
      >
        <CompassTargetIcon size={20} color="#0284C7" />
      </button>
    </div>
  )
}
