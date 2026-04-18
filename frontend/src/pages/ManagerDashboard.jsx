import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { Package, AlertTriangle, TrendingUp, Store, MapPin, Plus, Brain, X, PlusCircle, MinusCircle } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import toast from 'react-hot-toast'

const ManagerDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    stores: 0,
    items: 0,
    lowStockItems: 0,
    orders: 0
  })
  const [stores, setStores] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMLModal, setShowMLModal] = useState(false)
  const [mlSuggestions, setMlSuggestions] = useState([])
  const [mlLoading, setMlLoading] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [stockData, setStockData] = useState({
    quantity: '',
    operation: 'add'
  })

  useEffect(() => {
    fetchManagerData()
  }, [])

  const fetchManagerData = async () => {
    try {
      const [storesRes, itemsRes, lowStockRes, ordersRes] = await Promise.all([
        api.get('/stores/manager/my-stores'),
        api.get('/items/manager/my-items'),
        api.get('/items/manager/low-stock'),
        api.get('/orders/manager/my-orders')
      ])

      setStores(storesRes.data.stores)
      setLowStockItems(lowStockRes.data.items)
      
      // Calculate stats only for owned stores
      const ownedStores = storesRes.data.stores
      const ownedItems = itemsRes.data.items
      const ownedLowStockItems = lowStockRes.data.items
      const ownedOrders = ordersRes.data.orders || []
      
      setStats({
        stores: ownedStores.length,
        items: ownedItems.length,
        lowStockItems: ownedLowStockItems.length,
        orders: ownedOrders.length
      })
    } catch (error) {
      console.error('Failed to fetch manager data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchMLSuggestions = async () => {
    setMlLoading(true)
    try {
      await fetch('https://supply-sight-ml.onrender.com')
      const suggestions = []
      for (const item of lowStockItems) {
        try {
          const response = await api.get(`/ml/suggestions/${item.store._id}/${item._id}`)
          suggestions.push({
            ...item,
            suggestion: response.data
          })
        } catch (error) {
          console.error(`Failed to get ML suggestion for ${item.name}:`, error)
        }
      }
      setMlSuggestions(suggestions)
      setShowMLModal(true)
    } catch (error) {
      console.error('Failed to fetch ML suggestions:', error)
      toast.error('Failed to load ML suggestions')
    } finally {
      setMlLoading(false)
    }
  }

  const handleStockInputChange = (e) => {
    const { name, value } = e.target
    setStockData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleStockAdjustment = async (e) => {
    e.preventDefault()
    
    if (!stockData.quantity || stockData.quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }
    
    if (stockData.operation === 'subtract' && parseInt(stockData.quantity) > selectedItem?.quantity) {
      toast.error('Cannot subtract more than current stock')
      return
    }

    try {
      const adjustment = stockData.operation === 'add' ? parseInt(stockData.quantity) : -parseInt(stockData.quantity)
      const newQuantity = selectedItem.quantity + adjustment
      
      const itemData = {
        ...selectedItem,
        quantity: newQuantity
      }

      await api.put(`/items/${selectedItem._id}`, itemData)
      toast.success(`Stock ${stockData.operation === 'add' ? 'increased' : 'decreased'} successfully!`)
      setShowStockModal(false)
      setSelectedItem(null)
      setStockData({ quantity: '', operation: 'add' })
      fetchManagerData() // Refresh data
    } catch (error) {
      console.error('Failed to adjust stock:', error)
      toast.error(error.response?.data?.error || 'Failed to adjust stock')
    }
  }

  const openStockModal = (item) => {
    setSelectedItem(item)
    setStockData({ quantity: '', operation: 'add' })
    setShowStockModal(true)
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
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
            <p className="text-primary-100 text-lg">
              Manage your stores, monitor inventory, and track orders from your personalized dashboard.
            </p>
            <p className="text-primary-200 text-sm mt-2">
              You currently own {stats.stores} store{stats.stores !== 1 ? 's' : ''} with {stats.items} total items.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="text-right">
              <p className="text-primary-200 text-sm">Role</p>
              <p className="text-xl font-semibold">Store Manager</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
          <p className="text-gray-600">Manage your stores and inventory</p>
        </div>
        <Link
          to="/stores"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Store
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Store className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">My Stores</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.stores}</p>
              <p className="text-xs text-gray-500 mt-1">Owned Stores</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.items}</p>
              <p className="text-xs text-gray-500 mt-1">Across All Stores</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Low Stock</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.lowStockItems}</p>
              <p className="text-xs text-gray-500 mt-1">Need Restocking</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Store Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.orders}</p>
              <p className="text-xs text-gray-500 mt-1">From My Stores</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Stores Overview */}
      {stores.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Stores Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div key={store._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{store.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{store.address}</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Location:</span> {store.location?.coordinates[1]?.toFixed(4)}, {store.location?.coordinates[0]?.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Status:</span> {store.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <Link
                    to={`/stores/${store._id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Manage Store
                  </Link>
                  <span className="text-xs text-gray-400">
                    ID: {store._id.slice(-6)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Store Map */}
      {stores.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Locations</h2>
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[23.5937, 78.9629]} // Default to center of India
              zoom={5}
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
                      <Link
                        to={`/stores/${store._id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View Store
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Items (My Stores)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.slice(0, 6).map((item) => (
              <div key={item._id} className="border rounded-lg p-4 bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Store:</span> {item.store?.name}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium text-gray-900">
                        ${item.price}
                      </span>
                      <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-800">
                        {item.quantity} in stock
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Reorder at:</span> {item.reorderThreshold}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">SKU:</span> {item.sku}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => openStockModal(item)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Adjust stock"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <Link
                  to={`/stores/${item.store?._id}`}
                  className="mt-3 inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  View Store
                </Link>
              </div>
            ))}
          </div>
          {lowStockItems.length > 6 && (
            <div className="mt-4 text-center">
              <Link
                to="/stores"
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                View all {lowStockItems.length} low stock items from my stores
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/stores"
            className="btn btn-primary text-center"
          >
            <Store className="w-5 h-5 mr-2" />
            Manage Stores
          </Link>
          
          <Link
            to="/orders"
            className="btn btn-secondary text-center"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            View Orders
          </Link>
          
          <button
            onClick={fetchMLSuggestions}
            disabled={mlLoading || lowStockItems.length === 0}
            className="btn btn-secondary text-center disabled:opacity-50"
          >
            <Brain className="w-5 h-5 mr-2" />
            {mlLoading ? 'Loading...' : 'ML Suggestions'}
          </button>
          
          <Link
            to="/notifications"
            className="btn btn-secondary text-center"
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            Notifications
          </Link>
        </div>
      </div>

      {/* ML Suggestions Modal */}
      {showMLModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">ML Suggestions</h3>
                <button
                  onClick={() => setShowMLModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {mlSuggestions.map((item) => (
                  <div key={item._id} className="border rounded-lg p-3">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">Current: {item.quantity}</p>
                    <p className="text-sm text-gray-600">Suggested: {item.suggestion?.suggestedQty || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.suggestion?.reasoning || 'No reasoning available'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Adjust Stock</h3>
                <button
                  onClick={() => setShowStockModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">{selectedItem.name}</h4>
                <p className="text-sm text-gray-600">Current Stock: {selectedItem.quantity}</p>
                <p className="text-sm text-gray-600">SKU: {selectedItem.sku}</p>
              </div>
              
              <form onSubmit={handleStockAdjustment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operation</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="operation"
                        value="add"
                        checked={stockData.operation === 'add'}
                        onChange={handleStockInputChange}
                        className="mr-2"
                      />
                      <PlusCircle className="w-4 h-4 mr-1 text-green-600" />
                      Add Stock
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="operation"
                        value="subtract"
                        checked={stockData.operation === 'subtract'}
                        onChange={handleStockInputChange}
                        className="mr-2"
                      />
                      <MinusCircle className="w-4 h-4 mr-1 text-red-600" />
                      Remove Stock
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={stockData.quantity}
                    onChange={handleStockInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter quantity"
                    min="1"
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    New stock will be: <span className="font-medium">
                      {stockData.operation === 'add' 
                        ? selectedItem.quantity + (parseInt(stockData.quantity) || 0)
                        : selectedItem.quantity - (parseInt(stockData.quantity) || 0)
                      }
                    </span>
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowStockModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Update Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerDashboard 
