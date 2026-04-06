import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, Target, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-bg relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <h1 
            className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none mb-6" 
            style={{ fontFamily: 'Outfit' }}
            data-testid="hero-headline"
          >
            Stop Guessing.
            <br />
            <span className="text-[#FF0000]">Start Going Viral.</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#A1A1AA] mb-12 max-w-2xl mx-auto leading-relaxed">
            AI-powered insights for YouTube creators worldwide. Generate viral ideas and analyze your videos in seconds.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to={user ? "/generator" : "/signup"} data-testid="cta-get-started">
              <Button className="viral-glow-button rounded-full px-8 py-6 text-lg font-bold tracking-wide">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Generating Ideas
              </Button>
            </Link>
            <Link to={user ? "/analyzer" : "/signup"} data-testid="cta-analyze">
              <Button variant="outline" className="rounded-full px-8 py-6 text-lg font-bold tracking-wide bg-transparent border-[#262626] text-white hover:border-[#FF0000] hover:text-[#FF0000] transition-all">
                Analyze Video
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16" style={{ fontFamily: 'Outfit' }}>
            Built for Creators Who Want to <span className="text-[#FF0000]">Win</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 hover:border-[#FF0000] transition-all" data-testid="feature-generator">
              <Sparkles className="w-12 h-12 text-[#FF0000] mb-4" />
              <h3 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'Outfit' }}>Viral Idea Generator</h3>
              <p className="text-[#A1A1AA] leading-relaxed">
                Get 10 unique video ideas tailored to your niche, complete with hooks, thumbnails, and viral scores.
              </p>
            </div>
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 hover:border-[#FF0000] transition-all" data-testid="feature-analyzer">
              <TrendingUp className="w-12 h-12 text-[#FF0000] mb-4" />
              <h3 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'Outfit' }}>Video Failure Analyzer</h3>
              <p className="text-[#A1A1AA] leading-relaxed">
                Understand why your videos underperform and get actionable fixes to improve performance.
              </p>
            </div>
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 hover:border-[#FF0000] transition-all" data-testid="feature-multilang">
              <Target className="w-12 h-12 text-[#FF0000] mb-4" />
              <h3 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'Outfit' }}>Multi-Language Support</h3>
              <p className="text-[#A1A1AA] leading-relaxed">
                Create content for global audiences in English, Hindi, Spanish, French, Portuguese, and Arabic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#0A0A0A] to-[#141414]">
        <div className="max-w-4xl mx-auto text-center">
          <Zap className="w-16 h-16 text-[#FF0000] mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'Outfit' }}>
            Ready to Go Viral?
          </h2>
          <p className="text-xl text-[#A1A1AA] mb-8">
            Join thousands of creators using ViralIQ to dominate YouTube.
          </p>
          <Link to={user ? "/generator" : "/signup"} data-testid="footer-cta">
            <Button className="viral-glow-button rounded-full px-8 py-6 text-lg font-bold tracking-wide">
              Start Free Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
