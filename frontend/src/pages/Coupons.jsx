import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { Plus, X, Edit, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { validateQuantity, validateDiscountPercent } from '../utils/validation'

const emptyForm = {
  code: '',
  usageLimit: '',
  discountPercent: '',
  validTill: '',
  status: 'ACTIVE'
}

const Coupons = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [store, setStore] = useState(null)
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [storeResponse, couponsResponse] = await Promise.all([
        api.get(`/stores/${id}`),
        api.get(`/coupons/store/${id}`)
      ])
      setStore(storeResponse.data.store)
      setCoupons(couponsResponse.data.coupons)
    } catch (error) {
      console.error('Failed to fetch coupons data:', error)
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!selectedCoupon && !formData.code.trim()) {
      newErrors.code = 'Coupon code is required'
    }

    const usageLimitValidation = validateQuantity(formData.usageLimit)
    if (!usageLimitValidation.isValid) {
      newErrors.usageLimit = usageLimitValidation.message
    }

    const discountValidation = validateDiscountPercent(formData.discountPercent)
    if (!discountValidation.isValid) {
      newErrors.discountPercent = discountValidation.message
    }

    if (!formData.validTill) {
      newErrors.validTill = 'Valid Till date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaveLoading(true)
    try {
      const payload = {
        usageLimit: parseInt(formData.usageLimit),
        discountPercent: parseFloat(formData.discountPercent),
        validTill: formData.validTill,
        status: formData.status
      }

      if (selectedCoupon) {
        await api.put(`/coupons/${selectedCoupon._id}`, payload)
        toast.success('Coupon updated successfully!')
      } else {
        await api.post(`/coupons/store/${id}`, { ...payload, code: formData.code })
        toast.success('Coupon created successfully!')
      }

      setShowModal(false)
      setSelectedCoupon(null)
      setFormData(emptyForm)
      fetchData()
    } catch (error) {
      console.error('Failed to save coupon:', error)
      toast.error(error.response?.data?.error || 'Failed to save coupon')
    } finally {
      setSaveLoading(false)
    }
  }

  const openAddModal = () => {
    setSelectedCoupon(null)
    setFormData(emptyForm)
    setErrors({})
    setShowModal(true)
  }

  const openEditModal = (coupon) => {
    setSelectedCoupon(coupon)
    setFormData({
      code: coupon.code,
      usageLimit: coupon.usageLimit.toString(),
      discountPercent: coupon.discountPercent.toString(),
      validTill: coupon.validTill ? new Date(coupon.validTill).toISOString().slice(0, 10) : '',
      status: coupon.status
    })
    setErrors({})
    setShowModal(true)
  }

  const isManager = user?.role === 'manager' && store?.manager?._id === user?._id

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

  if (!isManager) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">You can only manage coupons for your own stores</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(`/stores/${id}`)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to {store.name}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Coupon
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Coupon Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usage Limit</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valid Till</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No coupons yet. Click "Add Coupon" to create one.
                </td>
              </tr>
            )}
            {coupons.map(coupon => (
              <tr key={coupon._id}>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEditModal(coupon)}
                    className="text-gray-400 hover:text-primary-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{coupon.code.toUpperCase()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{coupon.usageLimit}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{coupon.discountPercent}%</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {new Date(coupon.validTill).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    coupon.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {coupon.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedCoupon ? 'Edit Coupon' : 'Add New Coupon'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Coupon Code</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    disabled={!!selectedCoupon}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm uppercase focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="Enter coupon code"
                  />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Usage Limit</label>
                  <input
                    type="number"
                    name="usageLimit"
                    value={formData.usageLimit}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter usage limit"
                  />
                  {errors.usageLimit && <p className="text-red-500 text-xs mt-1">{errors.usageLimit}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount %</label>
                  <input
                    type="number"
                    name="discountPercent"
                    value={formData.discountPercent}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter discount percentage"
                  />
                  {errors.discountPercent && <p className="text-red-500 text-xs mt-1">{errors.discountPercent}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid Till</label>
                  <input
                    type="date"
                    name="validTill"
                    value={formData.validTill}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.validTill && <p className="text-red-500 text-xs mt-1">{errors.validTill}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {saveLoading ? 'Saving...' : selectedCoupon ? 'Save Changes' : 'Add Coupon'}
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

export default Coupons
