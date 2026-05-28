import { NextResponse } from 'next/server';

const FALLBACK_VOICES = [
  // Curated Premade Male Voices
  {
    voice_id: "pNInz6obpgq5pOtz5g1L",
    name: "Adam",
    gender: "male",
    accent: "American",
    description: "Deep, crisp narrator voice - ideal for medical documentaries",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/pNInz6obpgq5pOtz5g1L"
  },
  {
    voice_id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    gender: "male",
    accent: "American",
    description: "Well-rounded, warm, professional voice - great for commercials",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/ErXwobaYiN019PkySvjV"
  },
  {
    voice_id: "VR6A4UBq45PFod5iaaTO",
    name: "Arnold",
    gender: "male",
    accent: "American",
    description: "High-energy, direct, standard voice - perfect for calls to action",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/VR6A4UBq45PFod5iaaTO"
  },
  {
    voice_id: "pqHbhCDk9n75pqOxCd1L",
    name: "Bill",
    gender: "male",
    accent: "American",
    description: "Mature, trustworthy, narrator voice - excellent for brand trust",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/pqHbhCDk9n75pqOxCd1L"
  },
  {
    voice_id: "N2lVSClvYuuCQMC9bCoY",
    name: "Callum",
    gender: "male",
    accent: "Transatlantic",
    description: "Intense, professional, high-energy narrator",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/N2lVSClvYuuCQMC9bCoY"
  },
  {
    voice_id: "KLoLpdGWK7agg0O2TJYg",
    name: "Charlie",
    gender: "male",
    accent: "American",
    description: "Conversational, casual, friendly voice - natural for clinic vlogs",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/KLoLpdGWK7agg0O2TJYg"
  },
  {
    voice_id: "2EiwWnXF2V4jIw15m7cP",
    name: "Clyde",
    gender: "male",
    accent: "American",
    description: "Warm, mature video games / story teller voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/2EiwWnXF2V4jIw15m7cP"
  },
  {
    voice_id: "CYw3kZ02Hs0563Kh82dB",
    name: "Dave",
    gender: "male",
    accent: "American",
    description: "Conversational, easy-going, friendly standard voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/CYw3kZ02Hs0563Kh82dB"
  },
  {
    voice_id: "AZnzlk1XvdvUeBnXmlld",
    name: "Dom",
    gender: "male",
    accent: "American",
    description: "Strong, professional, energetic presentation voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/AZnzlk1XvdvUeBnXmlld"
  },
  {
    voice_id: "29vD33N1CtxCmqQRPOHJ",
    name: "Drew",
    gender: "male",
    accent: "American",
    description: "Clear newsroom anchor, professional reporter voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/29vD33N1CtxCmqQRPOHJ"
  },
  {
    voice_id: "g5CIjVvJuF7u8xp939cD",
    name: "Ethan",
    gender: "male",
    accent: "American",
    description: "ASMR style, calm, soft-spoken narrative voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/g5CIjVvJuF7u8xp939cD"
  },
  {
    voice_id: "D38z5MxObpgq5pOtz5g1",
    name: "Fin",
    gender: "male",
    accent: "Irish",
    description: "Friendly, casual Irish-accented conversational voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/D38z5MxObpgq5pOtz5g1"
  },
  {
    voice_id: "SOYhlZCu2Oi2472dACmy",
    name: "Harry",
    gender: "male",
    accent: "British",
    description: "Warm, educational British narrator - outstanding for explanations",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/SOYhlZCu2Oi2472dACmy"
  },
  {
    voice_id: "ZQe5fuihuZwmJPuvZ65E",
    name: "James",
    gender: "male",
    accent: "Australian",
    description: "Relaxed Australian conversational accent - warm and friendly",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/ZQe5fuihuZwmJPuvZ65E"
  },
  {
    voice_id: "bVeezUXIpNL528O5m7cP",
    name: "Jeremy",
    gender: "male",
    accent: "American",
    description: "Young, casual, standard voice - perfect for youthful reviews",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/bVeezUXIpNL528O5m7cP"
  },
  {
    voice_id: "eqz5FuihuZwmJPuvZ65E",
    name: "Jess",
    gender: "male",
    accent: "American",
    description: "Corporate presentation voice - clear, structured, formal",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/eqz5FuihuZwmJPuvZ65E"
  },
  {
    voice_id: "TxGEqn7nU6kb4bCoY91L",
    name: "Josh",
    gender: "male",
    accent: "American",
    description: "Deep, warm, conversational - excellent for storytelling",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/TxGEqn7nU6kb4bCoY91L"
  },
  {
    voice_id: "TX32905Hs0wFY7oJmaGN",
    name: "Liam",
    gender: "male",
    accent: "American",
    description: "Friendly, casual, next-door narrator style",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/TX32905Hs0wFY7oJmaGN"
  },
  {
    voice_id: "flq6fuihuZwmJPuvZ65E",
    name: "Michael",
    gender: "male",
    accent: "American",
    description: "Professional, mature audiobook narrator - warm and clean",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/flq6fuihuZwmJPuvZ65E"
  },
  {
    voice_id: "50OhlZCu2Oi2472dACmy",
    name: "Paul",
    gender: "male",
    accent: "American",
    description: "Deep news reporter, smooth standard narration",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/50OhlZCu2Oi2472dACmy"
  },
  {
    voice_id: "XS5hlZCu2Oi2472dACmy",
    name: "Thomas",
    gender: "male",
    accent: "French",
    description: "French-accented European narrator voice - unique and stylized",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/XS5hlZCu2Oi2472dACmy"
  },

  // Curated Premade Female Voices
  {
    voice_id: "Xb7hH1LZJIfL3HHvffqe",
    name: "Alice",
    gender: "female",
    accent: "British",
    description: "Confident, crisp, professional British female narrator",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/Xb7hH1LZJIfL3HHvffqe"
  },
  {
    voice_id: "wrxvN1LZJIfL3HHvffqe",
    name: "Bella",
    gender: "female",
    accent: "American",
    description: "Warm, friendly narrator - highly engaging for clinic intros",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/wrxvN1LZJIfL3HHvffqe"
  },
  {
    voice_id: "XB0fDUncoYZZp8Rt8Rt8",
    name: "Charlotte",
    gender: "female",
    accent: "British",
    description: "Sweet, soft storybook British female narrator",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/XB0fDUncoYZZp8Rt8Rt8"
  },
  {
    voice_id: "ThT50A1LZJIfL3HHvffq",
    name: "Dorothy",
    gender: "female",
    accent: "British",
    description: "Mature British storyteller - authoritative yet warm",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/ThT50A1LZJIfL3HHvffq"
  },
  {
    voice_id: "MF3mGyEYCl7XYWbCoY91",
    name: "Ellie",
    gender: "female",
    accent: "American",
    description: "Bright, energetic, young standard female voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/MF3mGyEYCl7XYWbCoY91"
  },
  {
    voice_id: "odyUrTN5HMVKujvVAgWW",
    name: "Emily",
    gender: "female",
    accent: "American",
    description: "Casual, warm, conversational - excellent for social vlogs",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/odyUrTN5HMVKujvVAgWW"
  },
  {
    voice_id: "jsCqZtJt4T197c6dACmy",
    name: "Freya",
    gender: "female",
    accent: "American",
    description: "Excited, energetic commercial voice - high engagement",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/jsCqZtJt4T197c6dACmy"
  },
  {
    voice_id: "jB5yZtJt4T197c6dACmy",
    name: "Gigi",
    gender: "female",
    accent: "American",
    description: "Playful, young, child-like female voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/jB5yZtJt4T197c6dACmy"
  },
  {
    voice_id: "oWAhhZCu2Oi2472dACmy",
    name: "Grace",
    gender: "female",
    accent: "American",
    description: "Professional corporate narrator - articulate and clean",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/oWAhhZCu2Oi2472dACmy"
  },
  {
    voice_id: "ZF32905Hs0wFY7oJmaGN",
    name: "Lily",
    gender: "female",
    accent: "American",
    description: "Soft, warm, friendly standard voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/ZF32905Hs0wFY7oJmaGN"
  },
  {
    voice_id: "KClAuq9Hs0wFY7oJmaGN",
    name: "Maayan",
    gender: "female",
    accent: "American",
    description: "Conversational, highly engaging standard female voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/KClAuq9Hs0wFY7oJmaGN"
  },
  {
    voice_id: "XrExMAJxa2e7A53Ve1Zk",
    name: "Matilda",
    gender: "female",
    accent: "American",
    description: "Smooth, warm, conversational storyteller style",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/XrExMAJxa2e7A53Ve1Zk"
  },
  {
    voice_id: "piTKgcLEGmPEe242Cchg",
    name: "Nicole",
    gender: "female",
    accent: "American",
    description: "Calm, slow-paced standard narrator - ideal for breathing tutorials",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/piTKgcLEGmPEe242Cchg"
  },
  {
    voice_id: "aD6riP1btT197c6dACmy",
    name: "Rachel",
    gender: "female",
    accent: "American",
    description: "Excited, commercial, highly engaging - standard clinic vlogger style",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/aD6riP1btT197c6dACmy"
  },
  {
    voice_id: "pMs21m00Tcm4T197c6d",
    name: "Serena",
    gender: "female",
    accent: "American",
    description: "Articulate, clean corporate female presentation voice",
    preview_url: "https://api.elevenlabs.io/v1/voices/premade/preview/pMs21m00Tcm4T197c6d"
  }
];

export async function GET() {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  
  if (!apiKey) {
    console.log("[ElevenLabs API Proxy] Key missing in env. Returning fallback curated catalog.");
    return NextResponse.json({ voices: FALLBACK_VOICES });
  }

  try {
    console.log("[ElevenLabs API Proxy] Fetching live voice list from ElevenLabs API...");
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey
      },
      next: { revalidate: 60 } // Cache voice lists for 1 minute
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Format the live voice payload to match our UI expectations
    const formattedVoices = data.voices.map((v: any) => {
      // Map gender/accent from ElevenLabs standard attributes/labels
      const gender = (v.labels?.gender || v.labels?.Gender || "").toLowerCase() === "female" ? "female" : "male";
      
      const accent = v.labels?.accent || v.labels?.Accent || v.labels?.language || "Global";
      
      const description = v.description || v.labels?.description || `${accent} ${gender} voice`;
      
      return {
        voice_id: v.voice_id,
        name: v.name,
        gender,
        accent,
        description,
        preview_url: v.preview_url || ""
      };
    });

    return NextResponse.json({ voices: formattedVoices });
  } catch (error: any) {
    console.error("[ElevenLabs API Proxy] Failed to fetch live voices. Using fallback database.", error.message);
    return NextResponse.json({ voices: FALLBACK_VOICES });
  }
}
