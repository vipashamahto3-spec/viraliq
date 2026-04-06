import React, { useState, useEffect } from 'react';
import { Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';

const AdminTesting = () => {
  const [email, setEmail] = useState('');
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    loadTestModeStatus();
  }, []);

  const loadTestModeStatus = async () => {
    try {
      const response = await axios.get(`${API}/admin/test-mode/status`);
      setTestModeEnabled(response.data.enabled);
      setCurrentEmail(response.data.email);
      if (response.data.enabled) {
        setEmail(response.data.email);
      }
    } catch (error) {
      console.error('Failed to load test mode status:', error);
    }
  };

  const handleToggle = async () => {
    if (!testModeEnabled && !email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/test-mode`, {
        enabled: !testModeEnabled,
        email: email
      });
      
      setTestModeEnabled(!testModeEnabled);
      if (!testModeEnabled) {
        setCurrentEmail(email);
        toast.success(`Test mode enabled for ${email}`);
      } else {
        setCurrentEmail(null);
        toast.success('Test mode disabled');
      }
    } catch (error) {
      toast.error('Failed to toggle test mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-[#0A0A0A] flex items-center justify-center">
      <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-[#FF0000]" />
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Outfit' }} data-testid="admin-testing-title">
            Admin Testing
          </h1>
        </div>

        <div className="bg-[#1A1A1A] border border-[#262626] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#A1A1AA]">Test Mode Status</span>
            {testModeEnabled ? (
              <ToggleRight className="w-8 h-8 text-[#10B981]" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-[#71717A]" />
            )}
          </div>
          <p className={`text-lg font-bold ${testModeEnabled ? 'text-[#10B981]' : 'text-[#71717A]'}`} data-testid="test-mode-status">
            {testModeEnabled ? 'ENABLED' : 'DISABLED'}
          </p>
          {testModeEnabled && currentEmail && (
            <p className="text-sm text-[#A1A1AA] mt-2">
              Active for: <span className="text-white">{currentEmail}</span>
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-white mb-2 block">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]"
              disabled={testModeEnabled}
              data-testid="admin-email-input"
            />
            <p className="text-xs text-[#71717A] mt-2">
              This email will have unlimited generations and analyses
            </p>
          </div>

          <Button
            onClick={handleToggle}
            disabled={loading}
            className={`w-full rounded-full py-6 font-bold tracking-wide ${
              testModeEnabled
                ? 'bg-[#71717A] hover:bg-[#52525B]'
                : 'viral-glow-button'
            }`}
            data-testid="toggle-test-mode-button"
          >
            {loading ? 'Processing...' : testModeEnabled ? 'Disable Test Mode' : 'Enable Test Mode'}
          </Button>
        </div>

        <div className="mt-8 p-4 bg-[#FF0000]/10 border border-[#FF0000]/20 rounded-lg">
          <p className="text-sm text-[#FF0000] font-semibold mb-2">Test Mode Effects:</p>
          <ul className="text-xs text-[#A1A1AA] space-y-1">
            <li>• Unlimited viral idea generations</li>
            <li>• Unlimited video analyses</li>
            <li>• All subscription restrictions removed</li>
            <li>• Only applies to the specified email</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminTesting;
