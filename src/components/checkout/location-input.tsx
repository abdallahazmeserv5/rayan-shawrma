'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import map component to avoid SSR issues
const MapPicker = dynamic(() => import('./map-picker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface LocationInputProps {
  onLocationChange: (location: { description: string; lat: number; lng: number } | null) => void
}

export function LocationInput({ onLocationChange }: LocationInputProps) {
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  useEffect(() => {
    if (description && lat !== null && lng !== null) {
      onLocationChange({
        description,
        lat,
        lng,
      })
    } else {
      onLocationChange(null)
    }
  }, [description, lat, lng, onLocationChange])

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude)
          setLng(position.coords.longitude)
          setIsGettingLocation(false)
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Unable to get your location. Please use the map or enter manually.')
          setIsGettingLocation(false)
        },
      )
    } else {
      alert('Geolocation is not supported by your browser')
    }
  }

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)
  }

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Delivery Location *</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Getting...
            </>
          ) : (
            <>
              <MapPin className="me-2 h-4 w-4" />
              Use My Location
            </>
          )}
        </Button>
      </div>

      {/* Interactive Map */}
      <div className="space-y-2">
        <Label>Click on the map to pin your location</Label>
        <MapPicker lat={lat || 29.3759} lng={lng || 47.9774} onLocationSelect={handleMapClick} />
      </div>

      {/* Coordinates Display */}
      {lat !== null && lng !== null && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(parseFloat(e.target.value))}
              required
            />
          </div>
        </div>
      )}

      {/* Address Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Address Description *</Label>
        <Textarea
          id="description"
          placeholder="e.g., Building 5, Apartment 12, Near the park"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Click on the map to pin your exact location, or use the &quot;Use My Location&quot; button
        to automatically detect your position.
      </p>
    </div>
  )
}
