import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import {
  ShoppingCart,
  Package,
  Calendar,
  CheckCircle2,
  Circle,
  XCircle,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

// Canonical status flow — must mirror backend
const STATUS_FLOW = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
]

// A customer can cancel up to and including PACKED (anything before SHIPPED)
const CUSTOMER_CANCELLABLE = ['PLACED', 'CONFIRMED', 'PACKED']

const formatStatus = (s) => s?.replace(/_/g, ' ')

const statusBadgeClasses = (status) => {
  if (status === 'CANCELLED') return 'bg-red-100 text-red-800'
  if (status === 'DELIVERED') return 'bg-green-100 text-green-800'
  return 'bg-blue-100 text-blue-800'
}

const StatusTimeline = ({ status }) => {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center text-red-600 text-sm mt-2">
        <XCircle className="h-5 w-5 mr-2" />
        Order Cancelled
      </div>
    )
  }

  const currentIdx = STATUS_FLOW.indexOf(status)

  return (
    <div className="flex items-center flex-wrap gap-y-2 mt-2">
      {STATUS_FLOW.map((step, idx) => {
        const reached = idx <= currentIdx
        const isCurrent = idx === currentIdx
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              {reached ? (
                <CheckCircle2
                  className={`h-5 w-5 ${isCurrent ? 'text-primary-600' : 'text-green-600'}`}
                />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  reached ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}
              >
                {formatStatus(step)}
              </span>
            </div>
            {idx < STATUS_FLOW.length - 1 && (
              <ChevronRight
                className={`h-4 w-4 mx-1 ${
                  idx < currentIdx ? 'text-green-600' : 'text-gray-300'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const { user } = useAuth()
  const isManager = user?.role === 'manager'

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders')
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const getNextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current)
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null
    return STATUS_FLOW[idx + 1]
  }

  const handleAdvanceStatus = async (order) => {
    const nextStatus = getNextStatus(order.status)
    if (!nextStatus) return
    setActionLoadingId(order._id)
    try {
      const response = await api.put(`/orders/${order._id}/status`, {
        status: nextStatus
      })
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? response.data.order : o))
      )
      toast.success(`Order moved to ${formatStatus(nextStatus)}`)
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error(error.response?.data?.error || 'Failed to update status')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancel = async (order) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    setActionLoadingId(order._id)
    try {
      const response = await api.put(`/orders/${order._id}/cancel`)
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? response.data.order : o))
      )
      toast.success('Order cancelled')
    } catch (error) {
      console.error('Failed to cancel order:', error)
      toast.error(error.response?.data?.error || 'Failed to cancel order')
    } finally {
      setActionLoadingId(null)
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isManager ? 'All Orders' : 'My Orders'}
        </h1>
        <p className="text-gray-600">
          {isManager
            ? 'Track and update orders across your stores'
            : 'Track your order status and history'}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600">Start shopping to see your orders here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const nextStatus = getNextStatus(order.status)
            const canCustomerCancel =
              !isManager && CUSTOMER_CANCELLABLE.includes(order.status)
            const canManagerAdvance = isManager && nextStatus !== null
            const canManagerCancel =
              isManager &&
              order.status !== 'CANCELLED' &&
              order.status !== 'DELIVERED'
            const isBusy = actionLoadingId === order._id

            return (
              <div key={order._id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order._id.slice(-8)}
                    </h3>
                    <p className="text-sm text-gray-600">{order.store?.name}</p>
                    {isManager && order.customer && (
                      <p className="text-xs text-gray-500">
                        Customer: {order.customer.name} ({order.customer.email})
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ${order.totalAmount?.toFixed(2)}
                    </p>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded ${statusBadgeClasses(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </div>
                </div>

                {/* Status timeline */}
                <StatusTimeline status={order.status} />

                {/* Items */}
                <div className="space-y-2 mt-4 pt-4 border-t">
                  {order.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{item.item?.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span>Qty: {item.quantity}</span>
                        <span>${item.price}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2">
                    {canManagerAdvance && (
                      <button
                        onClick={() => handleAdvanceStatus(order)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-300"
                      >
                        {isBusy
                          ? 'Updating...'
                          : `Mark as ${formatStatus(nextStatus)}`}
                      </button>
                    )}
                    {canManagerCancel && (
                      <button
                        onClick={() => handleCancel(order)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                    )}
                    {canCustomerCancel && (
                      <button
                        onClick={() => handleCancel(order)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        {isBusy ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Orders
