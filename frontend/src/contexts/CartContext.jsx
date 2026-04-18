import { createContext, useContext, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext()

const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

const CartProvider = ({ children }) => {
  // cart: { [storeId]: { [itemId]: quantity } }
  const [cart, setCart] = useState({})
  // itemDetails: { [itemId]: item object }
  const [itemDetails, setItemDetails] = useState({})

  const addToCart = useCallback((item) => {
    if (!item || !item._id) return
    if ((item.quantity ?? 0) <= 0) {
      toast.error('Item is out of stock')
      return
    }

    const storeId = item.store?._id || item.storeId
    if (!storeId) {
      toast.error('Store information missing')
      return
    }

    setCart(prev => {
      const storeCart = prev[storeId] || {}
      const currentQty = storeCart[item._id] || 0
      if (currentQty >= item.quantity) {
        toast.error(`Only ${item.quantity} available`)
        return prev
      }
      return {
        ...prev,
        [storeId]: { ...storeCart, [item._id]: currentQty + 1 }
      }
    })

    setItemDetails(prev => ({
      ...prev,
      [item._id]: { ...item, storeId }
    }))

    toast.success(`${item.name} added to cart`)
  }, [])

  const removeFromCart = useCallback((storeId, itemId) => {
    setCart(prev => {
      const storeCart = { ...(prev[storeId] || {}) }
      if (storeCart[itemId] > 1) {
        storeCart[itemId] -= 1
      } else {
        delete storeCart[itemId]
      }
      const newCart = { ...prev, [storeId]: storeCart }
      if (Object.keys(storeCart).length === 0) {
        delete newCart[storeId]
      }
      return newCart
    })
  }, [])

  const clearCart = useCallback((storeId) => {
    setCart(prev => {
      const newCart = { ...prev }
      delete newCart[storeId]
      return newCart
    })
  }, [])

  const clearAllCarts = useCallback(() => {
    setCart({})
    setItemDetails({})
  }, [])

  const getCartItemsForStore = useCallback((storeId) => {
    const storeCart = cart[storeId] || {}
    return Object.entries(storeCart).map(([itemId, quantity]) => ({
      ...itemDetails[itemId],
      cartQuantity: quantity
    })).filter(item => item._id)
  }, [cart, itemDetails])

  const getCartTotalForStore = useCallback((storeId) => {
    const storeCart = cart[storeId] || {}
    return Object.entries(storeCart).reduce((total, [itemId, quantity]) => {
      const item = itemDetails[itemId]
      return total + (Number(item?.price) || 0) * quantity
    }, 0)
  }, [cart, itemDetails])

  const getAllCartItems = useCallback(() => {
    const allItems = []
    for (const [storeId, storeCart] of Object.entries(cart)) {
      for (const [itemId, quantity] of Object.entries(storeCart)) {
        const item = itemDetails[itemId]
        if (item) {
          allItems.push({ ...item, storeId, cartQuantity: quantity })
        }
      }
    }
    return allItems
  }, [cart, itemDetails])

  const getCartCount = useCallback(() => {
    return Object.values(cart).reduce((total, storeCart) =>
      total + Object.values(storeCart).reduce((s, q) => s + q, 0), 0)
  }, [cart])

  const getStoreIds = useCallback(() => {
    return Object.keys(cart).filter(storeId =>
      Object.keys(cart[storeId]).length > 0)
  }, [cart])

  const value = {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    clearAllCarts,
    getCartItemsForStore,
    getCartTotalForStore,
    getAllCartItems,
    getCartCount,
    getStoreIds,
    itemDetails
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export { useCart, CartProvider }
