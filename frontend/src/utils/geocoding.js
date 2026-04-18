// Geocoding utility for converting pincode to coordinates
// Using OpenStreetMap Nominatim API (free and reliable)

export const getCoordinatesFromPincode = async (pincode) => {
  try {
    // Clean the pincode
    const cleanPincode = pincode.toString().trim()
    
    if (!cleanPincode || cleanPincode.length < 3) {
      throw new Error('Invalid pincode')
    }

    // Use OpenStreetMap Nominatim API to get coordinates
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${cleanPincode}&format=json&limit=1&countrycodes=in,us,ca,gb,au,de,fr,it,es,jp,cn,in,br,mx,ru,za,ng,ke,eg,ma,sa,ae,tr,th,vn,my,sg,id,ph,kr,jp,cn,tw,hk,mn,kz,uz,tj,kg,tm,af,pk,bd,lk,np,bt,mv,in&addressdetails=1`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch coordinates')
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      throw new Error('No coordinates found for this pincode')
    }

    const result = data[0]
    const coordinates = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name
    }

    // Validate coordinates
    if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) {
      throw new Error('Invalid coordinates received')
    }

    return coordinates
  } catch (error) {
    console.error('Geocoding error:', error)
    throw new Error(`Failed to get coordinates: ${error.message}`)
  }
}

export const validatePincode = (pincode) => {
  if (!pincode) return { isValid: false, message: 'Pincode is required' }
  
  const cleanPincode = pincode.toString().trim()
  
  if (cleanPincode.length < 3) {
    return { isValid: false, message: 'Pincode must be at least 3 characters' }
  }
  
  if (cleanPincode.length > 10) {
    return { isValid: false, message: 'Pincode is too long' }
  }
  
  // Basic format validation (numbers and letters allowed)
  if (!/^[a-zA-Z0-9\s-]+$/.test(cleanPincode)) {
    return { isValid: false, message: 'Pincode contains invalid characters' }
  }
  
  return { isValid: true, message: '' }
} 