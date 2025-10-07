import { Picker } from "@react-native-picker/picker";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/Supabase";

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
}

interface SubSubcategory {
  id: number;
  subcategory_id: number;
  name: string;
  description: string | null;
}

export default function AddProduct() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [listingType, setListingType] = useState<"sell" | "rent" | "exchange">("sell");
  const [locationAddress, setLocationAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  
  const [category_id, setCategoryId] = useState<number | null>(null);
  const [subcategory_id, setSubcategoryId] = useState<number | null>(null);
  const [sub_subcategory_id, setSubSubcategoryId] = useState<number | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (category_id) {
      fetchSubcategories(category_id);
    } else {
      setSubcategories([]);
      setSubcategoryId(null);
      setSubSubcategories([]);
      setSubSubcategoryId(null);
    }
  }, [category_id]);

  // Fetch sub-subcategories when subcategory changes
  useEffect(() => {
    if (subcategory_id) {
      fetchSubSubcategories(subcategory_id);
    } else {
      setSubSubcategories([]);
      setSubSubcategoryId(null);
    }
  }, [subcategory_id]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, description")
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }

      if (data && data.length > 0) {
        setCategories(data);
        setCategoryId(data[0].id);
      } else {
        setCategories([]);
      }
    } catch (error: any) {
      console.error("Error in fetchCategories:", error);
      Alert.alert("Erreur", "Impossible de charger les catégories: " + error.message);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubcategories = async (categoryId: number) => {
    try {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, category_id, name, description")
        .eq("category_id", categoryId)
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        setSubcategories(data);
        setSubcategoryId(data[0].id);
      } else {
        setSubcategories([]);
        setSubcategoryId(null);
      }
    } catch (error: any) {
      console.error("Error fetching subcategories:", error);
      Alert.alert("Erreur", "Impossible de charger les sous-catégories");
    }
  };

  const fetchSubSubcategories = async (subcategoryId: number) => {
    try {
      const { data, error } = await supabase
        .from("sub_subcategories")
        .select("id, subcategory_id, name, description")
        .eq("subcategory_id", subcategoryId)
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        setSubSubcategories(data);
        setSubSubcategoryId(data[0].id);
      } else {
        setSubSubcategories([]);
        setSubSubcategoryId(null);
      }
    } catch (error: any) {
      console.error("Error fetching sub-subcategories:", error);
      Alert.alert("Erreur", "Impossible de charger les sous-sous-catégories");
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission requise",
          "Nous avons besoin d'accéder à vos photos pour télécharger une image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3, // Very low quality for maximum compression
        allowsMultipleSelection: false,
        // Compress image dimensions
        exif: false, // Don't include EXIF data
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log("Image selected:", {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });

        // Check file size if available
        if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
          Alert.alert(
            "Image trop grande",
            "L'image est trop grande. Veuillez choisir une image plus petite ou prendre une nouvelle photo avec une qualité réduite."
          );
          return;
        }

        setImage(asset.uri);
      }
    } catch (error: any) {
      console.error("Error picking image:", error);
      Alert.alert("Erreur", "Impossible de sélectionner l'image");
    }
  };

  // Upload image to Supabase Storage
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      console.log("Starting image upload...");
      console.log("Image URI:", uri);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      console.log("Base64 length:", base64.length);

      // Check if base64 is too large (>5MB encoded ~= 6.7MB file)
      if (base64.length > 7000000) {
        throw new Error("L'image est trop grande. Veuillez choisir une image plus petite.");
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      console.log("Decoding base64 to ArrayBuffer...");
      const arrayBuffer = decode(base64);
      
      console.log("ArrayBuffer size:", arrayBuffer.byteLength);
      console.log("Uploading to storage:", fileName);

      // Upload with timeout
      const uploadPromise = supabase.storage
        .from("product-images")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      // Add 30 second timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Upload timeout - connexion trop lente")), 30000)
      );

      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (error) {
        console.error("Storage upload error:", error);
        throw error;
      }

      console.log("Upload successful, getting public URL...");

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      console.log("Image uploaded successfully:", publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Upload error details:", err);
      
      let errorMessage = "Échec du téléchargement de l'image";
      
      if (err.message.includes("timeout")) {
        errorMessage = "Timeout: Connexion trop lente. Vérifiez votre connexion internet.";
      } else if (err.message.includes("trop grande")) {
        errorMessage = err.message;
      } else if (err.message.includes("NetworkError") || err.message.includes("network")) {
        errorMessage = "Erreur réseau. Vérifiez votre connexion internet.";
      } else if (err.statusCode === "413") {
        errorMessage = "L'image est trop grande.";
      } else if (err.message) {
        errorMessage += ": " + err.message;
      }
      
      Alert.alert("Erreur d'upload", errorMessage);
      return null;
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (uploading) {
      return;
    }

    try {
      console.log("=== Starting form submission ===");
      setUploading(true);
      
      // Validation
      if (!name.trim()) {
        Alert.alert("Erreur", "Veuillez entrer le nom du produit");
        setUploading(false);
        return;
      }
      
      const priceValue = parseFloat(price);
      if (!price || isNaN(priceValue) || priceValue <= 0) {
        Alert.alert("Erreur", "Veuillez entrer un prix valide");
        setUploading(false);
        return;
      }
      
      if (!category_id) {
        Alert.alert("Erreur", "Veuillez sélectionner une catégorie");
        setUploading(false);
        return;
      }

      console.log("Form data:", { 
        name, 
        price: priceValue, 
        category_id, 
        subcategory_id,
        sub_subcategory_id,
        listingType,
        hasImage: !!image 
      });

      let imageUrl = null;

      // Upload image if exists
      if (image) {
        console.log("Uploading image...");
        try {
          imageUrl = await uploadImage(image);
        } catch (uploadError: any) {
          console.error("Image upload failed:", uploadError);
          setUploading(false);
          
          Alert.alert(
            "Erreur d'image",
            "Le téléchargement de l'image a échoué. Voulez-vous continuer sans image?",
            [
              { text: "Annuler", style: "cancel", onPress: () => setUploading(false) },
              { 
                text: "Continuer", 
                onPress: async () => {
                  setUploading(true);
                  await insertProduct(null);
                }
              }
            ]
          );
          return;
        }
        
        // If image upload returned null (failed but handled), ask user
        if (!imageUrl) {
          setUploading(false);
          Alert.alert(
            "Erreur d'image",
            "Le téléchargement de l'image a échoué. Voulez-vous continuer sans image?",
            [
              { text: "Annuler", style: "cancel" },
              { 
                text: "Continuer", 
                onPress: async () => {
                  setUploading(true);
                  await insertProduct(null);
                }
              }
            ]
          );
          return;
        }
      }

      await insertProduct(imageUrl);

    } catch (error: any) {
      console.error("=== Error in handleSubmit ===", error);
      Alert.alert("Erreur", "Une erreur s'est produite: " + (error.message || "Erreur inconnue"));
      setUploading(false);
    }
  };

  const insertProduct = async (imageUrl: string | null) => {
    try {
      console.log("Inserting product into database...");
      
      // Build product data - only include fields that exist
      const productData: any = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        listing_type: listingType,
        category_id: category_id,
        image_url: imageUrl,
      };

      // Only add optional fields if they have values
      if (subcategory_id) {
        productData.subcategory_id = subcategory_id;
      }
      
      if (sub_subcategory_id) {
        productData.sub_subcategory_id = sub_subcategory_id;
      }

      if (locationAddress.trim()) {
        productData.location_address = locationAddress.trim();
      }

      if (latitude && !isNaN(parseFloat(latitude))) {
        productData.latitude = parseFloat(latitude);
      }

      if (longitude && !isNaN(parseFloat(longitude))) {
        productData.longitude = parseFloat(longitude);
      }

      console.log("Product data to insert:", productData);

      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select();

      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }

      console.log("Product inserted successfully:", data);

      Alert.alert(
        "✅ Succès", 
        "Produit ajouté avec succès!",
        [
          {
            text: "OK",
            onPress: () => {
              // Reset form
              setName("");
              setDescription("");
              setPrice("");
              setListingType("sell");
              setLocationAddress("");
              setLatitude("");
              setLongitude("");
              setImage(null);
              if (categories.length > 0) {
                setCategoryId(categories[0].id);
              }
            }
          }
        ]
      );

    } catch (error: any) {
      console.error("=== Error in insertProduct ===", error);
      
      let errorMessage = "Impossible d'ajouter le produit";
      
      if (error.code === "23503") {
        errorMessage = "Référence de catégorie invalide. Veuillez réessayer.";
      } else if (error.code === "42501") {
        errorMessage = "Vous n'avez pas la permission d'ajouter des produits";
      } else if (error.code === "23505") {
        errorMessage = "Ce produit existe déjà";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Erreur", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des catégories...</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Aucune catégorie disponible. Veuillez ajouter des catégories d'abord.
        </Text>
        <Button title="Réessayer" onPress={fetchCategories} color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ajouter un Produit</Text>

      <TextInput
        placeholder="Nom du produit *"
        value={name}
        onChangeText={setName}
        style={styles.input}
        editable={!uploading}
      />

      <TextInput
        placeholder="Description (optionnel)"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.textArea]}
        multiline
        numberOfLines={4}
        editable={!uploading}
      />

      <TextInput
        placeholder="Prix (DZD) *"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        style={styles.input}
        editable={!uploading}
      />

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Type d'annonce *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={listingType}
            onValueChange={(value) => setListingType(value)}
            style={styles.picker}
            enabled={!uploading}
          >
            <Picker.Item label="🛒 Vendre" value="sell" />
            <Picker.Item label="🏠 Louer" value="rent" />
            <Picker.Item label="🔄 Échanger" value="exchange" />
          </Picker>
        </View>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Catégorie *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={category_id}
            onValueChange={(value) => {
              setCategoryId(value);
              // Reset subcategories when category changes
              setSubcategoryId(null);
              setSubSubcategoryId(null);
            }}
            style={styles.picker}
            enabled={!uploading}
          >
            {categories.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>
      </View>

      {subcategories.length > 0 && (
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Sous-catégorie</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={subcategory_id}
              onValueChange={(value) => {
                setSubcategoryId(value);
                // Reset sub-subcategories when subcategory changes
                setSubSubcategoryId(null);
              }}
              style={styles.picker}
              enabled={!uploading}
            >
              {subcategories.map((sub) => (
                <Picker.Item key={sub.id} label={sub.name} value={sub.id} />
              ))}
            </Picker>
          </View>
        </View>
      )}

      {subSubcategories.length > 0 && (
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Sous-sous-catégorie</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sub_subcategory_id}
              onValueChange={(value) => setSubSubcategoryId(value)}
              style={styles.picker}
              enabled={!uploading}
            >
              {subSubcategories.map((subsub) => (
                <Picker.Item key={subsub.id} label={subsub.name} value={subsub.id} />
              ))}
            </Picker>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>📍 Localisation (optionnel)</Text>

      <TextInput
        placeholder="Adresse"
        value={locationAddress}
        onChangeText={setLocationAddress}
        style={styles.input}
        editable={!uploading}
      />

      <View style={styles.coordinatesContainer}>
        <TextInput
          placeholder="Latitude"
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="decimal-pad"
          style={[styles.input, styles.coordinateInput]}
          editable={!uploading}
        />
        <TextInput
          placeholder="Longitude"
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="decimal-pad"
          style={[styles.input, styles.coordinateInput]}
          editable={!uploading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="📷 Choisir une image" 
          onPress={pickImage} 
          color="#007AFF" 
          disabled={uploading}
        />
      </View>

      {image && <Image source={{ uri: image }} style={styles.image} />}

      <View style={styles.buttonContainer}>
        <Button
          title={uploading ? "Téléchargement..." : "➕ Ajouter le produit"}
          onPress={handleSubmit}
          color="#34C759"
          disabled={uploading}
        />
      </View>

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.uploadingText}>Envoi en cours...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#000",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    padding: 12,
    marginBottom: 16,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#FFF",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#000",
    fontWeight: "600",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 10,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  coordinatesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  buttonContainer: {
    marginVertical: 8,
  },
  image: {
    width: "100%",
    height: 250,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
  },
  uploadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
});