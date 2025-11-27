'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FC } from 'react'

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as Record<string, any>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface MapPickerProps {
  lat: number
  lng: number
  onLocationSelect: (lat: number, lng: number) => void
}

const MapPicker: FC<MapPickerProps> = ({ lat, lng, onLocationSelect }) => {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    // Initialize map only once
    if (!mapRef.current) {
      const map = L.map('map-picker', {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
      })

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Add click event to map
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng

        // Update or create marker
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng])
        } else {
          markerRef.current = L.marker([clickLat, clickLng], {
            draggable: true,
          }).addTo(map)

          // Handle marker drag
          markerRef.current.on('dragend', () => {
            if (markerRef.current) {
              const position = markerRef.current.getLatLng()
              onLocationSelect(position.lat, position.lng)
            }
          })
        }

        onLocationSelect(clickLat, clickLng)
      })

      mapRef.current = map
      setIsMapReady(true)
    }

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once

  // Update map center and marker when lat/lng props change
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      mapRef.current.setView([lat, lng], mapRef.current.getZoom())

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], {
          draggable: true,
        }).addTo(mapRef.current)

        // Handle marker drag
        markerRef.current.on('dragend', () => {
          if (markerRef.current) {
            const position = markerRef.current.getLatLng()
            onLocationSelect(position.lat, position.lng)
          }
        })
      }
    }
  }, [lat, lng, isMapReady, onLocationSelect])

  return (
    <div
      id="map-picker"
      className="w-full h-[300px] rounded-lg border overflow-hidden"
      style={{ zIndex: 0 }}
    />
  )
}

export default MapPicker
