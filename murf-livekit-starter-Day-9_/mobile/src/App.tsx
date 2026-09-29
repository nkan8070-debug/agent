import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import {
  AudioSession,
  LiveKitRoom,
  useVoiceAssistant,
} from '@livekit/react-native';

const TOKEN_ENDPOINT =
  process.env.EXPO_PUBLIC_TOKEN_ENDPOINT ||
  'https://murf-livekit-starter-git-day-9-test11-6ded.vercel.app/api/token';

const AGENT_NAME = process.env.EXPO_PUBLIC_AGENT_NAME || 'my-agent';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Android me SafeAreaView status bar ka padding nahi deta, isliye manually
const TOP_INSET =
  Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0;

/* =========================================================
   THEME
========================================================= */

const WAVE_COLOR = '#8B5CF6';
const WAVE_COLOR_LIGHT = '#A78BFA';
const GLOW_SPEAKING = '#4ADE80';
const GLOW_IDLE = '#A78BFA';
const WAVE_LINE_WIDTH = 3;

/* =========================================================
   WAVE (reusable: home screen + session screen)
========================================================= */

const POINTS = 120;

function buildWavePath(
  width: number,
  height: number,
  phase: number,
  amplitude: number,
  cycles: number,
  sigma: number
) {
  let d = '';
  for (let i = 0; i <= POINTS; i++) {
    const t = i / POINTS;
    const x = t * width;
    const envelope = Math.exp(-Math.pow((t - 0.5) / sigma, 2));
    const y =
      height / 2 +
      amplitude * envelope * Math.sin(t * cycles * Math.PI * 2 + phase);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  return d;
}

function targetsForMode(mode: string) {
  switch (mode) {
    case 'speaking':
      return { amp: 78, speed: 6, glow: 1.25 };
    case 'listening':
      return { amp: 26, speed: 3, glow: 1 };
    case 'demo': // home screen
      return { amp: 40, speed: 2.5, glow: 1 };
    case 'thinking':
      return { amp: 12, speed: 2, glow: 1 };
    default:
      return { amp: 8, speed: 1.5, glow: 1 };
  }
}

function WaveView({
  mode,
  width,
  height,
}: {
  mode: string;
  width: number;
  height: number;
}) {
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const phaseRef = useRef(0);
  const ampRef = useRef(8);
  const glowRef = useRef(1);
  const [, setTick] = useState(0);

  const scale = height / 240;

  useEffect(() => {
    let frame: number;
    let last = Date.now();
    let lastRender = 0;

    const loop = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;

      const target = targetsForMode(modeRef.current);
      ampRef.current += (target.amp - ampRef.current) * 0.08;
      glowRef.current += (target.glow - glowRef.current) * 0.08;
      phaseRef.current += dt * target.speed;

      // ~30fps re-render (smooth + halka)
      if (now - lastRender > 33) {
        lastRender = now;
        setTick((t) => (t + 1) % 1000000);
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const phase = phaseRef.current;
  const breathe = 0.85 + 0.15 * Math.sin(phase * 0.6);
  const amp = ampRef.current * breathe * scale;

  const mainPath = buildWavePath(width, height, phase, amp, 7, 0.2);
  const ghostPath = buildWavePath(
    width,
    height,
    phase * 0.8 + 1.5,
    amp * 0.6,
    6,
    0.22
  );

  const glowColor = mode === 'speaking' ? GLOW_SPEAKING : GLOW_IDLE;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={glowColor} stopOpacity="0.45" />
            <Stop offset="60%" stopColor={glowColor} stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>

          <LinearGradient id="line" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={WAVE_COLOR} stopOpacity="0" />
            <Stop offset="0.25" stopColor={WAVE_COLOR} stopOpacity="0.7" />
            <Stop offset="0.5" stopColor={WAVE_COLOR_LIGHT} stopOpacity="1" />
            <Stop offset="0.75" stopColor={WAVE_COLOR} stopOpacity="0.7" />
            <Stop offset="1" stopColor={WAVE_COLOR} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Circle
          cx={width / 2}
          cy={height / 2}
          r={95 * scale * glowRef.current}
          fill="url(#glow)"
        />

        <Path
          d={ghostPath}
          stroke="url(#line)"
          strokeWidth={2}
          strokeOpacity={0.35}
          fill="none"
          strokeLinecap="round"
        />

        <Path
          d={mainPath}
          stroke="url(#line)"
          strokeWidth={WAVE_LINE_WIDTH * 3}
          strokeOpacity={0.25}
          fill="none"
          strokeLinecap="round"
        />

        <Path
          d={mainPath}
          stroke="url(#line)"
          strokeWidth={WAVE_LINE_WIDTH + 1}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// Session wave: LiveKit agent state se chalti hai
function VoiceWave() {
  const { state } = useVoiceAssistant();
  return <WaveView mode={state} width={SCREEN_WIDTH} height={240} />;
}

/* =========================================================
   HOME BACKGROUND (soft purple glows)
========================================================= */

function HomeBackground() {
  return (
    <Svg
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="bgTop" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bgBottom" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Circle
        cx={SCREEN_WIDTH * 0.5}
        cy={SCREEN_HEIGHT * 0.28}
        r={SCREEN_WIDTH * 0.9}
        fill="url(#bgTop)"
      />
      <Circle
        cx={SCREEN_WIDTH * 0.5}
        cy={SCREEN_HEIGHT * 0.95}
        r={SCREEN_WIDTH * 0.85}
        fill="url(#bgBottom)"
      />
    </Svg>
  );
}

/* =========================================================
   STATUS TEXT
========================================================= */

function StatusPill() {
  const { state } = useVoiceAssistant();

  let text = '';
  if (state === 'connecting' || state === 'initializing') {
    text = '✨ Agent is joining... Please wait!';
  } else if (state === 'speaking') {
    text = '🔊 Agent is speaking... Listen carefully!';
  } else if (state === 'listening') {
    text = '👂 I am listening... Speak now!';
  } else if (state === 'thinking') {
    text = '🧠 Thinking...';
  }

  if (!text) return null;

  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

/* =========================================================
   END CALL BUTTON
========================================================= */

function EndCallButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.35)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }),
      Animated.timing(glow, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 0.35,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.endCallContainer}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.endCallGlow,
          { opacity: glow, transform: [{ scale }] },
        ]}
      />

      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.endCallButton}
        >
          <Svg width={30} height={30} viewBox="0 0 24 24">
            <Path
              fill="#ffffff"
              d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"
            />
          </Svg>
        </Pressable>
      </Animated.View>

      <Text style={styles.endCallText}>End Call</Text>
    </View>
  );
}

/* =========================================================
   FIRE MENU
========================================================= */

const SUB_ITEMS = [
  { emoji: '🔥', x: -72, y: 4 },
  { emoji: '⭐', x: -52, y: 64 },
  { emoji: '💡', x: -6, y: 80 },
];

function FireMenu({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const toggleMenu = () => {
    const next = !open;
    setOpen(next);

    Animated.spring(progress, {
      toValue: next ? 1 : 0,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  return (
    <View style={styles.fireContainer}>
      {SUB_ITEMS.map((item) => (
        <Animated.View
          key={item.emoji}
          pointerEvents={open ? 'auto' : 'none'}
          style={[
            styles.subWrapper,
            {
              opacity: progress,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, item.x],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, item.y],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable
            onPress={() => {
              onSelect(item.emoji);
              toggleMenu();
            }}
            style={styles.emojiOption}
          >
            <Text style={styles.emojiText}>{item.emoji}</Text>
          </Pressable>
        </Animated.View>
      ))}

      <Animated.View
        style={[styles.mainFireWrapper, { transform: [{ scale: pulseScale }] }]}
      >
        <Pressable onPress={toggleMenu} style={styles.fireButton}>
          <Text style={styles.fireIcon}>🔥</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* =========================================================
   HOME SCREEN
========================================================= */

const FEATURES = [
  { icon: '🎙️', label: 'Talk naturally' },
  { icon: '🧠', label: 'Learn anything' },
  { icon: '⚡', label: 'Instant answers' },
];

function HomeScreen({
  connecting,
  error,
  onStart,
}: {
  connecting: boolean;
  error: string | null;
  onStart: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  return (
    <View style={styles.homeScreen}>
      <HomeBackground />

      <Animated.View
        style={[
          styles.homeInner,
          { opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>AI VOICE TUTOR</Text>
          </View>

          <View style={styles.homeWave}>
            <WaveView mode="demo" width={SCREEN_WIDTH} height={150} />
          </View>

          <Text style={styles.homeTitle}>Neo</Text>
          <Text style={styles.homeSubtitle}>Your voice learning assistant</Text>

          <View style={styles.featureRow}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureChip}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* BOTTOM */}
        <View style={styles.homeBottom}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Could not connect</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={connecting}
            onPress={onStart}
            style={({ pressed }) => [
              styles.connectButton,
              pressed && styles.connectButtonPressed,
              connecting && styles.connectButtonDisabled,
            ]}
          >
            {connecting ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.connectButtonText}>Connecting...</Text>
              </>
            ) : (
              <>
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path
                    fill="#ffffff"
                    d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
                  />
                </Svg>
                <Text style={styles.connectButtonText}>Start Learning</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.homeHint}>
            Microphone access is needed to talk with Neo
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [details, setDetails] = useState<ConnectionDetails | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inSession, setInSession] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  /* AUDIO SETUP */

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await AudioSession.startAudioSession();

        const outputs = await AudioSession.getAudioOutputs();
        console.log('Available audio outputs:', outputs);

        if (outputs.includes('speaker')) {
          await AudioSession.selectAudioOutput('speaker');
          console.log('Audio output selected: speaker');
        } else {
          console.log('Speaker output not available');
        }
      } catch (err) {
        console.warn('Audio setup failed:', err);
      }
    };

    void setupAudio();

    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  /* START LEARNING */

  const startLearning = async () => {
    if (connecting) return;

    try {
      setConnecting(true);
      setError(null);

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_config: {
            agents: [{ agentName: AGENT_NAME }],
          },
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Token server returned ${response.status}`
        );
      }

      const data = (await response.json()) as ConnectionDetails;

      console.log('Room name:', data.roomName);
      console.log('Server URL:', data.serverUrl);

      setDetails(data);
      setSelectedEmoji(null);
      setInSession(true);
    } catch (err) {
      console.error('Start learning error:', err);
      setError(err instanceof Error ? err.message : 'Unable to start Neo.');
      setDetails(null);
      setInSession(false);
    } finally {
      setConnecting(false);
    }
  };

  /* END SESSION */

  const endSession = () => {
    setInSession(false);
    setDetails(null);
    setSelectedEmoji(null);
  };

  /* HOME */

  if (!inSession || !details) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <HomeScreen
          connecting={connecting}
          error={error}
          onStart={startLearning}
        />
      </SafeAreaView>
    );
  }

  /* SESSION */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <LiveKitRoom
        serverUrl={details.serverUrl}
        token={details.participantToken}
        connect={true}
        audio={true}
        video={false}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        onConnected={() => {
          console.log('LiveKit connected');
        }}
        onDisconnected={() => {
          console.log('LiveKit disconnected');
          setInSession(false);
          setDetails(null);
        }}
        onError={(roomError) => {
          console.error('LiveKit error:', roomError);
        }}
      >
        <View style={styles.sessionScreen}>
          <View style={styles.topRight}>
            <FireMenu
              onSelect={(emoji) => {
                setSelectedEmoji(emoji);
                console.log('Selected emoji:', emoji);
              }}
            />
          </View>

          <View style={styles.centerWave}>
            <VoiceWave />
          </View>

          {selectedEmoji ? (
            <View pointerEvents="none" style={styles.selectedEmoji}>
              <Text style={styles.selectedEmojiText}>{selectedEmoji}</Text>
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.statusArea}>
            <StatusPill />
          </View>

          <View style={styles.bottomArea}>
            <EndCallButton onPress={endSession} />
          </View>
        </View>
      </LiveKitRoom>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },

  /* HOME */

  homeScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  homeInner: {
    flex: 1,
    paddingTop: TOP_INSET,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
    backgroundColor: 'rgba(124,58,237,0.14)',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  badgeText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  homeWave: {
    marginTop: 18,
    marginBottom: 6,
    marginHorizontal: -24, // wave poori width le
  },
  homeTitle: {
    color: '#ffffff',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(139,92,246,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  homeSubtitle: {
    color: '#a1a1aa',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 26,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    fontSize: 14,
  },
  featureText: {
    color: '#e4e4e7',
    fontSize: 12.5,
    fontWeight: '600',
  },
  homeBottom: {
    paddingBottom: 36,
    alignItems: 'center',
  },
  connectButton: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 18,
    elevation: 12,
  },
  connectButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  homeHint: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#2a1215',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#fca5a5',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 12,
    lineHeight: 18,
  },

  /* SESSION */

  sessionScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },

  /* FIRE MENU */

  topRight: {
    position: 'absolute',
    top: 16 + TOP_INSET,
    right: 18,
    zIndex: 100,
  },
  fireContainer: {
    width: 200,
    height: 160,
  },
  mainFireWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  subWrapper: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  fireButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#292929',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff7a00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fireIcon: {
    fontSize: 27,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#292929',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  emojiText: {
    fontSize: 21,
  },

  /* WAVE */

  centerWave: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* STATUS */

  statusArea: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusPill: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
    maxWidth: '90%',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* SELECTED EMOJI */

  selectedEmoji: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
  },
  selectedEmojiText: {
    fontSize: 34,
  },

  /* END CALL */

  bottomArea: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallGlow: {
    position: 'absolute',
    top: -6,
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 15,
  },
  endCallButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 10,
  },
  endCallText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 9,
    opacity: 0.8,
  },
});
