import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, Package, ShoppingCart, Search, X } from 'lucide-react'
import ItemCard from '../components/ItemCard'

const Dashboard = () => {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const response = await api.get('/stores/public')
      setStores(response.data.stores)
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearchLoading(true)
    setHasSearched(true)
    try {
      const response = await api.get(`/items?search=${encodeURIComponent(q)}`)
      setSearchResults(response.data.items || [])
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPin className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Stores</p>
              <p className="text-2xl font-semibold text-gray-900">{stores.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stores.reduce((total, store) => total + (store.itemCount || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Orders</p>
              <p className="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global product search */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Products</h2>
        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or category..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {hasSearched && !searchLoading && (
          <>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p>No products found matching "{searchQuery}"</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((item) => (
                    <ItemCard key={item._id} item={item} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Recent Stores */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Stores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.slice(0, 6).map((store) => (
            <div key={store._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-medium text-gray-900">{store.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{store.address}</p>
              <p className="text-xs text-gray-500 mt-2">
                Manager: {store.manager?.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 