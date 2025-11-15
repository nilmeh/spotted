import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Animated gradient rotation
  const shimmer = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const handleSubmit = async () => {
    // TODO: replace with real auth; for now treat any input as a session
    await AsyncStorage.setItem('session', 'active');
    router.replace('/swipe');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#000000', '#0a0a0f', '#000000']}
        style={styles.background}
      >
        {/* Floating orbs for depth */}
        <View style={[styles.orb, styles.orb1]}>
          <LinearGradient
            colors={['rgba(100,100,140,0.15)', 'rgba(60,60,100,0.05)']}
            style={styles.orbGradient}
          />
        </View>
        <View style={[styles.orb, styles.orb2]}>
          <LinearGradient
            colors={['rgba(120,120,160,0.12)', 'rgba(70,70,110,0.04)']}
            style={styles.orbGradient}
          />
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Spotted</Text>
          <View style={styles.logoUnderline} />
        </View>

        {/* Glass Card */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardInner}>
              {/* Username */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="username"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['rgba(180,180,220,0.9)', 'rgba(140,140,200,0.8)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitGradient}
                >
                  <Text style={styles.submitText}>sign in</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Links */}
              <View style={styles.linksContainer}>
                <Pressable onPress={() => {}}>
                  <Text style={styles.linkText}>forgot password?</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable onPress={() => {}}>
                  <Text style={styles.linkText}>create account</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -100,
    right: -50,
  },
  orb2: {
    width: 250,
    height: 250,
    bottom: -80,
    left: -60,
  },
  orbGradient: {
    flex: 1,
    borderRadius: 9999,
  },
  logoContainer: {
    marginBottom: 60,
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '200',
    color: '#ffffff',
    letterSpacing: 8,
    marginBottom: 8,
  },
  logoUnderline: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGradient: {
    borderRadius: 32,
  },
  cardInner: {
    padding: 36,
  },
  inputWrapper: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    fontSize: 17,
    color: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 28,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(180,180,220,0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  submitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  linkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
