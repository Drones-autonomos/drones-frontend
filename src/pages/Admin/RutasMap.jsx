import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM } from './rutasData.js'

export default function RutasMap({
  geofences = [],
  selectedRoute = null,
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

      const rect = L.rectangle(zone.bounds, {
        color: strokeColor,
        weight: 2.2,
        dashArray: '6, 6',
        fillColor: fillColor,
        fillOpacity: 0.12,
        interactive: true,
      })

      rect.bindTooltip(
        `<strong>${zone.name}</strong><br/>Tipo: ${zone.type}${zone.restrictionReason ? `<br/><em>${zone.restrictionReason}</em>` : ''}`,
        { direction: 'top', className: 'geofence-tooltip' },
      )

      rect.addTo(group)

      // Etiquetas flotantes en el mapa
      if (zone.id === 'geo-alta-tension') {
        const center = [
          (zone.bounds[0][0] + zone.bounds[1][0]) / 2,
          (zone.bounds[0][1] + zone.bounds[1][1]) / 2,
        ]
        const warningIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div class="map-warning-pill map-warning-pill--amber">
              <span class="warning-icon">⚡</span>
              <div>
                <strong>Alta Tensión</strong>
                <span>Riesgo EM</span>
              </div>
            </div>
          `,
          iconSize: [120, 36],
          iconAnchor: [60, 18],
        })
        L.marker(center, { icon: warningIcon, interactive: false }).addTo(group)
      } else if (zone.id === 'geo-arcotecho') {
        const center = [
          (zone.bounds[0][0] + zone.bounds[1][0]) / 2,
          (zone.bounds[0][1] + zone.bounds[1][1]) / 2,
        ]
        const restrictedIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div class="map-warning-pill map-warning-pill--red">
              <span class="restricted-icon">⊘</span>
              <div>
                <strong style="color: #dc2626;">Arcotecho</strong>
                <span>Tope de altura</span>
              </div>
            </div>
          `,
          iconSize: [110, 36],
          iconAnchor: [55, 18],
        })
        L.marker(center, { icon: restrictedIcon, interactive: false }).addTo(group)
      } else if (zone.badgeCode) {
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
                  onWaypointsChange(updated)
                }
              }
            })
          }
        }
      })
    }
  }, [geofences, selectedRoute, waypoints, allowWaypointEditing, onWaypointsChange])

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
          <span>
            {!firstCorner
              ? '📍 Haz clic en el mapa para fijar la primera esquina.'
              : '📐 Haz clic para fijar la esquina opuesta del rectángulo.'}
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
        🎯
      </button>
    </div>
  )
}
