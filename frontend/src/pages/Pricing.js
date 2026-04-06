import React, { useState } from 'react';
import { Check, Crown, Rocket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const { user, token, API } = useAuth();
  const [loading, setLoading] = useState(null);
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

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 pricing-bg">
      <div className="absolute inset-0 bg-black/70"></div>
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
            return (
              <div
                key={plan.name}
                className={`bg-[#141414] rounded-xl p-8 transition-all ${
                  plan.highlighted
                    ? 'border-2 border-[#FF0000] shadow-[0_0_30px_rgba(255,0,0,0.3)] transform scale-105'
                    : 'border border-[#262626]'
                }`}
                data-testid={`pricing-plan-${plan.name.toLowerCase()}`}
              >
                {plan.highlighted && (
                  <div className="bg-[#FF0000]/10 border border-[#FF0000]/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#FF0000] inline-block mb-4">
                    Most Popular
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
                  onClick={() => plan.plan_id ? handleSubscribe(plan.plan_id) : navigate('/signup')}
                  disabled={loading === plan.plan_id || (user && user.subscription_tier === plan.plan_id)}
                  className={`w-full rounded-full py-6 font-bold tracking-wide ${
                    plan.highlighted
                      ? 'viral-glow-button'
                      : 'bg-transparent border border-[#262626] text-white hover:border-[#FF0000] hover:text-[#FF0000]'
                  }`}
                  data-testid={`subscribe-${plan.name.toLowerCase()}-button`}
                >
                  {loading === plan.plan_id ? 'Processing...' : 
                   user && user.subscription_tier === plan.plan_id ? 'Current Plan' :
                   plan.cta}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
