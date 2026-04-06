import React, { useState } from 'react';
import { Sparkles, Flame, Clock, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const Generator = () => {
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState('English');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token, API } = useAuth();

  const handleGenerate = async () => {
    if (!niche || !targetAudience) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/generate-ideas`,
        { niche, target_audience: targetAudience, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIdeas(response.data.ideas);
      toast.success('Ideas generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4" style={{ fontFamily: 'Outfit' }} data-testid="generator-title">
            Viral Idea <span className="text-[#FF0000]">Generator</span>
          </h1>
          <p className="text-xl text-[#A1A1AA]">
            Get 10 AI-powered video ideas tailored to your niche
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-[#141414] border border-[#262626] rounded-xl p-8 mb-12">
          <div className="space-y-6">
            <div>
              <Label htmlFor="niche" className="text-white mb-2 block">Niche</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., Tech Reviews, Gaming, Fitness"
                className="bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]"
                data-testid="niche-input"
              />
            </div>

            <div>
              <Label htmlFor="audience" className="text-white mb-2 block">Target Audience</Label>
              <Input
                id="audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Teenagers, Young professionals, Parents"
                className="bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]"
                data-testid="audience-input"
              />
            </div>

            <div>
              <Label htmlFor="language" className="text-white mb-2 block">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-[#0F0F0F] border-[#262626] text-white focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000]" data-testid="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-[#262626] text-white">
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="Portuguese">Portuguese</SelectItem>
                  <SelectItem value="Arabic">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full viral-glow-button rounded-full py-6 font-bold tracking-wide"
              data-testid="generate-ideas-button"
            >
              {loading ? (
                'Generating Ideas...'
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Viral Ideas
                </>
              )}
            </Button>
          </div>
        </div>

        {ideas.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Outfit' }}>
              Your Viral Ideas
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {ideas.map((idea, index) => (
                <div
                  key={index}
                  className="idea-card bg-[#141414] border border-[#262626] rounded-xl p-6"
                  data-testid={`idea-card-${index}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold flex-1" style={{ fontFamily: 'Outfit' }}>
                      {idea.title}
                    </h3>
                    <div className="flex items-center gap-1 bg-[#FF0000]/10 border border-[#FF0000]/20 px-3 py-1 rounded-full">
                      <Flame className="w-4 h-4 text-[#FF0000]" />
                      <span className="text-[#FF0000] font-bold text-sm">{idea.viral_score}/10</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">Hook (First 15s)</p>
                      <p className="text-sm text-white">{idea.hook}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">Thumbnail Concept</p>
                      <p className="text-sm text-white">{idea.thumbnail_concept}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[#262626]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#71717A]" />
                      <span className="text-sm text-[#A1A1AA]">{idea.best_upload_day}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#71717A]" />
                      <span className="text-sm text-[#A1A1AA]">{idea.best_upload_time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Generator;
