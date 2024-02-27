import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Audio, Permissions } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios'; // Import axios for API requests

const App = () => {
  const [recording, setRecording] = React.useState(null);
  const [recordings, setRecordings] = React.useState([]);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2/upload'; // AssemblyAI upload endpoint
  const ASSEMBLYAI_API_KEY = '3d9f55ecbf1342b09862ef48e995d7ef'; // Replace with your API key


  useEffect(() => {
    const timer = setInterval(async () => {
      if (recording) {
        await stopRecording();
        await startRecording();
      }
    }, 50000);

    return () => clearInterval(timer);
  }, [recording]);

  const uploadAudioToAssemblyAI = async (apiKey, audioPath) => {
    try {
      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(audioPath);
      if (!fileInfo.exists) {
        throw new Error('File does not exist.');
      }
      console.log(fileInfo)
  
      const baseUrl = 'https://api.assemblyai.com/v2';
      const headers = {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      };
  
      // Read audio file
      const audioData = await FileSystem.readAsStringAsync(audioPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      // Upload audio to AssemblyAI API
      const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, {
        headers,
      });
      const uploadUrl = uploadResponse.data.upload_url;
  
      // Create JSON payload containing audio_url
      const data = {
        audio_url: uploadUrl,
      };
  
      // Make a POST request to the AssemblyAI API endpoint
      const transcriptResponse = await axios.post(`${baseUrl}/transcript`, data, {
        headers,
      });
  
      // Get transcript ID
      const transcriptId = transcriptResponse.data.id;
      const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`;
  
      // Poll the API for transcript status
      while (true) {
        const pollingResponse = await axios.get(pollingEndpoint, { headers });
        const transcriptionResult = pollingResponse.data;
  
        if (transcriptionResult.status === 'completed') {
          console.log('Transcription completed:', transcriptionResult.text);
          break;
        } else if (transcriptionResult.status === 'error') {
          throw new Error(`Transcription failed: ${transcriptionResult.error}`);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  };
  

  async function startRecording() {
    try {
      if (permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording.stopAndUnloadAsync();

    const { sound, status } = await recording.createNewLoadedSoundAsync();
    const updatedRecordings = [...recordings, {
      sound: sound,
      duration: getDurationFormatted(status.durationMillis),
      file: recording.getURI(),
    }];
    setRecordings(updatedRecordings);
    setRecording(null);

    await Audio.setAudioModeAsync(
      {
        allowsRecordingIOS: false,
      }
    );
    const uri = recording.getURI();
    uploadAudioToAssemblyAI('3d9f55ecbf1342b09862ef48e995d7ef','/Users/daniel/Code/EXPO/uploadTest/audio/5_common_sports_injuries.mp3' )
    console.log('Recording stopped and stored at', uri);
  }

  const getDurationFormatted = (millis) => {
    const minutes = millis / 1000 / 60;
    const minutesDisplay = Math.floor(minutes);
    const seconds = Math.round((minutes - minutesDisplay) * 60);
    const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutesDisplay}:${secondsDisplay}`;
  };

  const getRecordingLines = () => {
    return recordings.map((recordingLine, index) => {
      return (
        <View key={index} style={styles.row}>
          <Text style={styles.fill}>Recording {index + 1} - {recordingLine.duration}</Text>
          <Button style={styles.button} onPress={() => recordingLine.sound.replayAsync()} title="Play"></Button>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Button
        title={recording ? 'Stop Recording' : 'Start Recording'}
        onPress={recording ? stopRecording : startRecording} />
      {getRecordingLines()}
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
    margin: 16
  },
  button: {
    margin: 16
  }
});

export default App;

