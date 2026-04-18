import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { api } from '../utils/api'
import { useState, useEffect } from 'react'

const MapTest = () => {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await api.get('/stores')
        setStores(response.data.stores)
      } catch (error) {
        console.error('Failed to fetch stores:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStores()
  }, [])

  if (loading) {
    return <div>Loading stores...</div>
  }

  if (stores.length === 0) {
    return <div>No stores found</div>
  }

  // Calculate center point from all stores
  const centerLat = stores.reduce((sum, store) => sum + (store.location?.coordinates[1] || 0), 0) / stores.length
  const centerLng = stores.reduce((sum, store) => sum + (store.location?.coordinates[0] || 0), 0) / stores.length

  return (
    <div className="h-96 w-full">
      <h2 className="text-lg font-semibold mb-4">Map Test - {stores.length} Stores</h2>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {stores.map((store) => (
          <Marker
            key={store._id}
            position={[
              store.location?.coordinates[1] || 0,
              store.location?.coordinates[0] || 0
            ]}
          >
            <Popup>
              <div>
                <h3 className="font-semibold">{store.name}</h3>
                <p className="text-sm text-gray-600">{store.address}</p>
                <p className="text-xs text-gray-500">
                  Coords: [{store.location?.coordinates[1]}, {store.location?.coordinates[0]}]
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default MapTest 