'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface DarkNavigationProps {
  className?: string
}

const DarkNavigation: React.FC<DarkNavigationProps> = ({ className = '' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const navItems = [
    { name: 'Kanban', href: '/dashboard', icon: '📋' },
    { name: 'Calendar', href: '/calendar', icon: '📅' },
    { name: 'Journal', href: '/journal', icon: '📝' },
    { name: 'Categories', href: '/categories', icon: '🏷️' },
    { name: 'MBB', href: '/mbb', icon: '💰' },
    { name: 'Vision Board', href: '/vision-board', icon: '🖼️' },
    { name: 'Profile', href: '/profile', icon: '👤' }
  ]

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === '/dashboard' || router.pathname === '/'
    }
    return router.pathname === href
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <nav className={`w-full bg-white/5 backdrop-blur-sm border-b border-white/10 ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-white hover:text-blue-300 transition-colors">
              MBB Dashboard
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    flex items-center space-x-2
                    ${
                      isActiveRoute(item.href)
                        ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    block px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200
                    flex items-center space-x-3
                    ${
                      isActiveRoute(item.href)
                        ? 'bg-white/20 text-white border-l-4 border-blue-400'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default DarkNavigation 