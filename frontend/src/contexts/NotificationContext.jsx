import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastPoll, setLastPoll] = useState(new Date())
  const { user } = useAuth()

  // Fetch all notifications on mount
  useEffect(() => {
    if (!user) return

    const fetchAllNotifications = async () => {
      try {
        const response = await api.get('/notifications')
        setNotifications(response.data.notifications || [])
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchAllNotifications()
  }, [user])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return

    const pollNotifications = async () => {
      try {
        const response = await api.get(`/notifications?since=${lastPoll.toISOString()}`)
        const newNotifications = response.data.notifications
        
        if (newNotifications.length > 0) {
          setNotifications(prev => [...newNotifications, ...prev])
          setUnreadCount(prev => prev + newNotifications.length)
          
          // Show toast for new notifications
          newNotifications.forEach(notification => {
            toast(notification.message, {
              icon: '🔔',
              duration: 5000,
            })
          })
        }
        
        setLastPoll(new Date())
      } catch (error) {
        console.error('Failed to poll notifications:', error)
      }
    }

    const interval = setInterval(pollNotifications, 30000) // 30 seconds
    
    // Initial poll
    pollNotifications()

    return () => clearInterval(interval)
  }, [user, lastPoll])

  // Get unread count
  useEffect(() => {
    if (!user) return

    const getUnreadCount = async () => {
      try {
        const response = await api.get('/notifications/unread/count')
        setUnreadCount(response.data.count)
      } catch (error) {
        console.error('Failed to get unread count:', error)
      }
    }

    getUnreadCount()
  }, [user, notifications])

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`)
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      )
      if (!notifications.find(n => n._id === notificationId)?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
} 