'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface NavigationProps {
  className?: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  description: string
}

const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const navItems: NavItem[] = [
    {
      name: 'Kanban',
      href: '/dashboard',
      description: 'Task management board',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      )
    },
    {
      name: 'Calendar',
      href: '/calendar',
      description: 'Task scheduling view',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'Journal',
      href: '/journal',
      description: 'Audio journal & transcripts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      name: 'Categories',
      href: '/categories',
      description: 'Manage task categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    },
    {
      name: 'MBB',
      href: '/mbb',
      description: 'Mental Bank Balance tracking',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      name: 'Vision Board',
      href: '/vision-board',
      description: 'Manage inspiration images',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
  ]

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === '/dashboard' || router.pathname === '/'
    }
    return router.pathname === href || router.pathname.startsWith(href + '/')
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <nav className={`${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">MBB Dashboard</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                  flex items-center space-x-2 group relative
                  ${
                    isActiveRoute(item.href)
                      ? 'bg-white/20 text-white shadow-sm border border-white/30'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }
                `}
                title={item.description}
              >
                <span className={`
                  transition-colors duration-200
                  ${isActiveRoute(item.href) ? 'text-white' : 'text-white/60 group-hover:text-white/80'}
                `}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
                
                {/* Active indicator */}
                {isActiveRoute(item.href) && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                )}
              </Link>
            ))}
          </div>

          {/* User Menu & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* User Avatar/Menu - Placeholder */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200"
              aria-expanded="false"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/5 backdrop-blur-sm border-t border-white/10 rounded-b-lg">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200
                    flex items-center space-x-3
                    ${
                      isActiveRoute(item.href)
                        ? 'bg-white/20 text-white border-l-4 border-blue-400'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span className={`
                    ${isActiveRoute(item.href) ? 'text-white' : 'text-white/60'}
                  `}>
                    {item.icon}
                  </span>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-white/50">{item.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation 