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

// --- Options ---
const getSortOptions = () => [
    i18n.t('filterss.bestMatch'),
    i18n.t('filterss.mostRecent'),
    i18n.t('filterss.lowestPrice'),
    i18n.t('filterss.highestPrice'),
    i18n.t('filterss.nearest')
];

const getDeliveryMethods = () => [
    { label: i18n.t('filterss.allMethods'), icon: 'apps-outline' },
    { label: i18n.t('filterss.pickup'), icon: 'walk-outline' },
    { label: i18n.t('filterss.delivery'), icon: 'bicycle-outline' },
    { label: i18n.t('filterss.shipping'), icon: 'airplane-outline' }
];

const getConditionOptions = () => [
    i18n.t('filterss.all'),
    i18n.t('filterss.new'),
    i18n.t('filterss.used')
];

const getLocations = () => [
    i18n.t('filterss.allLocations'),
    'Setif',
    'Blida',
    'Algiers',
    'Oran',
    'Constantine',
    'Annaba'
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
    
    const [selectedCategory, setSelectedCategory] = useState(params.category as string || i18n.t('filterss.all'));
    const [selectedSortBy, setSelectedSortBy] = useState(params.sortBy as string || i18n.t('filterss.bestMatch'));
    const [selectedLocation, setSelectedLocation] = useState(params.location as string || i18n.t('filterss.allLocations'));
    const [selectedDelivery, setSelectedDelivery] = useState(params.delivery as string || i18n.t('filterss.allMethods'));
    const [minPrice, setMinPrice] = useState(params.minPrice as string || '');
    const [maxPrice, setMaxPrice] = useState(params.maxPrice as string || '');
    const [priceUnit, setPriceUnit] = useState(getPriceUnits()[0]);
    const [selectedCondition, setSelectedCondition] = useState(params.condition as string || i18n.t('filterss.all'));
    
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

    const handlePriceUnitSelect = (unit: ReturnType<typeof getPriceUnits>[0]) => {
        setPriceUnit(unit);
        closeModal();
    };

    const renderModalContent = () => {
        if (!modalType) return null;

        let title = '';
        let options: string[] = [];
        let currentValue = '';

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
                                key={method.label}
                                style={modalStyles.row}
                                onPress={() => handleSelect(method.label)}
                            >
                                <View style={modalStyles.deliveryOption}>
                                    <View style={modalStyles.deliveryIconContainer}>
                                        <Ionicons 
                                            name={method.icon as any} 
                                            size={24} 
                                            color={selectedDelivery === method.label ? PRIMARY_TEAL : DARK_GRAY} 
                                        />
                                    </View>
                                    <Text style={modalStyles.rowText}>{method.label}</Text>
                                </View>
                                {selectedDelivery === method.label && (
                                    <Ionicons name="checkmark" size={22} color={PRIMARY_TEAL} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            );
        }

        switch (modalType) {
            case 'category':
                title = i18n.t('filterss.category');
                options = categories.map(cat => cat.name);
                currentValue = selectedCategory;
                break;
            case 'sortBy':
                title = i18n.t('filterss.sortBy');
                options = getSortOptions();
                currentValue = selectedSortBy;
                break;
            case 'location':
                title = i18n.t('filterss.location');
                options = getLocations();
                currentValue = selectedLocation;
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
                            {currentValue === option && (
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
        setSelectedSortBy(i18n.t('filterss.bestMatch'));
        setSelectedLocation(i18n.t('filterss.allLocations'));
        setSelectedDelivery(i18n.t('filterss.allMethods'));
        setMinPrice('');
        setMaxPrice('');
        setPriceUnit(getPriceUnits()[0]);
        setSelectedCondition(i18n.t('filterss.all'));
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

        if (selectedSortBy !== i18n.t('filterss.bestMatch')) {
            filterParams.sortBy = selectedSortBy;
        }
        
        if (selectedLocation !== i18n.t('filterss.allLocations')) {
            filterParams.location = selectedLocation;
        }
        
        if (selectedDelivery !== i18n.t('filterss.allMethods')) {
            filterParams.delivery = selectedDelivery;
        }
        
        if (selectedCondition !== i18n.t('filterss.all')) {
            filterParams.condition = selectedCondition;
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
        const method = DELIVERY_METHODS.find(m => m.label === selectedDelivery);
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
                        value={selectedSortBy}
                        onPress={() => openModal('sortBy')}
                    />
                    <FilterRow
                        label={i18n.t('filterss.location')}
                        value={selectedLocation}
                        onPress={() => openModal('location')}
                    />
                    <FilterRowWithIcon
                        label={i18n.t('filterss.deliveryMethods')}
                        value={selectedDelivery}
                        icon={getDeliveryIcon()}
                        onPress={() => openModal('delivery')}
                    />
                </View>

                {/* Price Range Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('filterss.priceRange')}</Text>
                    <View style={styles.priceContainer}>
                        <TextInput
                            style={styles.priceInput}
                            placeholder={i18n.t('filterss.min')}
                            placeholderTextColor={TEXT_LIGHT}
                            value={minPrice}
                            onChangeText={setMinPrice}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.priceInput}
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
                            💡 {priceUnit.value === 1000 ? '1 = 1,000 DA' : '1 = 1,000,000 DA'}
                        </Text>
                    )}
                </View>

                {/* Item Condition Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('filterss.itemCondition')}</Text>
                    <View style={styles.conditionContainer}>
                        {getConditionOptions().map((condition) => (
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
        marginBottom:90
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
        height: 300,
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
        height: 40,
        borderRadius: 20,
        backgroundColor: LIGHT_GRAY,
        justifyContent: 'center',
        alignItems: 'center',
    },
});