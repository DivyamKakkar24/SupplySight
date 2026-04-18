import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import { MapPin, Package, Plus, X, Search, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { validateName, validateAddress } from '../utils/validation'
import { getCoordinatesFromPincode, validatePincode } from '../utils/geocoding'

const Stores = () => {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const { user } = useAuth()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    pincode: '',
    latitude: '',
    longitude: ''
  })
  
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const response = await api.get('/stores')
      setStores(response.data.stores)
    } catch (error) {
      console.error('Failed to fetch stores:', error)
      if (error.response?.status === 401) {
        toast.error('Please login to view stores')
      } else {
        toast.error('Failed to load stores')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handlePincodeLookup = async () => {
    if (!formData.pincode) {
      toast.error('Please enter a pincode first')
      return
    }

    const pincodeValidation = validatePincode(formData.pincode)
    if (!pincodeValidation.isValid) {
      setErrors(prev => ({
        ...prev,
        pincode: pincodeValidation.message
      }))
      return
    }

    setGeocodingLoading(true)
    try {
      const coordinates = await getCoordinatesFromPincode(formData.pincode)
      
      setFormData(prev => ({
        ...prev,
        latitude: coordinates.latitude.toString(),
        longitude: coordinates.longitude.toString()
      }))

      // Clear any existing coordinate errors
      setErrors(prev => ({
        ...prev,
        latitude: '',
        longitude: ''
      }))

      toast.success(`Location found: ${coordinates.displayName}`)
    } catch (error) {
      console.error('Pincode lookup failed:', error)
      toast.error(error.message || 'Failed to find location for this pincode')
      setErrors(prev => ({
        ...prev,
        pincode: 'Could not find coordinates for this pincode'
      }))
    } finally {
      setGeocodingLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Name validation
    const nameValidation = validateName(formData.name)
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.message
    }

    // Address validation
    const addressValidation = validateAddress(formData.address)
    if (!addressValidation.isValid) {
      newErrors.address = addressValidation.message
    }

    // City validation
    if (!formData.city || formData.city.trim().length < 2) {
      newErrors.city = 'City name is required and must be at least 2 characters'
    }

    // Pincode validation
    if (!formData.pincode) {
      newErrors.pincode = 'Pincode is required'
    } else {
      const pincodeValidation = validatePincode(formData.pincode)
      if (!pincodeValidation.isValid) {
        newErrors.pincode = pincodeValidation.message
      }
    }

    // Latitude/Longitude validation (only if manually entered)
    if (formData.latitude && (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90)) {
      newErrors.latitude = 'Latitude must be between -90 and 90'
    }
    if (formData.longitude && (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180)) {
      newErrors.longitude = 'Longitude must be between -180 and 180'
    }

    // Require either pincode lookup or manual coordinates
    if (!formData.pincode && (!formData.latitude || !formData.longitude)) {
      newErrors.pincode = 'Please provide a pincode to locate the store'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateStore = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setCreateLoading(true)
    
    try {
      let coordinates = [0, 0] // Default coordinates

      // If pincode is provided, try to get coordinates
      if (formData.pincode) {
        try {
          const coords = await getCoordinatesFromPincode(formData.pincode)
          coordinates = [parseFloat(coords.longitude), parseFloat(coords.latitude)]
        } catch (error) {
          // Fallback to manual coordinates if pincode lookup fails
          if (formData.latitude && formData.longitude) {
            coordinates = [parseFloat(formData.longitude), parseFloat(formData.latitude)]
          } else {
            throw new Error('Could not determine store location')
          }
        }
      } else if (formData.latitude && formData.longitude) {
        // Use manual coordinates
        coordinates = [parseFloat(formData.longitude), parseFloat(formData.latitude)]
      }

      const storeData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        coordinates: coordinates
      }

      const response = await api.post('/stores', storeData)
      toast.success('Store created successfully!')
      setShowCreateModal(false)
      setFormData({ name: '', description: '', address: '', city: '', pincode: '', latitude: '', longitude: '' })
      fetchStores() // Refresh the stores list
    } catch (error) {
      console.error('Failed to create store:', error)
      toast.error(error.response?.data?.error || 'Failed to create store')
    } finally {
      setCreateLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', address: '', city: '', pincode: '', latitude: '', longitude: '' })
    setErrors({})
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-gray-600">
            {user?.role === 'manager' ? 'Browse stores owned by you' : 'Browse all available stores'}
          </p>
        </div>
        
        {user?.role === 'manager' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Store
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <Link
            key={store._id}
            to={`/stores/${store._id}`}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{store.address}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Manager: {store.manager?.name}
                </p>
              </div>
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Create Store Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Store</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Store Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Enter store name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter store description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Enter store address"
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                </div>

                {/* City and Pincode Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border ${
                        errors.city ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                      placeholder="Enter city name"
                    />
                    {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pincode</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className={`flex-1 px-3 py-2 border ${
                          errors.pincode ? 'border-red-300' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        placeholder="Enter pincode"
                      />
                      <button
                        type="button"
                        onClick={handlePincodeLookup}
                        disabled={geocodingLoading || !formData.pincode}
                        className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {geocodingLoading ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.pincode && <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>}
                  </div>
                </div>

                {/* Location Status */}
                {formData.latitude && formData.longitude && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <MapPin className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">Location Found</p>
                        <p className="text-xs text-green-600">
                          Coordinates: {formData.latitude}, {formData.longitude}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Coordinates Section (Hidden by default) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Advanced: Manual Coordinates
                  </summary>
                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          name="latitude"
                          value={formData.latitude}
                          onChange={handleInputChange}
                          className={`mt-1 block w-full px-3 py-2 border ${
                            errors.latitude ? 'border-red-300' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                          placeholder="0.0"
                        />
                        {errors.latitude && <p className="mt-1 text-sm text-red-600">{errors.latitude}</p>}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          name="longitude"
                          value={formData.longitude}
                          onChange={handleInputChange}
                          className={`mt-1 block w-full px-3 py-2 border ${
                            errors.longitude ? 'border-red-300' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                          placeholder="0.0"
                        />
                        {errors.longitude && <p className="mt-1 text-sm text-red-600">{errors.longitude}</p>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Manual coordinates will override pincode lookup if both are provided
                    </p>
                  </div>
                </details>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {createLoading ? 'Creating...' : 'Create Store'}
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

export default Stores 