import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { supabase } from "../../lib/Supabase";
import i18n from '../../lib/i18n';

// --- Constants ---
const PRIMARY_TEAL = '#16A085';
const DARK_GRAY = '#333333';
const TEXT_LIGHT = '#8A8A8E';
const LIGHT_GRAY = '#F5F5F5';
const WHITE = '#FFFFFF';

// --- Filter Keys (language-independent) ---
const SORT_KEYS = {
    BEST_MATCH: 'bestMatch',
    MOST_RECENT: 'mostRecent',
    LOWEST_PRICE: 'lowestPrice',
    HIGHEST_PRICE: 'highestPrice',
    NEAREST: 'nearest'
};

const DELIVERY_KEYS = {
    ALL: 'allMethods',
    PICKUP: 'pickup',
    DELIVERY: 'delivery',
    SHIPPING: 'shipping'
};

const CONDITION_KEYS = {
    ALL: 'all',
    NEW: 'new',
    USED: 'used'
};

const LOCATION_KEYS = {
    ALL: 'allLocations',
    SETIF: 'Setif',
    BLIDA: 'Blida',
    ALGIERS: 'Algiers',
    ORAN: 'Oran',
    CONSTANTINE: 'Constantine',
    ANNABA: 'Annaba'
};

// --- Options with Keys ---
const getSortOptions = () => [
    { key: SORT_KEYS.BEST_MATCH, label: i18n.t('filterss.bestMatch') },
    { key: SORT_KEYS.MOST_RECENT, label: i18n.t('filterss.mostRecent') },
    { key: SORT_KEYS.LOWEST_PRICE, label: i18n.t('filterss.lowestPrice') },
    { key: SORT_KEYS.HIGHEST_PRICE, label: i18n.t('filterss.highestPrice') },
    { key: SORT_KEYS.NEAREST, label: i18n.t('filterss.nearest') }
];

const getDeliveryMethods = () => [
    { key: DELIVERY_KEYS.ALL, label: i18n.t('filterss.allMethods'), icon: 'apps-outline' },
    { key: DELIVERY_KEYS.PICKUP, label: i18n.t('filterss.pickup'), icon: 'walk-outline' },
    { key: DELIVERY_KEYS.DELIVERY, label: i18n.t('filterss.delivery'), icon: 'bicycle-outline' },
    { key: DELIVERY_KEYS.SHIPPING, label: i18n.t('filterss.shipping'), icon: 'airplane-outline' }
];

const getConditionOptions = () => [
    { key: CONDITION_KEYS.ALL, label: i18n.t('filterss.all') },
    { key: CONDITION_KEYS.NEW, label: i18n.t('filterss.new') },
    { key: CONDITION_KEYS.USED, label: i18n.t('filterss.used') }
];

const getLocations = () => [
    { key: LOCATION_KEYS.ALL, label: i18n.t('filterss.allLocations') },
    { key: LOCATION_KEYS.SETIF, label: 'Setif' },
    { key: LOCATION_KEYS.BLIDA, label: 'Blida' },
    { key: LOCATION_KEYS.ALGIERS, label: 'Algiers' },
    { key: LOCATION_KEYS.ORAN, label: 'Oran' },
    { key: LOCATION_KEYS.CONSTANTINE, label: 'Constantine' },
    { key: LOCATION_KEYS.ANNABA, label: 'Annaba' }
];

const getPriceUnits = () => [
    { label: i18n.t('filterss.da'), value: 1, display: 'DA' },
    { label: i18n.t('filterss.thousands'), value: 1000, display: 'K DA' },
    { label: i18n.t('filterss.millions'), value: 10000, display: 'M DA' }
];

interface Category {
    id: number;
    name: string;
}

export default function FiltersScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    const categoryId = params.categoryId ? Number(params.categoryId) : null;
    const listingType = params.listingType as string || null;
    const searchMode = params.searchMode === 'true';
    const searchQuery = params.searchQuery as string || '';
    
    // Store keys instead of translated labels
    const [selectedCategory, setSelectedCategory] = useState(params.category as string || i18n.t('filterss.all'));
    const [selectedSortByKey, setSelectedSortByKey] = useState((params.sortBy as string) || SORT_KEYS.BEST_MATCH);
    const [selectedLocationKey, setSelectedLocationKey] = useState((params.location as string) || LOCATION_KEYS.ALL);
    const [selectedDeliveryKey, setSelectedDeliveryKey] = useState((params.delivery as string) || DELIVERY_KEYS.ALL);
    const [minPrice, setMinPrice] = useState(params.minPrice as string || '');
    const [maxPrice, setMaxPrice] = useState(params.maxPrice as string || '');
    const [priceUnit, setPriceUnit] = useState(getPriceUnits()[0]);
    const [selectedConditionKey, setSelectedConditionKey] = useState((params.condition as string) || CONDITION_KEYS.ALL);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'category' | 'sortBy' | 'location' | 'delivery' | 'priceUnit' | null>(null);
    
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
            setCategories([{ id: 0, name: i18n.t('filterss.all') }, ...(data || [])]);
        }
        setLoadingCategories(false);
    };

    const openModal = (type: 'category' | 'sortBy' | 'location' | 'delivery' | 'priceUnit') => {
        setModalType(type);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setModalType(null);
    };

    const handleSelect = (key: string) => {
        switch (modalType) {
            case 'category':
                setSelectedCategory(key);
                break;
            case 'sortBy':
                setSelectedSortByKey(key);
                break;
            case 'location':
                setSelectedLocationKey(key);
                break;
            case 'delivery':
                setSelectedDeliveryKey(key);
                break;
        }
        closeModal();
    };

    const handlePriceUnitSelect = (unit: ReturnType<typeof getPriceUnits>[0]) => {
        setPriceUnit(unit);
        closeModal();
    };

    // Helper functions to get current labels
    const getCurrentSortLabel = () => {
        const option = getSortOptions().find(opt => opt.key === selectedSortByKey);
        return option ? option.label : i18n.t('filterss.bestMatch');
    };

    const getCurrentLocationLabel = () => {
        const option = getLocations().find(opt => opt.key === selectedLocationKey);
        return option ? option.label : i18n.t('filterss.allLocations');
    };

    const getCurrentDeliveryLabel = () => {
        const option = getDeliveryMethods().find(opt => opt.key === selectedDeliveryKey);
        return option ? option.label : i18n.t('filterss.allMethods');
    };

    const getCurrentConditionLabel = () => {
        const option = getConditionOptions().find(opt => opt.key === selectedConditionKey);
        return option ? option.label : i18n.t('filterss.all');
    };

    const renderModalContent = () => {
        if (!modalType) return null;

        if (modalType === 'priceUnit') {
            const PRICE_UNITS = getPriceUnits();
            return (
                <View style={modalStyles.contentContainer}>
                    <Text style={modalStyles.title}>{i18n.t('filterss.priceUnit')}</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {PRICE_UNITS.map((unit) => (
                            <TouchableOpacity
                                key={unit.label}
                                style={modalStyles.row}
                                onPress={() => handlePriceUnitSelect(unit)}
                            >
                                <View>
                                    <Text style={modalStyles.rowText}>{unit.label}</Text>
                                    <Text style={modalStyles.rowSubtext}>
                                        {unit.value === 1 ? i18n.t('filterss.standardPricing') : 
                                         unit.value === 1000 ? '1K = 1000 DA' : 
                                         '1M = 10000 DA'}
                                    </Text>
                                </View>
                                {priceUnit.label === unit.label && (
                                    <Ionicons name="checkmark" size={22} color={PRIMARY_TEAL} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            );
        }

        if (modalType === 'delivery') {
            const DELIVERY_METHODS = getDeliveryMethods();
            return (
                <View style={modalStyles.contentContainer}>
                    <Text style={modalStyles.title}>{i18n.t('filterss.deliveryMethods')}</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {DELIVERY_METHODS.map((method) => (
                            <TouchableOpacity
                                key={method.key}
                                style={modalStyles.row}
                                onPress={() => handleSelect(method.key)}
                            >
                                <View style={modalStyles.deliveryOption}>
                                    <View style={modalStyles.deliveryIconContainer}>
                                        <Ionicons 
                                            name={method.icon as any} 
                                            size={24} 
                                            color={selectedDeliveryKey === method.key ? PRIMARY_TEAL : DARK_GRAY} 
                                        />
                                    </View>
                                    <Text style={modalStyles.rowText}>{method.label}</Text>
                                </View>
                                {selectedDeliveryKey === method.key && (
                                    <Ionicons name="checkmark" size={22} color={PRIMARY_TEAL} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            );
        }

        let title = '';
        let options: { key: string; label: string }[] = [];
        let currentKey = '';

        switch (modalType) {
            case 'category':
                title = i18n.t('filterss.category');
                options = categories.map(cat => ({ key: cat.name, label: cat.name }));
                currentKey = selectedCategory;
                break;
            case 'sortBy':
                title = i18n.t('filterss.sortBy');
                options = getSortOptions();
                currentKey = selectedSortByKey;
                break;
            case 'location':
                title = i18n.t('filterss.location');
                options = getLocations();
                currentKey = selectedLocationKey;
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
                            key={option.key}
                            style={modalStyles.row}
                            onPress={() => handleSelect(option.key)}
                        >
                            <Text style={modalStyles.rowText}>{option.label}</Text>
                            {currentKey === option.key && (
                                <Ionicons name="checkmark" size={22} color={PRIMARY_TEAL} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const handleReset = () => {
        setSelectedCategory(i18n.t('filterss.all'));
        setSelectedSortByKey(SORT_KEYS.BEST_MATCH);
        setSelectedLocationKey(LOCATION_KEYS.ALL);
        setSelectedDeliveryKey(DELIVERY_KEYS.ALL);
        setMinPrice('');
        setMaxPrice('');
        setPriceUnit(getPriceUnits()[0]);
        setSelectedConditionKey(CONDITION_KEYS.ALL);
    };

    const handleBack = () => {
        router.back();
    };

    const handleSeeResults = () => {
        const filterParams: any = {
            filtersApplied: "true",
        };

        if (categoryId) {
            filterParams.id = categoryId;
        }

        if (searchMode) {
            filterParams.searchMode = 'true';
        }
        if (searchQuery.trim()) {
            filterParams.searchQuery = searchQuery;
        }

        if (listingType && listingType !== "All") {
            filterParams.listingType = listingType;
        }

        if (selectedSortByKey !== SORT_KEYS.BEST_MATCH) {
            filterParams.sortBy = selectedSortByKey;
        }
        
        if (selectedLocationKey !== LOCATION_KEYS.ALL) {
            filterParams.location = selectedLocationKey;
        }
        
        if (selectedDeliveryKey !== DELIVERY_KEYS.ALL) {
            filterParams.delivery = selectedDeliveryKey;
        }
        
        if (selectedConditionKey !== CONDITION_KEYS.ALL) {
            filterParams.condition = selectedConditionKey;
        }
        
        if (minPrice) {
            const actualMinPrice = parseFloat(minPrice) * priceUnit.value;
            filterParams.minPrice = actualMinPrice;
        }
        
        if (maxPrice) {
            const actualMaxPrice = parseFloat(maxPrice) * priceUnit.value;
            filterParams.maxPrice = actualMaxPrice;
        }
        
        if (selectedCategory && selectedCategory !== i18n.t('filterss.all')) {
            filterParams.category = selectedCategory;
        }

        const queryString = Object.entries(filterParams)
            .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
            .join("&");

        router.push(`/category?${queryString}`);
    };

    const getDeliveryIcon = () => {
        const DELIVERY_METHODS = getDeliveryMethods();
        const method = DELIVERY_METHODS.find(m => m.key === selectedDeliveryKey);
        return method ? method.icon : 'apps-outline';
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color={DARK_GRAY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{i18n.t('filterss.title')}</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetText}>{i18n.t('filterss.reset')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Search Info Banner */}
                {searchQuery.trim() && (
                    <View style={styles.searchInfoBanner}>
                        <Ionicons name="search" size={18} color={PRIMARY_TEAL} />
                        <Text style={styles.searchInfoText}>
                            {i18n.t('filters.filteringResults')}: <Text style={styles.searchQueryText}>"{searchQuery}"</Text>
                        </Text>
                    </View>
                )}

                {/* Main Filters Section */}
                <View style={styles.section}>
                    <FilterRow
                        label={i18n.t('filterss.sortBy')}
                        value={getCurrentSortLabel()}
                        onPress={() => openModal('sortBy')}
                    />
                    <FilterRow
                        label={i18n.t('filterss.location')}
                        value={getCurrentLocationLabel()}
                        onPress={() => openModal('location')}
                    />
                    <FilterRowWithIcon
                        label={i18n.t('filterss.deliveryMethods')}
                        value={getCurrentDeliveryLabel()}
                        icon={getDeliveryIcon()}
                        onPress={() => openModal('delivery')}
                    />
                </View>

                {/* Price Range Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('filterss.priceRange')}</Text>
                    <View style={styles.priceContainer}>
                        <TextInput
                            style={[
                                styles.priceInput,
                                minPrice && styles.priceInputFilled
                            ]}
                            placeholder={i18n.t('filterss.min')}
                            placeholderTextColor={TEXT_LIGHT}
                            value={minPrice}
                            onChangeText={setMinPrice}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={[
                                styles.priceInput,
                                maxPrice && styles.priceInputFilled
                            ]}
                            placeholder={i18n.t('filterss.max')}
                            placeholderTextColor={TEXT_LIGHT}
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity 
                            style={styles.currencyButton}
                            onPress={() => openModal('priceUnit')}
                        >
                            <Text style={styles.currencyText}>{priceUnit.display}</Text>
                            <Ionicons name="chevron-down" size={16} color={DARK_GRAY} />
                        </TouchableOpacity>
                    </View>
                    {priceUnit.value > 1 && (
                        <Text style={styles.priceHint}>
                            💡 {priceUnit.value === 1000 ? '1 = 1,000 DA' : '1 = 10,000 DA'}
                        </Text>
                    )}
                </View>

                {/* Item Condition Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('filterss.itemCondition')}</Text>
                    <View style={styles.conditionContainer}>
                        {getConditionOptions().map((condition) => (
                            <TouchableOpacity
                                key={condition.key}
                                style={[
                                    styles.conditionButton,
                                    selectedConditionKey === condition.key && styles.conditionButtonActive
                                ]}
                                onPress={() => setSelectedConditionKey(condition.key)}
                            >
                                <Text style={[
                                    styles.conditionText,
                                    selectedConditionKey === condition.key && styles.conditionTextActive
                                ]}>
                                    {condition.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* See Results Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.resultsButton} onPress={handleSeeResults}>
                    <Text style={styles.resultsButtonText}>{i18n.t('filterss.seeResults')}</Text>
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
                    <BlurView intensity={20} tint="dark" style={modalStyles.blurView}>
                        <TouchableOpacity
                            style={modalStyles.backdrop}
                            activeOpacity={1}
                            onPress={closeModal}
                        />
                    </BlurView>
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

// Filter Row with Icon Component
const FilterRowWithIcon: React.FC<{ 
    label: string; 
    value: string; 
    icon: string;
    onPress: () => void 
}> = ({ label, value, icon, onPress }) => (
    <TouchableOpacity style={styles.filterRow} onPress={onPress}>
        <Text style={styles.filterLabel}>{label}</Text>
        <View style={styles.filterValueContainer}>
            <Ionicons name={icon as any} size={20} color={PRIMARY_TEAL} style={styles.valueIcon} />
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
        marginBottom:100
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
    searchInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5F3',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    searchInfoText: {
        fontSize: 14,
        color: DARK_GRAY,
        flex: 1,
    },
    searchQueryText: {
        fontWeight: '700',
        color: PRIMARY_TEAL,
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
    valueIcon: {
        marginRight: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    priceInput: {
        flex: 1,
        backgroundColor: LIGHT_GRAY,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: DARK_GRAY,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    priceInputFilled: {
        borderColor: PRIMARY_TEAL,
        backgroundColor: WHITE,
        elevation: 2,
        shadowColor: PRIMARY_TEAL,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    currencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: LIGHT_GRAY,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 4,
        minWidth: 80,
    },
    currencyText: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '600',
    },
    priceHint: {
        fontSize: 13,
        color: PRIMARY_TEAL,
        marginBottom: 16,
        fontWeight: '500',
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
        height: 400,
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
    rowSubtext: {
        fontSize: 13,
        color: TEXT_LIGHT,
        marginTop: 4,
    },
    deliveryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deliveryIconContainer: {
        width: 40,
        height: 30,
        borderRadius: 20,
        backgroundColor: LIGHT_GRAY,
        justifyContent: 'center',
        alignItems: 'center',
    },
});