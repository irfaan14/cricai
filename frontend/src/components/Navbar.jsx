import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Flame, Menu, X, Trophy, Cpu, Users, Home as HomeIcon } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Matches', path: '/matches', icon: Trophy },
    { name: 'Sandbox', path: '/sandbox', icon: Cpu },
    { name: 'Player Radar', path: '/players', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0d0906]/90 backdrop-blur-md border-b border-[#24170d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-950/50 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-[#0a0908] fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-wider text-[#fffbf5] leading-none">
                CRIC<span className="text-amber-500">AI</span>
              </span>
              <span className="text-[9px] font-mono tracking-widest text-amber-500/70 uppercase">
                Tactical Core
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#1f140c] text-amber-400 border border-amber-500/30 shadow-sm shadow-orange-950/20'
                        : 'text-amber-100/60 hover:text-[#fffbf5] hover:bg-[#160f0a]'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop Engine Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#140e09] border border-[#26170d] text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>XGBoost v4.4 Active</span>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-xl bg-[#140e09] border border-[#2b1d12] text-amber-400 hover:text-amber-300 focus:outline-none transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Dropdown Drawer */}
      <div
        className={`fixed top-16 left-0 right-0 bg-[#0f0a07] border-b border-[#2b1d12] p-5 shadow-2xl z-50 md:hidden transition-all duration-300 ease-in-out transform ${
          mobileMenuOpen
            ? 'translate-y-0 opacity-100'
            : '-translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col space-y-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/40'
                      : 'text-amber-100/70 hover:bg-[#160f0a] hover:text-[#fffbf5]'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-amber-500" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 mt-2 border-t border-[#24170d] flex items-center justify-between text-xs font-mono text-amber-100/50">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </span>
            <span>FastAPI + XGBoost</span>
          </div>
        </div>
      </div>
    </header>
  );
}