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

  const uploadToAssemblyAI = async (uri) => {
    // Replace with your actual API key
    const apiKey = '3d9f55ecbf1342b09862ef48e995d7ef';

    try {
      // 1. Set up API endpoint and headers
      const baseUrl = 'https://api.assemblyai.com/v2';
      const headers = {
        authorization: '3d9f55ecbf1342b09862ef48e995d7ef',
      };

      // 2. Prepare the file data (assuming URI points to a local file)
      const response = await fetch(uri);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('audio', blob);

      // 3. Upload the file
      const uploadResponse = await axios.post(`${baseUrl}/upload`, formData, {
        headers,
      });

      const uploadUrl = uploadResponse.data.upload_url;

      console.log(uploadUrl)

      // 4. Prepare payload for transcription request
      const data = {
        audio_url: uploadUrl,
      };

      // 5. Send the transcription request
      const transcriptionResponse = await axios.post(`${baseUrl}/transcript`, data, {
        headers,
      });

      const transcriptId = transcriptionResponse.data.id;

      // 6. Poll for the transcription status (not implemented here)
      console.log(`Transcription started with ID: ${transcriptId}`);

      const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`

      while (true) {
        const pollingResponse = await axios.get(pollingEndpoint, {
          headers: headers
        })
        const transcriptionResult = pollingResponse.data

        if (transcriptionResult.status === 'completed') {
          console.log(transcriptionResult.text)
          break
        } else if (transcriptionResult.status === 'error') {
          throw new Error(`Transcription failed: ${transcriptionResult.error}`)
        } else {
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      }

      // Access the finished transcription through the transcriptionResult variable

    } catch (error) {
      console.error('Error uploading file:', error);
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
    uploadToAssemblyAI(uri)
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

