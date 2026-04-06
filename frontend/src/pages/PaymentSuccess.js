import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const { token, API } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!sessionId) {
        setStatus('error');
        return;
      }

      let attempts = 0;
      const maxAttempts = 5;
      const pollInterval = 2000;

      const poll = async () => {
        try {
          const response = await axios.get(
            `${API}/checkout/status/${sessionId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.data.payment_status === 'paid') {
            setStatus('success');
            setPaymentDetails(response.data);
          } else if (response.data.status === 'expired') {
            setStatus('error');
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, pollInterval);
          } else {
            setStatus('pending');
          }
        } catch (error) {
          setStatus('error');
        }
      };

      poll();
    };

    checkPaymentStatus();
  }, [sessionId, token, API]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-[#0A0A0A] flex items-center justify-center">
      <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-xl p-8 text-center">
        {status === 'checking' && (
          <>
            <Loader2 className="w-16 h-16 text-[#FF0000] mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>
              Verifying Payment
            </h2>
            <p className="text-[#A1A1AA]">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-[#10B981] mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit' }} data-testid="payment-success-title">
              Payment Successful!
            </h2>
            <p className="text-[#A1A1AA] mb-8">
              Your subscription has been activated. Start creating viral content now!
            </p>
            <Button
              onClick={() => navigate('/generator')}
              className="viral-glow-button rounded-full px-8 py-4 font-bold tracking-wide"
              data-testid="go-to-generator-button"
            >
              Start Creating
            </Button>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="w-16 h-16 text-[#F59E0B] mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>
              Payment Processing
            </h2>
            <p className="text-[#A1A1AA] mb-8">
              Your payment is being processed. This may take a few moments.
            </p>
            <Button
              onClick={() => navigate('/pricing')}
              variant="outline"
              className="rounded-full px-8 py-4 font-bold tracking-wide border-[#262626] text-white hover:border-[#FF0000] hover:text-[#FF0000]"
            >
              Back to Pricing
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-[#FF0000]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✕</span>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>
              Payment Failed
            </h2>
            <p className="text-[#A1A1AA] mb-8">
              Something went wrong with your payment. Please try again.
            </p>
            <Button
              onClick={() => navigate('/pricing')}
              className="viral-glow-button rounded-full px-8 py-4 font-bold tracking-wide"
            >
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
