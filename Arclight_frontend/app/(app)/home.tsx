import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import Loader from "../../components/Loader";
import { Plus, Folder } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
  
interface ActionButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, onClick }) => {
  const { isDark } = useTheme();
  
  return (
    <TouchableOpacity onPress={onClick} style={[styles.button, { backgroundColor: isDark ? '#E8E5D8' : '#3A3A3A' }]}>
      <View style={styles.buttonInner}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={[styles.buttonText, { color: isDark ? '#1A1A1A' : '#FFFFFF' }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const Home: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const { colors, isDark } = useTheme();

  // ===================== UPLOAD IMAGE AND CREATE PROJECT =====================
  const handleImageSelected = async (uri: string, source: 'gallery' | 'camera') => {
    try {
      setUploading(true);
      
      // Step 1: Upload image to backend
      console.log(`Uploading image from ${source}...`);
      const uploadResult = await ApiService.uploadImage(uri);
      
      if (!uploadResult.response.ok || !uploadResult.data.success) {
        throw new Error(uploadResult.data.message || 'Failed to upload image');
      }

      const { publicId, imageUrl } = uploadResult.data.data;
      console.log('Image uploaded successfully. PublicId:', publicId);
      console.log('Cloudinary imageUrl:', imageUrl);

      // Step 2: Create project with the uploaded image
      console.log('Creating project...');
      const projectResult = await ApiService.createProject(publicId);
      
      if (!projectResult.response.ok || !projectResult.data.success) {
        throw new Error(projectResult.data.message || 'Failed to create project');
      }

      const projectId = projectResult.data.data.projectId;
      console.log('Project created successfully. ProjectId:', projectId);

      // Store project ID and Cloudinary image URL for workspace
      // Use Cloudinary URL (imageUrl) instead of local URI for filter support
      const cloudinaryImageUrl = imageUrl || uri;
      await AsyncStorage.setItem('selected_image_uri', cloudinaryImageUrl);
      await AsyncStorage.setItem('current_project_id', projectId);
      await AsyncStorage.setItem('current_public_id', publicId);

      // Navigate to workspace
      router.push('/(app)/workspace');
    } catch (error: any) {
      console.error('Error uploading image or creating project:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUploading(false);
    }
  };

  // ===================== GALLERY =====================
  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission Denied", "Gallery access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      console.log("Selected from Gallery:", uri);
      await handleImageSelected(uri, 'gallery');
    }
  };

  // ===================== CAMERA =====================
  // const openCamera = async () => {
  //   const permission = await ImagePicker.requestCameraPermissionsAsync();

  //   if (!permission.granted) {
  //     Alert.alert("Permission Denied", "Camera access is required.");
  //     return;
  //   }

  //   const result = await ImagePicker.launchCameraAsync({
  //     allowsEditing: false,
  //     quality: 1,
  //   });

  //   if (!result.canceled) {
  //     const uri = result.assets[0].uri;
  //     console.log("Captured from Camera:", uri);
  //     await handleImageSelected(uri, 'camera');
  //   }
  // };

  // ===================== BUTTONS =====================
  const actionButtons = [
    {
      icon: <Plus size={48} strokeWidth={2.5} color={isDark ? '#1A1A1A' : '#FFFFFF'} />,
      title: "NEW\nPROJECT",
      onClick: openGallery,
    },
    // {
    //   icon: <Camera size={48} strokeWidth={2.5} color={colors.text.cream} />,
    //   title: "TAKE\nPHOTO",
    //   onClick: openCamera,
    // },
    {
      icon: <Folder size={48} strokeWidth={2.5} color={isDark ? '#1A1A1A' : '#FFFFFF'} />,
      title: "PROJECT\nGALLERY",
      onClick: () => router.push("/(app)/projects"),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#1A1A1A' : '#E8E5D8' }]}>
      <Navbar screenName="HOME" />

      {uploading && (
        <View style={[styles.uploadingOverlay, { backgroundColor: colors.background.overlayLight }]}>
          <Loader size={120} />
          <Text style={[styles.uploadingText, { color: colors.text.dark }]}>Uploading image...</Text>
        </View>
      )}

      <View style={styles.mainContainer}>
        {actionButtons.map((button, index) => (
          <ActionButton
            key={index}
            icon={button.icon}
            title={button.title}
            onClick={button.onClick}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  mainContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },

  button: {
    width: 280,
    height: 149,
    borderRadius: 28,
    justifyContent: "center",
    paddingLeft: 37,
    marginBottom: 40,
  },

  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  buttonText: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "geistmono",
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "geistmono",
  },
});

