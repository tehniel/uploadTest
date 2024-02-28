import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Audio, Permissions } from 'expo-av';
import Axios from 'axios'; // Import axios for API requests

const App = () => {
  const [recording, setRecording] = React.useState(null);
  const [recordings, setRecordings] = React.useState([]);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  useEffect(() => {
    const timer = setInterval(async () => {
      if (recording) {
        await stopRecording();
        await startRecording();
      }
    }, 50000);

    return () => clearInterval(timer);
  }, [recording]);

  async function uploadFileToAssemblyAI(uri) {
    // Replace with your actual AssemblyAI API key
    const apiKey = '3d9f55ecbf1342b09862ef48e995d7ef';
  
    const baseUrl = 'https://api.assemblyai.com/v2';

    //Our Upload Endpoint expects binary format
    const binaryFileData = await fetch(uri);
    const fileData = await binaryFileData.arrayBuffer();    
  
    // 3. Upload the file data
    const headers = { authorization: `Bearer ${apiKey}`};
    
    const uploadResponse = await Axios.post(`${baseUrl}/upload`, fileData, {
      headers: {
        ...headers,
      },
    });
  
    const uploadUrl = uploadResponse.data.upload_url;

    // 4. Create the payload for transcription request
    const data = { audio_url: uploadUrl };
  
    // 5. Send the request for transcription
    const response = await Axios.post(`${baseUrl}/transcript`, data, { headers });
  
    const transcriptId = response.data.id;
    console.log(transcriptId)
    const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`;
    console.log(pollingEndpoint)
  
    // 6. Poll for transcription status
    while (true) {
      const pollingResponse = await Axios.get(pollingEndpoint, { headers });
      const transcriptionResult = pollingResponse.data;
  
      if (transcriptionResult.status === 'completed') {
        console.log(transcriptionResult.text)
        return transcriptionResult.text; // Return the transcription
      } else if (transcriptionResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds before polling again
      }
    }
  }


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
    uploadFileToAssemblyAI(uri)
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