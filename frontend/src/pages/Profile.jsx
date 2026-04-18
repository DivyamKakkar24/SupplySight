import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Shield } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account information</p>
      </div>

      <div className="card">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <dl className="space-y-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <dt className="text-sm font-medium text-gray-500 w-24">Name:</dt>
                <dd className="text-sm text-gray-900">{user?.name}</dd>
              </div>
              
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <dt className="text-sm font-medium text-gray-500 w-24">Email:</dt>
                <dd className="text-sm text-gray-900">{user?.email}</dd>
              </div>
              
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-gray-400 mr-3" />
                <dt className="text-sm font-medium text-gray-500 w-24">Role:</dt>
                <dd className="text-sm text-gray-900 capitalize">{user?.role}</dd>
              </div>
              
              <div className="flex items-center">
                <dt className="text-sm font-medium text-gray-500 w-24">Member since:</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(user?.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile 