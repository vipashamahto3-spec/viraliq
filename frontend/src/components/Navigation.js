import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

const Navigation = () => {
  const { user, signout } = useAuth();
  const navigate = useNavigate();

  const handleSignout = () => {
    signout();
    navigate('/');
  };

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <Flame className="w-8 h-8 text-[#FF0000]" />
          <span className="text-2xl font-black tracking-tighter" style={{ fontFamily: 'Outfit' }}>
            ViralIQ
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/generator" className="text-sm font-semibold text-white hover:text-[#FF0000] transition-colors" data-testid="nav-generator">
                Generator
              </Link>
              <Link to="/analyzer" className="text-sm font-semibold text-white hover:text-[#FF0000] transition-colors" data-testid="nav-analyzer">
                Analyzer
              </Link>
              <Link to="/pricing" className="text-sm font-semibold text-white hover:text-[#FF0000] transition-colors" data-testid="nav-pricing">
                Pricing
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-[#141414] border border-[#262626] rounded-full">
                  <User className="w-4 h-4 text-[#FF0000]" />
                  <span className="text-xs font-semibold">{user.subscription_tier.toUpperCase()}</span>
                </div>
                <Button
                  onClick={handleSignout}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-[#FF0000]"
                  data-testid="signout-button"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/pricing" className="text-sm font-semibold text-white hover:text-[#FF0000] transition-colors" data-testid="nav-pricing-guest">
                Pricing
              </Link>
              <Link to="/signin" data-testid="nav-signin">
                <Button variant="ghost" className="text-white hover:text-[#FF0000]">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" data-testid="nav-signup">
                <Button className="viral-glow-button rounded-full px-6 py-2 font-bold tracking-wide">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
