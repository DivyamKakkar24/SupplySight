import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { api } from '../utils/api'
import { ShoppingCart, Minus, Plus, Trash2, MapPin, Phone, User, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const Checkout = () => {
  const { user, updateUser } = useAuth()
  const { getCartItemsForStore, getCartTotalForStore, getStoreIds, removeFromCart, clearAllCarts, addToCart, getCartCount, itemDetails } = useCart()
  const navigate = useNavigate()
  const [orderLoading, setOrderLoading] = useState(false)
  const [saveDetails, setSaveDetails] = useState(true)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  })

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || ''
      })
    }
  }, [user])

  const storeIds = getStoreIds()
  const totalItems = getCartCount()

  useEffect(() => {
    if (totalItems === 0) {
      navigate('/dashboard')
    }
  }, [totalItems, navigate])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const grandTotal = storeIds.reduce((sum, sid) => sum + getCartTotalForStore(sid), 0)

  const handlePlaceOrder = async () => {
    if (!form.name || !form.phone || !form.address || !form.city || !form.state || !form.pincode) {
      toast.error('Please fill in all contact and address details')
      return
    }

    setOrderLoading(true)
    try {
      if (saveDetails) {
        await updateUser({
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode
        })
      }

      for (const storeId of storeIds) {
        const cartItems = getCartItemsForStore(storeId)
        const orderItems = cartItems.map(item => ({
          itemId: item._id,
          quantity: item.cartQuantity
        }))

        await api.post('/orders', {
          storeId,
          items: orderItems,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode
        })
      }

      toast.success(storeIds.length > 1
        ? `${storeIds.length} orders placed successfully!`
        : 'Order placed successfully!')
      clearAllCarts()
      navigate('/orders')
    } catch (error) {
      console.error('Failed to place order:', error)
      toast.error(error.response?.data?.error || 'Failed to place order')
    } finally {
      setOrderLoading(false)
    }
  }

  if (totalItems === 0) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600">Review your cart and enter delivery details</p>
      </div>

      {/* Cart Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Summary
        </h2>

        {storeIds.map(storeId => {
          const storeItems = getCartItemsForStore(storeId)
          const storeTotal = getCartTotalForStore(storeId)
          const storeName = storeItems[0]?.store?.name || itemDetails[storeItems[0]?._id]?.store?.name || 'Store'

          return (
            <div key={storeId} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                <h3 className="font-medium text-gray-700">{storeName}</h3>
              </div>
              <div className="space-y-2 ml-6">
                {storeItems.map(item => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">${Number(item.price).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => removeFromCart(storeId, item._id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.cartQuantity}</span>
                      <button
                        onClick={() => addToCart({ ...item, store: item.store || { _id: storeId }, storeId })}
                        className="p-1 text-gray-400 hover:text-green-600"
                        disabled={item.quantity <= item.cartQuantity}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 ml-4 w-20 text-right">
                      ${(Number(item.price) * item.cartQuantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="text-right text-sm font-medium text-gray-700 pr-1">
                  Subtotal: ${storeTotal.toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <span className="text-lg font-bold text-gray-900">Grand Total</span>
          <span className="text-lg font-bold text-primary-600">${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Contact & Address Form */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Delivery Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your phone number"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="House no., street, area"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="State"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
            <input
              type="text"
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Pincode"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={saveDetails}
              onChange={(e) => setSaveDetails(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Save className="w-4 h-4" />
            Save these details to my profile for future orders
          </label>
        </div>
      </div>

      {/* Place Order */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Continue Shopping
        </button>
        <button
          onClick={handlePlaceOrder}
          disabled={orderLoading}
          className="px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {orderLoading ? 'Placing Order...' : `Place Order - $${grandTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}

export default Checkout
