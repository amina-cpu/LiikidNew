import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { supabase } from "../../lib/Supabase"; // Ensure path is correct

// --- Constants ---
const PRIMARY_TEAL = '#00C897';
const DARK_GRAY = '#333333';
const TEXT_LIGHT = '#8A8A8E';
const LIGHT_GRAY = '#F5F5F5';
const MODAL_HEIGHT = Dimensions.get('window').height * 0.6; // 60% of screen height for bottom sheet

// --- Modal Options ---
const SORT_OPTIONS = [
    'Best Match',
    'Most Recent',
    'Lowest Price',
    'Highest Price',
    'Nearest',
];

interface Category {
    id: number;
    name: string;
}

// --- Dynamic Modal Content Components ---

// Content for Sort By (uses radio buttons - matches filter1.PNG)
const SortByContent: React.FC<{ current: string }> = ({ current }) => {
    const router = useRouter();
    
    const handleSelect = (option: string) => {
        router.setParams({ sortBy: option });
        router.back();
    };

    return (
        <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Sort By</Text>
            {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                    key={option}
                    style={modalStyles.row}
                    onPress={() => handleSelect(option)}
                >
                    <Text style={modalStyles.rowText}>{option}</Text>
                    <Ionicons
                        name={current === option ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={current === option ? PRIMARY_TEAL : TEXT_LIGHT}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Content for Category (uses push arrows - matches filter3.PNG)
const CategoryContent: React.FC<{ current: string }> = ({ current }) => {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("categories")
                .select("id, name")
                .order("name");

            if (error) {
                console.error("Error fetching categories:", error);
                setLoading(false);
                return;
            }
            // Add 'All' as the first option
            setCategories([{ id: 0, name: 'All' }, ...(data || [])]);
            setLoading(false);
        };
        fetchCategories();
    }, []);

    const handleSelect = (name: string) => {
        // Here, we select the category and navigate back, setting the filter param
        router.setParams({ category: name });
        router.back();
    };

    if (loading) {
        return (
            <View style={modalStyles.centerContainer}>
                <ActivityIndicator size="large" color={PRIMARY_TEAL} />
            </View>
        );
    }
    
    return (
        <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Category</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
                {categories.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={modalStyles.row}
                        onPress={() => handleSelect(cat.name)}
                    >
                        <Text style={modalStyles.rowText}>{cat.name}</Text>
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

// --- Main Modal Screen ---

export default function ModalScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const modalName = params.modalName as string;
    const current = params.current as string;

    const renderContent = () => {
        switch (modalName) {
            case 'category':
                return <CategoryContent current={current} />;
            case 'sortBy':
                return <SortByContent current={current} />;
            default:
                return <Text>Invalid Modal</Text>;
        }
    };

    return (
        // The overlay and backdrop are what give it the bottom sheet look
        <View style={modalStyles.overlay}>
            <TouchableOpacity style={modalStyles.backdrop} onPress={() => router.back()} />
            <View style={modalStyles.modalView}>
                {/* Drag handle */}
                <View style={modalStyles.handle} />
                {renderContent()}
            </View>
        </View>
    );
}

// --- Modal Styles ---
const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Dim background
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    modalView: {
        width: '100%',
        height: MODAL_HEIGHT, // Fixed height for bottom sheet look
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
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
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_GRAY,
        textAlign: 'center',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: LIGHT_GRAY,
    },
    rowText: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '500',
    },
});