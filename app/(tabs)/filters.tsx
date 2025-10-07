import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../../lib/Supabase";

// --- Constants ---
const PRIMARY_TEAL = '#16A085';
const DARK_GRAY = '#333333';
const TEXT_LIGHT = '#8A8A8E';
const LIGHT_GRAY = '#F5F5F5';
const WHITE = '#FFFFFF';

// --- Options ---
const SORT_OPTIONS = ['Best Match', 'Most Recent', 'Lowest Price', 'Highest Price', 'Nearest'];
const DELIVERY_METHODS = ['All Methods', 'Pickup', 'Delivery', 'Shipping'];
const CONDITION_OPTIONS = ['All', 'New', 'Used'];

interface Category {
    id: number;
    name: string;
}

export default function FiltersScreen() {
    const router = useRouter();
    
    // Filter states
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSortBy, setSelectedSortBy] = useState('Best Match');
    const [selectedLocation, setSelectedLocation] = useState('Setif');
    const [selectedDelivery, setSelectedDelivery] = useState('All Methods');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [currency, setCurrency] = useState('DA');
    const [selectedCondition, setSelectedCondition] = useState('All');
    
    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'category' | 'sortBy' | 'location' | 'delivery' | null>(null);
    
    // Categories from database
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoadingCategories(true);
        const { data, error } = await supabase
            .from("categories")
            .select("id, name")
            .order("name");

        if (error) {
            console.error("Error fetching categories:", error);
        } else {
            setCategories([{ id: 0, name: 'All' }, ...(data || [])]);
        }
        setLoadingCategories(false);
    };

    const openModal = (type: 'category' | 'sortBy' | 'location' | 'delivery') => {
        setModalType(type);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setModalType(null);
    };

    const handleSelect = (value: string) => {
        switch (modalType) {
            case 'category':
                setSelectedCategory(value);
                break;
            case 'sortBy':
                setSelectedSortBy(value);
                break;
            case 'location':
                setSelectedLocation(value);
                break;
            case 'delivery':
                setSelectedDelivery(value);
                break;
        }
        closeModal();
    };

    const renderModalContent = () => {
        if (!modalType) return null;

        let title = '';
        let options: string[] = [];
        let currentValue = '';

        switch (modalType) {
            case 'category':
                title = 'Category';
                options = categories.map(cat => cat.name);
                currentValue = selectedCategory;
                break;
            case 'sortBy':
                title = 'Sort By';
                options = SORT_OPTIONS;
                currentValue = selectedSortBy;
                break;
            case 'location':
                title = 'Location';
                options = ['Setif', 'Algiers', 'Oran', 'Constantine', 'Annaba'];
                currentValue = selectedLocation;
                break;
            case 'delivery':
                title = 'Delivery Methods';
                options = DELIVERY_METHODS;
                currentValue = selectedDelivery;
                break;
        }

        if (loadingCategories && modalType === 'category') {
            return (
                <View style={modalStyles.contentContainer}>
                    <Text style={modalStyles.title}>{title}</Text>
                    <View style={modalStyles.loadingContainer}>
                        <ActivityIndicator size="large" color={PRIMARY_TEAL} />
                    </View>
                </View>
            );
        }

        return (
            <View style={modalStyles.contentContainer}>
                <Text style={modalStyles.title}>{title}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={modalStyles.row}
                            onPress={() => handleSelect(option)}
                        >
                            <Text style={modalStyles.rowText}>{option}</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={22}
                                color={TEXT_LIGHT}
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const handleReset = () => {
        setSelectedCategory('All');
        setSelectedSortBy('Best Match');
        setSelectedLocation('Setif');
        setSelectedDelivery('All Methods');
        setMinPrice('');
        setMaxPrice('');
        setSelectedCondition('All');
    };

    const handleSeeResults = () => {
        // Apply filters and navigate back or to results
        router.back();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={DARK_GRAY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Filters</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Main Filters Section */}
                <View style={styles.section}>
                    <FilterRow
                        label="Category"
                        value={selectedCategory}
                        onPress={() => openModal('category')}
                    />
                    <FilterRow
                        label="Sort By"
                        value={selectedSortBy}
                        onPress={() => openModal('sortBy')}
                    />
                    <FilterRow
                        label="Location"
                        value={selectedLocation}
                        onPress={() => openModal('location')}
                    />
                    <FilterRow
                        label="Delivery Methods"
                        value={selectedDelivery}
                        onPress={() => openModal('delivery')}
                    />
                </View>

                {/* Price Range Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Price Range</Text>
                    <View style={styles.priceContainer}>
                        <TextInput
                            style={styles.priceInput}
                            placeholder="Min"
                            placeholderTextColor={TEXT_LIGHT}
                            value={minPrice}
                            onChangeText={setMinPrice}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.priceInput}
                            placeholder="Max"
                            placeholderTextColor={TEXT_LIGHT}
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity style={styles.currencyButton}>
                            <Text style={styles.currencyText}>{currency}</Text>
                            <Ionicons name="chevron-down" size={16} color={DARK_GRAY} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Item Condition Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Item Condition</Text>
                    <View style={styles.conditionContainer}>
                        {CONDITION_OPTIONS.map((condition) => (
                            <TouchableOpacity
                                key={condition}
                                style={[
                                    styles.conditionButton,
                                    selectedCondition === condition && styles.conditionButtonActive
                                ]}
                                onPress={() => setSelectedCondition(condition)}
                            >
                                <Text style={[
                                    styles.conditionText,
                                    selectedCondition === condition && styles.conditionTextActive
                                ]}>
                                    {condition}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* See Results Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.resultsButton} onPress={handleSeeResults}>
                    <Text style={styles.resultsButtonText}>See Results</Text>
                </TouchableOpacity>
            </View>

            {/* Modal with Blur Overlay */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={modalStyles.overlay}>
                    {/* Blurred Background */}
                    <BlurView intensity={20} tint="dark" style={modalStyles.blurView}>
                        <TouchableOpacity
                            style={modalStyles.backdrop}
                            activeOpacity={1}
                            onPress={closeModal}
                        />
                    </BlurView>

                    {/* Modal Content */}
                    <View style={modalStyles.modalContainer}>
                        <View style={modalStyles.handle} />
                        {renderModalContent()}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Filter Row Component
const FilterRow: React.FC<{ label: string; value: string; onPress: () => void }> = ({
    label,
    value,
    onPress,
}) => (
    <TouchableOpacity style={styles.filterRow} onPress={onPress}>
        <Text style={styles.filterLabel}>{label}</Text>
        <View style={styles.filterValueContainer}>
            <Text style={styles.filterValue}>{value}</Text>
            <Ionicons name="chevron-forward" size={20} color={TEXT_LIGHT} />
        </View>
    </TouchableOpacity>
);

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LIGHT_GRAY,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: WHITE,
        borderBottomWidth: 1,
        borderBottomColor: LIGHT_GRAY,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_GRAY,
    },
    resetText: {
        fontSize: 16,
        color: PRIMARY_TEAL,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: WHITE,
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: DARK_GRAY,
        marginBottom: 12,
        marginTop: 8,
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: LIGHT_GRAY,
    },
    filterLabel: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '500',
    },
    filterValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterValue: {
        fontSize: 16,
        color: TEXT_LIGHT,
    },
    priceContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    priceInput: {
        flex: 1,
        backgroundColor: LIGHT_GRAY,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: DARK_GRAY,
    },
    currencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: LIGHT_GRAY,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 4,
    },
    currencyText: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '600',
    },
    conditionContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    conditionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: LIGHT_GRAY,
        alignItems: 'center',
    },
    conditionButtonActive: {
        backgroundColor: PRIMARY_TEAL,
    },
    conditionText: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '600',
    },
    conditionTextActive: {
        color: WHITE,
    },
    footer: {
        padding: 16,
        backgroundColor: WHITE,
        borderTopWidth: 1,
        borderTopColor: LIGHT_GRAY,
    },
    resultsButton: {
        backgroundColor: PRIMARY_TEAL,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    resultsButtonText: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '700',
    },
});

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    blurView: {
        ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContainer: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
        paddingBottom: 20,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: LIGHT_GRAY,
        borderRadius: 5,
        alignSelf: 'center',
        marginVertical: 10,
    },
    contentContainer: {
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_GRAY,
        textAlign: 'center',
        marginBottom: 16,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: LIGHT_GRAY,
    },
    rowText: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '500',
    },
});