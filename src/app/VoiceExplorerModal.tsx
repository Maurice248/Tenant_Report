"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Volume2, VolumeX, Check, Sparkles, Filter, Mic2, User } from 'lucide-react';
import { Spinner } from './components';

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  accent: string;
  description: string;
  preview_url: string;
}

interface VoiceExplorerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVoice: (voiceId: string, voiceLabel: string) => void;
  selectedVoiceId: string;
}

export default function VoiceExplorerModal({
  isOpen,
  onOpenChange,
  onSelectVoice,
  selectedVoiceId
}: VoiceExplorerModalProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [accentFilter, setAccentFilter] = useState<string>('all');
  
  // Audio preview state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices on open
  useEffect(() => {
    if (isOpen) {
      const fetchVoices = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/elevenlabs/voices');
          const data = await res.json();
          if (data && data.voices) {
            setVoices(data.voices);
          }
        } catch (err) {
          console.error("Failed to load voices:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchVoices();
    } else {
      // Stop any playing audio when modal closes
      stopAudio();
    }
  }, [isOpen]);

  // Audio helper functions
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  const playPreview = (voiceId: string, previewUrl: string) => {
    if (!previewUrl) return;

    if (playingVoiceId === voiceId) {
      stopAudio();
      return;
    }

    // Stop previous audio if any
    stopAudio();

    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voiceId);

    audio.play().catch(err => {
      console.error("Playback failed:", err);
      setPlayingVoiceId(null);
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Filter logic
  const filteredVoices = voices.filter(voice => {
    // 1. Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      voice.name.toLowerCase().includes(query) ||
      voice.accent.toLowerCase().includes(query) ||
      voice.description.toLowerCase().includes(query);

    // 2. Gender Filter
    const matchesGender = genderFilter === 'all' || voice.gender === genderFilter;

    // 3. Accent Filter
    const matchesAccent = accentFilter === 'all' || 
      voice.accent.toLowerCase().includes(accentFilter.toLowerCase());

    return matchesSearch && matchesGender && matchesAccent;
  });

  // Extract unique accents for filter dropdown
  const uniqueAccents = Array.from(
    new Set(voices.map(v => v.accent).filter(Boolean))
  ).sort();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sd-modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }} />
        
        <Dialog.Content 
          className="sd-modal-content"
          style={{
            width: '65vw',
            maxWidth: '900px',
            minWidth: '650px',
            height: '80vh',
            maxHeight: '750px',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.25)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <Dialog.Title style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sparkles size={20} color="#0284c7" />
                ElevenLabs Voice Explorer
              </Dialog.Title>
              <Dialog.Description style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Discover, test, and select premium AI narrator voices from the complete ElevenLabs directory.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button 
                onClick={stopAudio}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px', background: '#f8fafc', padding: '14px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search voices by name, accent (e.g. British, Swedish), or description tags..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  fontSize: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = '#0284c7'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              
              {/* Gender Segmented Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} /> Gender
                </span>
                <div style={{ display: 'flex', background: '#cbd5e1', padding: '2px', borderRadius: '8px', gap: '2px' }}>
                  {(['all', 'male', 'female'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenderFilter(g)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        background: genderFilter === g ? '#ffffff' : 'transparent',
                        color: genderFilter === g ? '#0f172a' : '#475569',
                        boxShadow: genderFilter === g ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s'
                      }}
                    >
                      {g === 'all' ? 'All Genders' : g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Dropdown Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={12} /> Accent
                </span>
                <select
                  value={accentFilter}
                  onChange={e => setAccentFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                    fontWeight: 500
                  }}
                >
                  <option value="all">All Accents</option>
                  <option value="American">American</option>
                  <option value="British">British</option>
                  <option value="Australian">Australian</option>
                  <option value="Irish">Irish</option>
                  {uniqueAccents.map(acc => (
                    !['american', 'british', 'australian', 'irish'].includes(acc.toLowerCase()) && (
                      <option key={acc} value={acc}>{acc}</option>
                    )
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Voices Scroll Container */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', boxSizing: 'border-box' }} className="sd-voice-explorer-grid">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px' }}>
                <Spinner size={32} color="#0284c7" />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Connecting with ElevenLabs directory...</span>
              </div>
            ) : filteredVoices.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', gap: '10px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                <X size={28} color="#94a3b8" />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>No voices match your search preferences.</span>
                <button
                  onClick={() => { setSearchQuery(''); setGenderFilter('all'); setAccentFilter('all'); }}
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
                {filteredVoices.map(voice => {
                  const isSelected = selectedVoiceId === voice.voice_id;
                  const isPlaying = playingVoiceId === voice.voice_id;
                  
                  return (
                    <div 
                      key={voice.voice_id}
                      style={{
                        padding: '14px',
                        background: '#ffffff',
                        border: isSelected ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                        borderRadius: '16px',
                        boxShadow: isSelected ? '0 10px 15px -3px rgba(2, 132, 199, 0.1)' : 'none',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'left'
                      }}
                      className="sd-voice-card"
                    >
                      <div>
                        {/* Title Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{voice.name}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '8px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: voice.gender === 'male' ? '#e0f2fe' : '#fce7f3',
                              color: voice.gender === 'male' ? '#0369a1' : '#be185d'
                            }}>
                              {voice.gender}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '8px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: '#f1f5f9',
                              color: '#475569'
                            }}>
                              {voice.accent}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', margin: '0 0 14px 0', minHeight: '32px' }}>
                          {voice.description}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        
                        {/* Audio Test button */}
                        <button
                          type="button"
                          onClick={() => playPreview(voice.voice_id, voice.preview_url)}
                          disabled={!voice.preview_url}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            background: isPlaying ? 'rgba(2, 132, 199, 0.1)' : '#ffffff',
                            color: isPlaying ? '#0284c7' : '#475569',
                            cursor: voice.preview_url ? 'pointer' : 'not-allowed',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                          title={voice.preview_url ? "Click to play voice preview" : "No preview available"}
                        >
                          {isPlaying ? (
                            <>
                              <VolumeX size={13} />
                              Stop
                            </>
                          ) : (
                            <>
                              <Volume2 size={13} />
                              Preview
                            </>
                          )}
                        </button>

                        {/* Select button */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectVoice(voice.voice_id, `${voice.name} - ${voice.accent}`);
                            stopAudio();
                          }}
                          style={{
                            flex: 1.2,
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isSelected ? '#10b981' : '#0f172a',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? (
                            <>
                              <Check size={13} />
                              Selected
                            </>
                          ) : (
                            <>
                              <Mic2 size={13} />
                              Use Voice
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
