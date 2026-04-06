import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const Signin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signin(email, password);
      toast.success('Welcome back!');
      navigate('/generator');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center bg-[#0A0A0A]">
      <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit' }} data-testid="signin-title">
          Welcome Back
        </h1>
        <p className="text-[#A1A1AA] mb-8">Sign in to continue creating viral content</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-white mb-2 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-[#71717A]" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]"
                placeholder="you@example.com"
                data-testid="signin-email-input"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="password" className="text-white mb-2 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-[#71717A]" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]"
                placeholder="••••••••"
                data-testid="signin-password-input"
              />
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full viral-glow-button rounded-full py-6 font-bold tracking-wide"
            data-testid="signin-submit-button"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-[#A1A1AA]">
          Don't have an account?{' '}
          <a href="/signup" className="text-[#FF0000] hover:underline" data-testid="signup-link">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signin;
