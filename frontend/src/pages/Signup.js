import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, fullName);
      toast.success('Account created successfully!');
      navigate('/generator');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center bg-[#0A0A0A]">
      <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit' }} data-testid="signup-title">
          Create Account
        </h1>
        <p className="text-[#A1A1AA] mb-8">Start your journey to viral success</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="fullName" className="text-white mb-2 block">Full Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-5 h-5 text-[#71717A]" />
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]"
                placeholder="John Doe"
                data-testid="signup-fullname-input"
              />
            </div>
          </div>
          
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
                data-testid="signup-email-input"
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
                data-testid="signup-password-input"
              />
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full viral-glow-button rounded-full py-6 font-bold tracking-wide"
            data-testid="signup-submit-button"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-[#A1A1AA]">
          Already have an account?{' '}
          <a href="/signin" className="text-[#FF0000] hover:underline" data-testid="signin-link">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
