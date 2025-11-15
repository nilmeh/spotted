import { StyleSheet, Text, View, TouchableOpacity, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image source={require('../assets/Liquid_Metal.png')} style={styles.image} />
      </View>
      <Image source={require('../assets/Spotted.png')} style={styles.Titleimage} />
      <Text style={styles.subtitle}>Welcome {username}</Text>
      {/* <Text style={styles.subtitle}>Discover events around you</Text> */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor="#878787"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#878787"
        />
      </View>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/swipe')}
      >
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
      <Text style={styles.Bottomtext}>Forgot your password?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  Titleimage: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  Bottomtext: {
    fontSize: 16,
    color: '#3B75FF',
    marginTop: 20,
    textDecorationLine: 'underline',
  },
  subtitle: {
    fontSize: 18,
    color: '#414141',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#414141',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  input: {
    width: '70%',
    height: 48,
    borderColor: '#414141',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
});
