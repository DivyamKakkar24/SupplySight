// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
export const validatePassword = (password) => {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' }
  }
  return { isValid: true, message: '' }
}

// Name validation
export const validateName = (name) => {
  if (!name || name.trim().length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters long' }
  }
  return { isValid: true, message: '' }
}

// Price validation
export const validatePrice = (price) => {
  const numPrice = parseFloat(price)
  if (isNaN(numPrice) || numPrice < 0) {
    return { isValid: false, message: 'Price must be a positive number' }
  }
  return { isValid: true, message: '' }
}

// Quantity validation
export const validateQuantity = (quantity) => {
  const numQuantity = parseInt(quantity)
  if (isNaN(numQuantity) || numQuantity < 0) {
    return { isValid: false, message: 'Quantity must be a positive number' }
  }
  return { isValid: true, message: '' }
}

// SKU validation
export const validateSKU = (sku) => {
  if (!sku || sku.trim().length < 3) {
    return { isValid: false, message: 'SKU must be at least 3 characters long' }
  }
  return { isValid: true, message: '' }
}

// Address validation
export const validateAddress = (address) => {
  if (!address || address.trim().length < 5) {
    return { isValid: false, message: 'Address must be at least 5 characters long' }
  }
  return { isValid: true, message: '' }
}

// Form validation helper
export const validateForm = (fields) => {
  const errors = {}
  
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    if (field.required && (!field.value || field.value.trim() === '')) {
      errors[fieldName] = `${field.label} is required`
    } else if (field.value && field.validator) {
      const validation = field.validator(field.value)
      if (!validation.isValid) {
        errors[fieldName] = validation.message
      }
    }
  })
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
} 