import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../utils/api'
import { MapPin, Package, DollarSign, Plus, X, Edit, Trash2, ShoppingCart, Minus, PlusCircle, MinusCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { validateName, validatePrice, validateQuantity } from '../utils/validation'


const StoreDetail = () => {
  const { id } = useParams()
  const [store, setStore] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [addLoading, setAddLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [cart, setCart] = useState({})
  const [orderLoading, setOrderLoading] = useState(false)
  const { user } = useAuth()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    reorderThreshold: '',
    category: ''
  })
  
  const [stockData, setStockData] = useState({
    quantity: '',
    operation: 'add' // 'add' or 'subtract'
  })
  
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchStoreData()
  }, [id])

  const fetchStoreData = async () => {
    try {
      const [storeResponse, itemsResponse] = await Promise.all([
        api.get(`/stores/${id}`),
        api.get(`/items/store/${id}`)
      ])
      
      setStore(storeResponse.data.store)
      setItems(itemsResponse.data.items)
    } catch (error) {
      console.error('Failed to fetch store data:', error)
      toast.error('Failed to load store data')
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

  const handleStockInputChange = (e) => {
    const { name, value } = e.target
    setStockData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    // Name validation
    const nameValidation = validateName(formData.name)
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.message
    }

    // Price validation
    const priceValidation = validatePrice(formData.price)
    if (!priceValidation.isValid) {
      newErrors.price = priceValidation.message
    }

    // Quantity validation
    const quantityValidation = validateQuantity(formData.quantity)
    if (!quantityValidation.isValid) {
      newErrors.quantity = quantityValidation.message
    }

    // Reorder threshold validation
    const thresholdValidation = validateQuantity(formData.reorderThreshold)
    if (!thresholdValidation.isValid) {
      newErrors.reorderThreshold = thresholdValidation.message
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStockForm = () => {
    const newErrors = {}
    
    if (!stockData.quantity || stockData.quantity <= 0) {
      newErrors.quantity = 'Please enter a valid quantity'
    }
    
    if (stockData.operation === 'subtract' && parseInt(stockData.quantity) > selectedItem?.quantity) {
      newErrors.quantity = 'Cannot subtract more than current stock'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setAddLoading(true)
    
    try {
      const itemData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        reorderThreshold: parseInt(formData.reorderThreshold),
        category: formData.category
      }

      const response = await api.post(`/items/store/${id}`, itemData)
      toast.success('Item added successfully!')
      setShowAddModal(false)
      setFormData({ name: '', description: '', price: '', quantity: '', reorderThreshold: '', category: '' })
      fetchStoreData() // Refresh the items list
    } catch (error) {
      console.error('Failed to add item:', error)
      toast.error(error.response?.data?.error || 'Failed to add item')
    } finally {
      setAddLoading(false)
    }
  }

  const handleEditItem = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setEditLoading(true)
    
    try {
      const itemData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        reorderThreshold: parseInt(formData.reorderThreshold),
        category: formData.category
      }

      const response = await api.put(`/items/${selectedItem._id}`, itemData)
      toast.success('Item updated successfully!')
      setShowEditModal(false)
      setSelectedItem(null)
      setFormData({ name: '', description: '', price: '', quantity: '', reorderThreshold: '', category: '' })
      fetchStoreData() // Refresh the items list
    } catch (error) {
      console.error('Failed to update item:', error)
      toast.error(error.response?.data?.error || 'Failed to update item')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      await api.delete(`/items/${itemId}`)
      toast.success('Item deleted successfully!')
      fetchStoreData() // Refresh the items list
    } catch (error) {
      console.error('Failed to delete item:', error)
      toast.error(error.response?.data?.error || 'Failed to delete item')
    }
  }

  const handleStockAdjustment = async (e) => {
    e.preventDefault()
    
    if (!validateStockForm()) {
      return
    }

    setStockLoading(true)
    
    try {
      const adjustment = stockData.operation === 'add' ? parseInt(stockData.quantity) : -parseInt(stockData.quantity)
      const newQuantity = selectedItem.quantity + adjustment
      
      const itemData = {
        ...selectedItem,
        quantity: newQuantity
      }

      const response = await api.put(`/items/${selectedItem._id}`, itemData)
      toast.success(`Stock ${stockData.operation === 'add' ? 'increased' : 'decreased'} successfully!`)
      setShowStockModal(false)
      setSelectedItem(null)
      setStockData({ quantity: '', operation: 'add' })
      fetchStoreData() // Refresh the items list
    } catch (error) {
      console.error('Failed to adjust stock:', error)
      toast.error(error.response?.data?.error || 'Failed to adjust stock')
    } finally {
      setStockLoading(false)
    }
  }

  const openEditModal = (item) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      quantity: item.quantity.toString(),
      reorderThreshold: item.reorderThreshold.toString(),
      category: item.category || ''
    })
    setShowEditModal(true)
  }

  const openStockModal = (item) => {
    setSelectedItem(item)
    setStockData({ quantity: '', operation: 'add' })
    setShowStockModal(true)
  }

  // Shopping cart functions
  const addToCart = (item) => {
    if (item.quantity <= 0) {
      toast.error('Item is out of stock')
      return
    }
    
    setCart(prev => ({
      ...prev,
      [item._id]: (prev[item._id] || 0) + 1
    }))
    toast.success(`${item.name} added to cart`)
  }

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev }
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1
      } else {
        delete newCart[itemId]
      }
      return newCart
    })
  }

  const clearCart = () => {
    setCart({})
  }

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = items.find(i => i._id === itemId)
      return total + (item?.price || 0) * quantity
    }, 0)
  }

  const getCartItems = () => {
    return Object.entries(cart).map(([itemId, quantity]) => {
      const item = items.find(i => i._id === itemId)
      return { ...item, cartQuantity: quantity }
    }).filter(item => item._id)
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please login to place an order')
      return
    }

    if (Object.keys(cart).length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setOrderLoading(true)
    
    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => ({
        itemId,
        quantity
      }))

      const orderData = {
        storeId: id,
        items: orderItems
      }

      const response = await api.post('/orders', orderData)
      toast.success('Order placed successfully!')
      clearCart()
      fetchStoreData() // Refresh inventory
    } catch (error) {
      console.error('Failed to place order:', error)
      toast.error(error.response?.data?.error || 'Failed to place order')
    } finally {
      setOrderLoading(false)
    }
  }

  const isManager = user?.role === 'manager' && store?.manager?._id === user?._id
  const isCustomer = user?.role === 'customer'
  const cartItems = getCartItems()
  const cartTotal = getCartTotal()
  


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Store not found</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Store Info */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            <p className="text-gray-600 mt-1">{store.description}</p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              {store.address}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Manager: {store.manager?.name}
            </p>
          </div>
          
          {user?.role === 'manager' && (
            <div className="flex items-center space-x-2">
              {isManager ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </button>
              ) : (
                <div className="text-sm text-gray-500">
                  (Not your store - you can only manage your own stores)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shopping Cart for Customers */}
      {isCustomer && cartItems.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shopping Cart</h2>
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">${item.price} each</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    disabled={item.quantity <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">{item.cartQuantity}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    disabled={item.quantity <= item.cartQuantity}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-lg font-semibold">Total: ${cartTotal.toFixed(2)}</span>
              <div className="space-x-2">
                <button
                  onClick={clearCart}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-red-600"
                >
                  Clear Cart
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {orderLoading ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item._id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium text-gray-900">
                      ${item.price}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      item.quantity > item.reorderThreshold 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.quantity} in stock
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
                  {item.category && (
                    <p className="text-xs text-gray-500">Category: {item.category}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  {user?.role === 'manager' ? (
                    isManager ? (
                      <>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStockModal(item)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Adjust stock"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">(Not your store)</span>
                    )
                  ) : isCustomer && item.quantity > 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Add to cart"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {items.length === 0 && (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
            <p className="text-gray-600">
              {isManager ? 'Add items to start managing inventory' : 'This store has no items available'}
            </p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Item</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter item name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter item description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter price"
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter quantity"
                  />
                  {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reorder Threshold</label>
                  <input
                    type="number"
                    name="reorderThreshold"
                    value={formData.reorderThreshold}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter reorder threshold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter category"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {addLoading ? 'Adding...' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Item</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleEditItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter item name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter item description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter price"
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter quantity"
                  />
                  {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reorder Threshold</label>
                  <input
                    type="number"
                    name="reorderThreshold"
                    value={formData.reorderThreshold}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter reorder threshold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter category"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
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
                    className={`mt-1 block w-full px-3 py-2 border ${
                      errors.quantity ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Enter quantity"
                    min="1"
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
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
                    disabled={stockLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {stockLoading ? 'Updating...' : 'Update Stock'}
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

export default StoreDetail 