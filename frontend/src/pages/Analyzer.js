import React, { useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Youtube } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const Analyzer = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token, API } = useAuth();

  const handleAnalyze = async () => {
    if (!videoUrl) {
      toast.error('Please enter a video URL');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/analyze-video`,
        { video_url: videoUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysis(response.data);
      toast.success('Video analyzed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to analyze video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4" style={{ fontFamily: 'Outfit' }} data-testid="analyzer-title">
            Video Failure <span className="text-[#FF0000]">Analyzer</span>
          </h1>
          <p className="text-xl text-[#A1A1AA]">
            Understand why your videos underperformed and how to fix them
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-[#141414] border border-[#262626] rounded-xl p-8 mb-12">
          <div className="space-y-6">
            <div>
              <Label htmlFor="videoUrl" className="text-white mb-2 block">YouTube Video URL</Label>
              <div className="relative">
                <Youtube className="absolute left-3 top-3 w-5 h-5 text-[#71717A]" />
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="pl-10 bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]"
                  data-testid="video-url-input"
                />
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full viral-glow-button rounded-full py-6 font-bold tracking-wide"
              data-testid="analyze-video-button"
            >
              {loading ? (
                'Analyzing Video...'
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Analyze My Video
                </>
              )}
            </Button>
          </div>
        </div>

        {analysis && (
          <div className="max-w-5xl mx-auto" data-testid="analysis-results">
            {/* Score */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 mb-8 text-center">
              <h2 className="text-2xl font-semibold mb-6" style={{ fontFamily: 'Outfit' }}>Performance Score</h2>
              <div className="score-circle inline-flex items-center justify-center w-40 h-40 rounded-full border-4 border-[#FF0000] bg-[#FF0000]/10">
                <span className="text-6xl font-black text-[#FF0000]" data-testid="performance-score">{analysis.score}</span>
                <span className="text-2xl text-[#A1A1AA]">/100</span>
              </div>
            </div>

            {/* Reasons */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6" style={{ fontFamily: 'Outfit' }}>Why It Underperformed</h2>
              <div className="space-y-6">
                {analysis.reasons.map((item, index) => (
                  <div key={index} className="border-l-4 border-[#FF0000] pl-6 py-2" data-testid={`reason-${index}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-[#FF0000] mt-1 flex-shrink-0" />
                      <p className="text-white font-semibold">{item.reason}</p>
                    </div>
                    <div className="flex items-start gap-3 pl-8">
                      <CheckCircle className="w-5 h-5 text-[#10B981] mt-1 flex-shrink-0" />
                      <p className="text-[#A1A1AA]"><span className="text-[#10B981] font-semibold">Fix:</span> {item.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Improved Title & Thumbnail */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Outfit' }}>Improved Title</h3>
                <p className="text-[#A1A1AA]" data-testid="improved-title">{analysis.improved_title}</p>
              </div>
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Outfit' }}>Better Thumbnail</h3>
                <p className="text-[#A1A1AA]" data-testid="better-thumbnail">{analysis.better_thumbnail}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyzer;
