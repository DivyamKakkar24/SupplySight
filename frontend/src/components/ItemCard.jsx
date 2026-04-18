import { Package, MapPin, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Reusable card displaying a single inventory item.
 * Used in the customer dashboard search results and anywhere items
 * should be shown consistently.
 */
const ItemCard = ({ item, showStore = true, actions = null }) => {
  if (!item) return null

  const inStock = (item.quantity ?? 0) > 0
  const storeName = item.store?.name

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center min-w-0">
          <Package className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0" />
          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded flex-shrink-0 ml-2 ${
            inStock
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {inStock ? `In stock: ${item.quantity}` : 'Out of stock'}
        </span>
      </div>

      {item.description && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
        <span className="font-semibold text-gray-900">
          ${Number(item.price || 0).toFixed(2)}
        </span>
        {item.category && (
          <span className="inline-flex items-center text-xs text-gray-500">
            <Tag className="h-3 w-3 mr-1" />
            {item.category}
          </span>
        )}
      </div>

      {showStore && storeName && (
        <Link
          to={item.store?._id ? `/stores/${item.store._id}` : '#'}
          className="inline-flex items-center text-xs text-primary-600 hover:text-primary-700 mb-2"
        >
          <MapPin className="h-3 w-3 mr-1" />
          {storeName}
        </Link>
      )}

      {actions && <div className="mt-auto pt-2">{actions}</div>}
    </div>
  )
}

export default ItemCard
