import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Store, 
  TrendingUp, 
  Bell, 
  MapPin, 
  Shield, 
  Zap,
  BarChart3,
  Users,
  Smartphone,
  Laptop,
  Headphones,
  Database,
  Cpu,
  Globe,
  Clock,
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: <Store className="w-8 h-8" />,
      title: "Multi-Store Management",
      description: "Manage inventory across multiple store locations with real-time synchronization and centralized control. Track stock levels, manage reorders, and monitor performance across all your retail locations.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "AI-Powered Forecasting",
      description: "Leverage machine learning algorithms for demand prediction with 7-day sales analysis. Get intelligent reorder suggestions with confidence scoring to optimize inventory levels.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "Smart Notifications",
      description: "Real-time alerts for low stock, out-of-stock items, and ML-powered reorder recommendations. Stay informed with automated notifications that keep you ahead of inventory issues.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Interactive Store Mapping",
      description: "Visualize store locations with interactive maps and geospatial inventory tracking. Get a bird's eye view of your retail network with detailed location-based analytics.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Role-Based Access Control",
      description: "Secure authentication with manager and customer roles, ensuring proper access control. Different dashboards and permissions based on user roles for enhanced security.",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Real-Time Analytics",
      description: "Comprehensive dashboards with order tracking, inventory analytics, and performance metrics. Make data-driven decisions with detailed insights and reporting.",
      color: "from-yellow-500 to-yellow-600"
    }
  ];

  const techStack = [
    { icon: <Database className="w-6 h-6" />, name: "MongoDB", description: "NoSQL Database" },
    { icon: <Cpu className="w-6 h-6" />, name: "Node.js", description: "Backend Runtime" },
    { icon: <Globe className="w-6 h-6" />, name: "React", description: "Frontend Framework" },
    { icon: <Zap className="w-6 h-6" />, name: "FastAPI", description: "ML Service" }
  ];

  const benefits = [
    "Real-time inventory tracking across multiple stores",
    "AI-powered demand forecasting with 95% accuracy",
    "Automated reorder suggestions with confidence scoring",
    "Interactive store mapping with geolocation",
    "Role-based access control for managers and customers",
    "Smart notifications for low stock and ML recommendations",
    "Comprehensive analytics and reporting dashboards",
    "Automated cron jobs for inventory monitoring"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SupplySight
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 relative z-10">
          <div className="text-center relative z-20">

            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-20 leading-tight relative z-[9999]">
              SupplySight
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-6 relative z-[9999] leading-tight pb-2">
                Smart Inventory Management System
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed mt-6">
              Transform your retail business with AI-powered inventory forecasting, real-time tracking, 
              and intelligent notifications. Manage multiple stores effortlessly with our comprehensive platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                to="/login"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-xl flex items-center space-x-2"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="border-2 border-gray-300 text-gray-700 px-10 py-4 rounded-xl text-lg font-semibold hover:border-gray-400 transition-colors flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Watch Demo</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-40 left-10 w-28 h-28 bg-blue-200 rounded-full opacity-80 animate-pulse z-0"></div>
        <div className="absolute top-60 right-20 w-24 h-24 bg-purple-200 rounded-full opacity-80 animate-pulse delay-1000 z-0"></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-green-200 rounded-full opacity-80 animate-pulse delay-2000 z-0"></div>
        <div className="absolute top-80 left-1/3 w-16 h-16 bg-yellow-200 rounded-full opacity-70 animate-pulse delay-500 z-0"></div>
        <div className="absolute bottom-60 right-1/3 w-18 h-18 bg-pink-200 rounded-full opacity-75 animate-pulse delay-1500 z-0"></div>
        <div className="absolute top-32 right-1/4 w-12 h-12 bg-indigo-200 rounded-full opacity-70 animate-pulse delay-3000 z-0"></div>

      </section>



      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Powerful Features for Modern Retail
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your inventory efficiently and grow your business with AI-powered insights
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center text-white mb-6 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Built with Modern Technology
            </h2>
            <p className="text-xl text-gray-600">
              Leveraging the latest technologies for optimal performance and scalability
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {techStack.map((tech, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl text-center hover:shadow-lg transition-shadow duration-300 border border-gray-200">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
                  {tech.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {tech.name}
                </h3>
                <p className="text-gray-600">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Why Choose SupplySight?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-300 mt-1 flex-shrink-0" />
                <span className="text-white text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Credentials */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Try Our Live Demo
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Experience the full functionality with our pre-loaded demo data and verified features
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
              <h3 className="text-2xl font-semibold text-white mb-6">Manager Account</h3>
              <div className="space-y-3 text-gray-200 text-lg">
                <p><strong className="text-white">Email:</strong> manager1@test.com</p>
                <p><strong className="text-white">Password:</strong> password123</p>
              </div>
              <p className="text-gray-300 mt-6">
                Access inventory management, analytics, store oversight, and ML-powered forecasting
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
              <h3 className="text-2xl font-semibold text-white mb-6">Customer Account</h3>
              <div className="space-y-3 text-gray-200 text-lg">
                <p><strong className="text-white">Email:</strong> customer1@test.com</p>
                <p><strong className="text-white">Password:</strong> password123</p>
              </div>
              <p className="text-gray-300 mt-6">
                Browse stores, place orders, track purchases, and view interactive maps
              </p>
            </div>
          </div>
          
          <Link
            to="/login"
            className="bg-white text-gray-900 px-12 py-4 rounded-xl text-xl font-semibold hover:bg-gray-100 transition-colors duration-200 inline-block shadow-xl"
          >
            Start Exploring Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">SupplySight</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Modern inventory management powered by AI and real-time analytics. 
                Transform your retail business with intelligent forecasting and comprehensive tracking.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Core Features</h3>
              <ul className="space-y-3 text-gray-400">
                <li>Multi-Store Management</li>
                <li>AI-Powered Forecasting</li>
                <li>Real-time Notifications</li>
                <li>Interactive Store Maps</li>
                <li>Role-Based Access Control</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Technology Stack</h3>
              <ul className="space-y-3 text-gray-400">
                <li>React & Node.js</li>
                <li>MongoDB Database</li>
                <li>Python FastAPI</li>
                <li>Tailwind CSS</li>
                <li>Machine Learning</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Get Started</h3>
              <div className="space-y-3">
                <Link to="/register" className="block text-gray-400 hover:text-white transition-colors">
                  Sign Up
                </Link>
                <Link to="/login" className="block text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/login" className="block text-gray-400 hover:text-white transition-colors">
                  Try Demo
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 SupplySight. All rights reserved. Built with modern technologies for optimal performance.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;


