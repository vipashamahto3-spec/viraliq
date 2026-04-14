import React, { useState } from 'react';
import { Check, Crown, Rocket, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const { user, token, API, signout } = useAuth();
  const [loading, setLoading] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async (plan) => {
    if (!user) {
      navigate('/signup');
      return;
    }

    setLoading(plan);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(
        `${API}/checkout/session?plan=${plan}&origin_url=${originUrl}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create checkout session');
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await axios.post(
        `${API}/subscription/cancel`,
        { confirm: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Subscription cancelled. You are now on the Free plan.');
      setShowCancelDialog(false);
      // Force re-login to refresh user data
      signout();
      navigate('/signin');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const currentTier = user?.subscription_tier || 'free';

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      icon: Check,
      features: [
        '3 generations per week',
        '1 analysis per week',
        'Multi-language support',
        'Basic viral scores'
      ],
      cta: 'Get Started',
      plan_id: null,
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$9',
      period: 'month',
      icon: Crown,
      features: [
        'Unlimited generations',
        'Unlimited analysis',
        'Multi-language support',
        'Advanced viral scores',
        'Priority support'
      ],
      cta: 'Upgrade to Pro',
      plan_id: 'pro',
      highlighted: true
    },
    {
      name: 'Agency',
      price: '$29',
      period: 'month',
      icon: Rocket,
      features: [
        'Everything in Pro',
        'API Access',
        'Multiple accounts',
        'Custom integrations',
        'Dedicated support'
      ],
      cta: 'Upgrade to Agency',
      plan_id: 'agency',
      highlighted: false
    }
  ];

  const getButtonLabel = (plan) => {
    if (loading === plan.plan_id) return 'Processing...';
    if (!user) return plan.plan_id ? plan.cta : 'Sign Up Free';
    if (plan.plan_id === null && currentTier === 'free') return 'Current Plan';
    if (plan.plan_id === currentTier) return 'Current Plan';
    if (plan.plan_id === null && currentTier !== 'free') return 'Downgrade';
    return plan.cta;
  };

  const isCurrentPlan = (plan) => {
    if (!user) return false;
    if (plan.plan_id === null && currentTier === 'free') return true;
    return plan.plan_id === currentTier;
  };

  const handlePlanClick = (plan) => {
    if (isCurrentPlan(plan)) return;
    if (!user) {
      navigate('/signup');
      return;
    }
    if (plan.plan_id === null) {
      setShowCancelDialog(true);
      return;
    }
    handleSubscribe(plan.plan_id);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 relative bg-[#0A0A0A]">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black mb-4" style={{ fontFamily: 'Outfit' }} data-testid="pricing-title">
            Choose Your <span className="text-[#FF0000]">Power Level</span>
          </h1>
          <p className="text-xl text-[#A1A1AA]">
            Start free, upgrade when you're ready to dominate
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = isCurrentPlan(plan);
            return (
              <div
                key={plan.name}
                className={`bg-[#141414] rounded-xl p-8 transition-all ${
                  plan.highlighted
                    ? 'border-2 border-[#FF0000] shadow-[0_0_30px_rgba(255,0,0,0.3)] transform scale-105'
                    : 'border border-[#262626]'
                } ${isCurrent ? 'ring-2 ring-[#10B981]/50' : ''}`}
                data-testid={`pricing-plan-${plan.name.toLowerCase()}`}
              >
                {plan.highlighted && (
                  <div className="bg-[#FF0000]/10 border border-[#FF0000]/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#FF0000] inline-block mb-4">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="bg-[#10B981]/10 border border-[#10B981]/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#10B981] inline-block mb-4">
                    Current Plan
                  </div>
                )}
                
                <div className="mb-6">
                  <Icon className="w-12 h-12 text-[#FF0000] mb-4" />
                  <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-[#A1A1AA]">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#FF0000] mt-0.5 flex-shrink-0" />
                      <span className="text-[#A1A1AA]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanClick(plan)}
                  disabled={isCurrent || loading === plan.plan_id}
                  className={`w-full rounded-full py-6 font-bold tracking-wide ${
                    isCurrent
                      ? 'bg-[#10B981]/20 text-[#10B981] cursor-default hover:bg-[#10B981]/20'
                      : plan.highlighted
                      ? 'viral-glow-button'
                      : 'bg-transparent border border-[#262626] text-white hover:border-[#FF0000] hover:text-[#FF0000]'
                  }`}
                  data-testid={`subscribe-${plan.name.toLowerCase()}-button`}
                >
                  {getButtonLabel(plan)}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Cancel Subscription section for paid users */}
        {user && currentTier !== 'free' && (
          <div className="mt-12 max-w-md mx-auto text-center">
            <button
              onClick={() => setShowCancelDialog(true)}
              className="text-sm text-[#71717A] hover:text-[#FF0000] underline transition-colors"
              data-testid="cancel-subscription-link"
            >
              Cancel my subscription
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" data-testid="cancel-dialog-overlay">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 max-w-md w-full" data-testid="cancel-dialog">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-[#F59E0B] mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>
                Cancel Subscription?
              </h2>
              <p className="text-[#A1A1AA] mb-2">
                You'll lose access to your <strong className="text-white">{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</strong> features:
              </p>
              <ul className="text-sm text-[#A1A1AA] mb-6 space-y-1">
                <li>Unlimited generations and analyses</li>
                <li>You'll be limited to 3 generations/week</li>
                <li>You'll be limited to 1 analysis/week</li>
              </ul>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 rounded-full py-4 font-bold bg-transparent border border-[#262626] text-white hover:border-white"
                data-testid="cancel-dialog-keep-button"
              >
                Keep Plan
              </Button>
              <Button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 rounded-full py-4 font-bold bg-[#FF0000] hover:bg-[#CC0000] text-white"
                data-testid="cancel-dialog-confirm-button"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
